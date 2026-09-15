import { useRef, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload, FileEdit, Image as ImageIcon, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getMyClub } from "@/lib/club.functions";
import { getClubContent, adminSaveClubContent, adminUploadClubImage } from "@/lib/club-content.functions";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import clubHero from "@/assets/club/club-hero.jpg";
import clubVideo from "@/assets/club/club-video-thumb.jpg";

export const Route = createFileRoute("/_authenticated/admin-club-contenido")({
  head: () => ({
    meta: [
      { title: "Contenido de /club · Admin · Churrasqueando" },
      {
        name: "description",
        content: "Editar los textos e imágenes principales de la página del Club Churrasqueando.",
      },
    ],
  }),
  component: AdminClubContenido,
});

const FIELDS: {
  key: string;
  label: string;
  type: "text" | "textarea";
  placeholder: string;
}[] = [
  {
    key: "hero_title",
    label: "Título principal (Hero)",
    type: "textarea",
    placeholder: "La plataforma más completa para dominar la parrilla",
  },
  {
    key: "hero_subtitle",
    label: "Subtítulo del Hero",
    type: "textarea",
    placeholder: "6 cursos, recetarios y el soporte de nuestros parrilleros...",
  },
  {
    key: "problem_title",
    label: "Título de la sección \"El problema\"",
    type: "textarea",
    placeholder: "¿Cansado de que cada asado sea una lotería?",
  },
  {
    key: "problem_body",
    label: "Texto de la sección \"El problema\"",
    type: "textarea",
    placeholder: "Invitás gente y rezás para que la carne salga bien...",
  },
];

const IMAGE_FIELDS: { key: string; label: string; fallback: string }[] = [
  { key: "hero_image", label: "Imagen de fondo del Hero", fallback: clubHero },
  { key: "video_image", label: "Miniatura del video de presentación", fallback: clubVideo },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AdminClubContenido() {
  const fetchClub = useServerFn(getMyClub);
  const fetchContent = useServerFn(getClubContent);
  const save = useServerFn(adminSaveClubContent);
  const uploadImage = useServerFn(adminUploadClubImage);
  const queryClient = useQueryClient();

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const content = useQuery({
    queryKey: ["club-content"],
    queryFn: () => fetchContent(),
    enabled: !!me.data?.isAdmin,
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (content.data) setForm(content.data);
  }, [content.data]);

  const saveMutation = useMutation({
    mutationFn: (entries: Record<string, string>) => save({ data: { entries } }),
    onSuccess: () => {
      toast.success("Contenido de /club actualizado");
      queryClient.invalidateQueries({ queryKey: ["club-content"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo guardar"),
  });

  const handleImageChange = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6_000_000) {
      toast.error("La imagen no debe superar 6 MB");
      return;
    }
    setUploadingKey(key);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await uploadImage({ data: { fileName: file.name, dataUrl } });
      setForm((f) => ({ ...f, [key]: res.url }));
      toast.success("Imagen subida. No olvides guardar los cambios.");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo subir la imagen");
    } finally {
      setUploadingKey(null);
      const input = fileInputs.current[key];
      if (input) input.value = "";
    }
  };

  if (me.isLoading || !me.data) {
    return (
      <ClubShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
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
            Contenido de /club
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edita los textos e imágenes principales de la página pública del Club. Deja un campo
            vacío para usar el texto original.
          </p>
        </div>
        <a href="/club" target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="font-cond uppercase tracking-wide">
            <FileEdit className="h-3.5 w-3.5" /> Ver /club
          </Button>
        </a>
      </div>

      {content.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <form
          className="mt-6 space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
        >
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
            <p className="font-cond text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Textos
            </p>
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  {form[f.key] && (
                    <button
                      type="button"
                      onClick={() => setForm((s) => ({ ...s, [f.key]: "" }))}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3 w-3" /> Restaurar original
                    </button>
                  )}
                </div>
                <Textarea
                  id={f.key}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  rows={f.type === "textarea" ? 2 : 1}
                />
              </div>
            ))}
          </div>

          <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
            <p className="font-cond text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Imágenes
            </p>
            {IMAGE_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center gap-4">
                <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  <img
                    src={form[f.key]?.trim() ? form[f.key] : f.fallback}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{f.label}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingKey === f.key}
                      onClick={() => fileInputs.current[f.key]?.click()}
                    >
                      {uploadingKey === f.key ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      Subir imagen
                    </Button>
                    {form[f.key]?.trim() && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setForm((s) => ({ ...s, [f.key]: "" }))}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Original
                      </Button>
                    )}
                  </div>
                  <input
                    ref={(el) => {
                      fileInputs.current[f.key] = el;
                    }}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(f.key, e)}
                    className="hidden"
                  />
                </div>
              </div>
            ))}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" /> Recomendado: imágenes horizontales, mínimo
              1200px de ancho.
            </p>
          </div>

          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="font-cond uppercase tracking-wide"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </form>
      )}
    </ClubShell>
  );
}
