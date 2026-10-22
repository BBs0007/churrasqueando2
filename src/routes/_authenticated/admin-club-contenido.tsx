import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronDown,
  Eye,
  Image as ImageIcon,
  Loader2,
  MoveDown,
  MoveUp,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { getMyClub } from "@/lib/club.functions";
import {
  adminCreateClubVideoUploadUrl,
  adminSaveClubContent,
  adminUploadClubImage,
  getClubContent,
} from "@/lib/club-content.functions";
import {
  CLUB_LANDING_COLLECTION_DEFAULTS,
  CLUB_LANDING_DEFAULTS,
  CLUB_LANDING_SECTIONS,
  getClubBuilderLayout,
  type ClubLandingCollection,
  type ClubLandingField,
} from "@/lib/club-landing-content";
import { ClubLandingBuilderEditor } from "@/components/ClubLandingBuilder";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import clubHero from "@/assets/club/club-hero.jpg";
import clubVideo from "@/assets/club/club-video-thumb.jpg";
import logo from "@/assets/logo-churrasqueando.png";

export const Route = createFileRoute("/_authenticated/admin-club-contenido")({
  head: () => ({
    meta: [
      { title: "Editor de la página del Club · Admin · Churrasqueando" },
      {
        name: "description",
        content: "Edita por secciones los textos, imágenes y listas de la página pública del Club.",
      },
    ],
  }),
  component: AdminClubContenido,
});

const DEFAULT_IMAGES: Record<string, string> = {
  hero_image: clubHero,
  video_image: clubVideo,
  footer_logo: logo,
};

type CollectionItem = Record<string, unknown>;

function parseCollection(value: string): CollectionItem[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error("La lista guardada tiene un formato inválido");
  return parsed.filter((item): item is CollectionItem => typeof item === "object" && item !== null);
}

function createCollectionItem(key: string, fields: ClubLandingCollection["fields"], index: number) {
  const item: CollectionItem = { id: `${key}-${Date.now()}-${index}` };
  if (key === "benefits") item.icon = "lock";
  if (key === "founder_perks") item.icon = "star";
  for (const field of fields) item[field.key] = "";
  return item;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("No se pudo leer la imagen"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

async function uploadClubVideo(
  file: File,
  createUploadUrl: (options: { data: { contentType: string } }) => Promise<{
    path: string;
    token: string;
    publicUrl: string;
    contentType: string;
  }>,
) {
  if (!["video/mp4", "video/webm", "video/ogg"].includes(file.type)) {
    throw new Error("Usa un video MP4, WebM u OGG");
  }
  if (file.size > 100 * 1024 * 1024) throw new Error("El video no debe superar 100 MB");

  const { path, token, publicUrl, contentType } = await createUploadUrl({
    data: { contentType: file.type },
  });
  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase.storage
    .from("club-content")
    .uploadToSignedUrl(path, token, file, { contentType });
  if (error) throw error;

  return publicUrl;
}

function AdminClubContenido() {
  const fetchClub = useServerFn(getMyClub);
  const fetchContent = useServerFn(getClubContent);
  const save = useServerFn(adminSaveClubContent);
  const uploadImage = useServerFn(adminUploadClubImage);
  const createVideoUploadUrl = useServerFn(adminCreateClubVideoUploadUrl);
  const queryClient = useQueryClient();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const content = useQuery({
    queryKey: ["club-content"],
    queryFn: () => fetchContent(),
    enabled: !!me.data?.isAdmin,
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const builderLayout = getClubBuilderLayout(form.club_builder);

  useEffect(() => {
    if (content.data) setForm({ ...CLUB_LANDING_DEFAULTS, ...content.data });
  }, [content.data]);

  const saveMutation = useMutation({
    mutationFn: (entries: Record<string, string>) => save({ data: { entries } }),
    onSuccess: async () => {
      toast.success("Página del Club actualizada");
      await queryClient.invalidateQueries({ queryKey: ["club-content"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo guardar"),
  });

  const handleImageChange = async (key: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Usa una imagen PNG, JPG o WebP");
      event.target.value = "";
      return;
    }
    if (file.size > 6_000_000) {
      toast.error("La imagen no debe superar 6 MB");
      event.target.value = "";
      return;
    }
    setUploadingKey(key);
    try {
      const dataUrl = await fileToDataUrl(file);
      const result = await uploadImage({ data: { fileName: file.name, dataUrl } });
      setForm((current) => ({ ...current, [key]: result.url }));
      toast.success("Imagen subida. Guarda los cambios para publicarla.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir la imagen");
    } finally {
      setUploadingKey(null);
      const input = fileInputs.current[key];
      if (input) input.value = "";
    }
  };

  const uploadBuilderImage = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("Usa una imagen PNG, JPG o WebP");
    }
    if (file.size > 6_000_000) throw new Error("La imagen no debe superar 6 MB");
    setUploadingKey("builder");
    try {
      const dataUrl = await fileToDataUrl(file);
      const result = await uploadImage({ data: { fileName: file.name, dataUrl } });
      return result.url;
    } finally {
      setUploadingKey(null);
    }
  };

  const uploadBuilderMedia = async (file: File, type: "image" | "video") => {
    if (type === "video") {
      setUploadingKey("builder");
      try {
        return await uploadClubVideo(file, createVideoUploadUrl);
      } finally {
        setUploadingKey(null);
      }
    }
    return uploadBuilderImage(file);
  };

  const handleVideoChange = async (key: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setUploadingKey(key);
    try {
      const url = await uploadClubVideo(file, createVideoUploadUrl);
      setForm((current) => ({ ...current, [key]: url }));
      toast.success("Video subido. Guarda los cambios para publicarlo.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir el video");
    } finally {
      setUploadingKey(null);
      input.value = "";
    }
  };

  const resetSection = (sectionId: string) => {
    const section = CLUB_LANDING_SECTIONS.find((item) => item.id === sectionId);
    if (!section) return;
    const keys = [
      ...section.fields.map((field) => field.key),
      ...(section.collections ?? []).map((collection) => collection.key),
    ];
    setForm((current) => {
      const next = { ...current };
      for (const key of keys) next[key] = CLUB_LANDING_DEFAULTS[key];
      return next;
    });
  };

  if (me.isLoading) {
    return (
      <ClubShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </ClubShell>
    );
  }

  if (me.isError || !me.data) {
    return (
      <ClubShell>
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo validar el acceso. Recarga la página o vuelve a iniciar sesión.
        </p>
      </ClubShell>
    );
  }

  if (!me.data.isAdmin) {
    return (
      <ClubShell points={me.data.profile.points} isMember={me.data.isMember}>
        <h1 className="font-display text-2xl uppercase tracking-wide text-foreground">
          Acceso restringido
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección es solo para el equipo de Churrasqueando.
        </p>
      </ClubShell>
    );
  }

  return (
    <ClubShell points={me.data.profile.points} isMember={me.data.isMember} isAdmin>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">
            Editor de la página del Club
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Abre una sección, cambia sus textos o imágenes y guarda. Usa “Restaurar originales” en
            una sección para recuperar su contenido inicial.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="font-cond uppercase tracking-wide">
          <a href="/club" target="_blank" rel="noreferrer">
            <Eye className="h-3.5 w-3.5" /> Vista pública
          </a>
        </Button>
      </div>

      {content.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : content.isError ? (
        <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo cargar el contenido de la página.
        </p>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (uploadingKey) {
              toast.error("Espera a que termine la carga de la imagen");
              return;
            }
            saveMutation.mutate(form);
          }}
        >
          <div className="space-y-3">
            <ClubLandingBuilderEditor
              layout={builderLayout}
              onMediaUpload={uploadBuilderMedia}
              onChange={(layout) =>
                setForm((current) => ({ ...current, club_builder: JSON.stringify(layout) }))
              }
            />
            {CLUB_LANDING_SECTIONS.map((section) => (
              <details key={section.id} className="group rounded-2xl border border-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
                  <div>
                    <h2 className="font-display text-xl uppercase tracking-wide text-foreground">
                      {section.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                  </div>
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-6 border-t border-border px-4 py-5 sm:px-5">
                  {section.fields.map((field) => (
                    <LandingField
                      key={field.key}
                      field={field}
                      value={form[field.key] ?? CLUB_LANDING_DEFAULTS[field.key] ?? ""}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, [field.key]: value }))
                      }
                      imageFallback={DEFAULT_IMAGES[field.key]}
                      inputRef={(element) => {
                        fileInputs.current[field.key] = element;
                      }}
                      uploading={uploadingKey === field.key}
                      onImageChange={(event) => void handleImageChange(field.key, event)}
                      onVideoChange={(event) => void handleVideoChange(field.key, event)}
                      onRestore={() =>
                        setForm((current) => ({
                          ...current,
                          [field.key]: CLUB_LANDING_DEFAULTS[field.key],
                        }))
                      }
                    />
                  ))}
                  {(section.collections ?? []).map((collection) => (
                    <LandingCollectionEditor
                      key={collection.key}
                      collection={collection}
                      value={
                        form[collection.key] ??
                        CLUB_LANDING_DEFAULTS[collection.key] ??
                        JSON.stringify(CLUB_LANDING_COLLECTION_DEFAULTS[collection.key] ?? [])
                      }
                      onChange={(value) =>
                        setForm((current) => ({ ...current, [collection.key]: value }))
                      }
                    />
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => resetSection(section.id)}
                    className="font-cond uppercase tracking-wide"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Restaurar originales de esta sección
                  </Button>
                </div>
              </details>
            ))}
          </div>

          <div className="sticky bottom-3 z-10 flex justify-end rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
            <Button
              type="submit"
              disabled={saveMutation.isPending || !!uploadingKey}
              className="font-cond uppercase tracking-wide"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar todos los cambios
            </Button>
          </div>
        </form>
      )}
    </ClubShell>
  );
}

function LandingField({
  field,
  value,
  onChange,
  imageFallback,
  inputRef,
  uploading,
  onImageChange,
  onVideoChange,
  onRestore,
}: {
  field: ClubLandingField;
  value: string;
  onChange: (value: string) => void;
  imageFallback?: string;
  inputRef: (element: HTMLInputElement | null) => void;
  uploading: boolean;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVideoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRestore: () => void;
}) {
  const id = `club-content-${field.key}`;

  if (field.type === "image") {
    return (
      <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center">
        <div className="aspect-video overflow-hidden rounded-xl border border-border bg-secondary">
          <img
            src={value.trim() || imageFallback}
            alt={`Vista previa: ${field.label}`}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id}>{field.label}</Label>
          <p className="text-xs text-muted-foreground">
            Sube PNG, JPG o WebP de hasta 6 MB. Recomendado: imagen horizontal de al menos 1200 px.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              id={id}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onImageChange}
              className="sr-only"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => document.getElementById(id)?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Subir imagen
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={onRestore}>
                <RotateCcw className="h-4 w-4" /> Usar imagen original
              </Button>
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            La nueva imagen se publica al guardar todos los cambios.
          </p>
        </div>
      </div>
    );
  }

  if (field.type === "video") {
    return (
      <div className="space-y-3">
        <Label htmlFor={id}>{field.label}</Label>
        <Input
          id={id}
          value={value}
          placeholder="Pega una URL HTTPS o sube un archivo"
          onChange={(event) => onChange(event.target.value)}
        />
        {value && (
          <video
            src={value}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full max-w-2xl rounded-xl bg-black"
          />
        )}
        {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
        <input
          ref={inputRef}
          id={`${id}-upload`}
          type="file"
          accept="video/mp4,video/webm,video/ogg"
          onChange={onVideoChange}
          className="sr-only"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => document.getElementById(`${id}-upload`)?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Subir video (máx. 100 MB)
        </Button>
        <p className="text-xs text-muted-foreground">
          El video se sube al almacenamiento público de medios del Club y se muestra después de
          guardar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{field.label}</Label>
        <button
          type="button"
          onClick={onRestore}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" /> Original
        </button>
      </div>
      {field.type === "textarea" ? (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
        />
      ) : (
        <Input
          id={id}
          type={field.type === "number" ? "number" : "text"}
          min={field.type === "number" ? 0 : undefined}
          step={field.type === "number" ? 1 : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
    </div>
  );
}

function LandingCollectionEditor({
  collection,
  value,
  onChange,
}: {
  collection: ClubLandingCollection;
  value: string;
  onChange: (value: string) => void;
}) {
  const items = parseCollection(value);

  const updateItem = (index: number, key: string, itemValue: string) => {
    const next = items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [key]: itemValue } : item,
    );
    onChange(JSON.stringify(next));
  };

  const moveItem = (index: number, offset: number) => {
    const next = [...items];
    const target = index + offset;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(JSON.stringify(next));
  };

  return (
    <section className="space-y-4 rounded-xl border border-border/70 bg-background/50 p-4">
      <div>
        <h3 className="font-cond text-sm font-semibold uppercase tracking-wide text-foreground">
          {collection.label}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{collection.help}</p>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <article
            key={String(item.id ?? `${collection.key}-${index}`)}
            className="rounded-xl border border-border bg-card p-3 sm:p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="font-cond text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Elemento {index + 1}
              </p>
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Mover elemento ${index + 1} hacia arriba`}
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                >
                  <MoveUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Mover elemento ${index + 1} hacia abajo`}
                  disabled={index === items.length - 1}
                  onClick={() => moveItem(index, 1)}
                >
                  <MoveDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Eliminar elemento ${index + 1}`}
                  onClick={() => onChange(JSON.stringify(items.filter((_, i) => i !== index)))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {collection.fields.map((field) => {
                const id = `${collection.key}-${index}-${field.key}`;
                return (
                  <div
                    key={field.key}
                    className={field.multiline ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}
                  >
                    <Label htmlFor={id}>{field.label}</Label>
                    {field.multiline ? (
                      <Textarea
                        id={id}
                        rows={3}
                        value={typeof item[field.key] === "string" ? String(item[field.key]) : ""}
                        onChange={(event) => updateItem(index, field.key, event.target.value)}
                      />
                    ) : (
                      <Input
                        id={id}
                        value={typeof item[field.key] === "string" ? String(item[field.key]) : ""}
                        onChange={(event) => updateItem(index, field.key, event.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange(
            JSON.stringify([
              ...items,
              createCollectionItem(collection.key, collection.fields, items.length),
            ]),
          )
        }
        className="font-cond uppercase tracking-wide"
      >
        <Plus className="h-4 w-4" /> Agregar elemento
      </Button>
    </section>
  );
}
