import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { getMyClub } from "@/lib/club.functions";
import {
  adminListCateringPackages,
  adminUpsertCateringPackage,
  adminDeleteCateringPackage,
  type CateringPackage,
} from "@/lib/catering.functions";
import {
  adminCreateClubVideoUploadUrl,
  adminSaveClubContent,
  adminUploadClubImage,
  getClubContent,
} from "@/lib/club-content.functions";
import { CATERING_PAGE_DEFAULTS } from "@/lib/catering-page-content";
import { CoursePageBuilderEditor } from "@/components/CoursePageBuilder";
import { getCoursePageSections } from "@/lib/course-page-content";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { CURRENCY } from "@/data/products";

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

export const Route = createFileRoute("/_authenticated/admin-catering")({
  head: () => ({
    meta: [
      { title: "Catering · Admin · Churrasqueando" },
      {
        name: "description",
        content: "Panel interno para administrar los paquetes de Catering Churrasquero.",
      },
    ],
  }),
  component: AdminCatering,
});

type FormState = {
  id?: string;
  name: string;
  highlight: string;
  price: string;
  portion: string;
  includesNote: string;
  picada: string;
  cortes: string;
  guarniciones: string;
  utencilios: string;
  imageUrl: string;
  active: boolean;
  sortOrder: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  highlight: "",
  price: "0",
  portion: "500 gr por persona",
  includesNote: "",
  picada: "",
  cortes: "",
  guarniciones: "",
  utencilios: "",
  imageUrl: "",
  active: true,
  sortOrder: "0",
};

function AdminCatering() {
  const fetchClub = useServerFn(getMyClub);
  const fetchPackages = useServerFn(adminListCateringPackages);
  const upsert = useServerFn(adminUpsertCateringPackage);
  const remove = useServerFn(adminDeleteCateringPackage);
  const fetchContent = useServerFn(getClubContent);
  const saveContent = useServerFn(adminSaveClubContent);
  const uploadImage = useServerFn(adminUploadClubImage);
  const createVideoUploadUrl = useServerFn(adminCreateClubVideoUploadUrl);
  const queryClient = useQueryClient();

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const packages = useQuery({
    queryKey: ["admin", "catering"],
    queryFn: () => fetchPackages(),
    enabled: !!me.data?.isAdmin,
  });
  const content = useQuery({
    queryKey: ["club-content"],
    queryFn: () => fetchContent(),
    enabled: !!me.data?.isAdmin,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<CateringPackage | null>(null);
  const [pageSettings, setPageSettings] = useState(CATERING_PAGE_DEFAULTS);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (content.data) {
      setPageSettings(
        Object.fromEntries(
          Object.keys(CATERING_PAGE_DEFAULTS).map((key) => [
            key,
            content.data[key] ?? CATERING_PAGE_DEFAULTS[key],
          ]),
        ),
      );
    }
  }, [content.data]);

  const pageSections = getCoursePageSections(pageSettings.catering_page_builder);

  const uploadPageMedia = async (file: File, type: "image" | "video") => {
    setUploadingImage(true);
    try {
      if (type === "image") {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          throw new Error("Usa una imagen PNG, JPG o WebP");
        }
        if (file.size > 6_000_000) throw new Error("La imagen no debe superar 6 MB");
        const result = await uploadImage({
          data: { fileName: file.name, dataUrl: await fileToDataUrl(file) },
        });
        return result.url;
      }

      if (!["video/mp4", "video/webm", "video/ogg"].includes(file.type)) {
        throw new Error("Usa un video MP4, WebM u OGG");
      }
      if (file.size > 300 * 1024 * 1024) throw new Error("El video no debe superar 300 MB");
      const signed = await createVideoUploadUrl({ data: { contentType: file.type } });
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.storage
        .from("club-content")
        .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
      if (error) throw error;
      return signed.publicUrl;
    } finally {
      setUploadingImage(false);
    }
  };

  const savePageMutation = useMutation({
    mutationFn: () =>
      saveContent({
        data: {
          entries: {
            ...pageSettings,
            catering_page_builder: JSON.stringify(pageSections),
          },
        },
      }),
    onSuccess: async () => {
      toast.success("Contenido de Catering actualizado");
      await queryClient.invalidateQueries({ queryKey: ["club-content"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la página"),
  });

  const upsertMutation = useMutation({
    mutationFn: (vars: FormState) =>
      upsert({
        data: {
          id: vars.id,
          imageUrl: vars.imageUrl,
          name: vars.name,
          highlight: vars.highlight,
          price: Number(vars.price) || 0,
          portion: vars.portion,
          includesNote: vars.includesNote,
          picada: vars.picada,
          cortes: vars.cortes
            .split("\n")
            .map((c) => c.trim())
            .filter(Boolean),
          guarniciones: vars.guarniciones
            .split("\n")
            .map((c) => c.trim())
            .filter(Boolean),
          utencilios: vars.utencilios
            .split("\n")
            .map((c) => c.trim())
            .filter(Boolean),
          active: vars.active,
          sortOrder: Number(vars.sortOrder) || 0,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Paquete actualizado" : "Paquete creado");
      queryClient.invalidateQueries({ queryKey: ["admin", "catering"] });
      queryClient.invalidateQueries({ queryKey: ["public-catering"] });
      setDialogOpen(false);
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el paquete"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Paquete eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin", "catering"] });
      queryClient.invalidateQueries({ queryKey: ["public-catering"] });
      setDeleteTarget(null);
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el paquete"),
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (p: CateringPackage) => {
    setForm({
      id: p.id,
      name: p.name,
      highlight: p.highlight,
      price: String(p.price),
      portion: p.portion,
      includesNote: p.includesNote,
      picada: p.picada,
      cortes: p.cortes.join("\n"),
      guarniciones: p.guarniciones.join("\n"),
      utencilios: p.utencilios.join("\n"),
      imageUrl: p.image_url,
      active: p.active,
      sortOrder: String(p.sort_order),
    });
    setDialogOpen(true);
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

  const list = packages.data ?? [];

  return (
    <ClubShell points={me.data.profile.points} isMember={me.data.isMember} isAdmin>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">
            Paquetes de Catering
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {list.length} paquete{list.length === 1 ? "" : "s"} · visibles en /reservar-catering.
          </p>
        </div>
        <Button onClick={openCreate} className="font-cond uppercase tracking-wide">
          <Plus className="h-4 w-4" /> Nuevo paquete
        </Button>
      </div>

      <section className="mt-6 space-y-5 rounded-2xl border border-primary/30 bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide text-foreground">
              Contenido de la página
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Edita los textos principales y agrega secciones, imágenes, videos y subsecciones.
            </p>
          </div>
          <Button
            type="button"
            disabled={
              savePageMutation.isPending || content.isLoading || content.isError || uploadingImage
            }
            onClick={() => savePageMutation.mutate()}
            className="font-cond uppercase tracking-wide"
          >
            {(savePageMutation.isPending || uploadingImage) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Guardar página
          </Button>
        </div>

        {content.isError && (
          <p role="alert" className="text-sm text-destructive">
            No se pudo cargar el contenido actual de la página.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="catering-page-title">Título principal</Label>
            <Input
              id="catering-page-title"
              maxLength={120}
              value={pageSettings.catering_page_title}
              onChange={(event) =>
                setPageSettings((current) => ({
                  ...current,
                  catering_page_title: event.target.value,
                }))
              }
            />
          </div>
          {(
            [
              ["catering_page_subtitle", "Texto bajo el título (usa {min} para mostrar el mínimo)"],
              ["catering_back_link", "Texto para volver al menú"],
              ["catering_options_label", "Etiqueta de opciones"],
              ["catering_price_label", "Etiqueta de precio"],
              ["catering_includes_label", "Etiqueta de contenido incluido"],
              ["catering_cuts_label", "Título de cortes"],
              ["catering_sides_label", "Título de guarniciones"],
              ["catering_tools_label", "Título de utensilios"],
              ["catering_booking_title", "Título para reservar"],
              ["catering_booking_button", "Texto del botón de reserva"],
              ["catering_notes_title", "Título de notas"],
              ["catering_footer_brand", "Marca del pie de página"],
              ["catering_footer_tagline", "Texto del pie de página"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                maxLength={200}
                value={pageSettings[key]}
                onChange={(event) =>
                  setPageSettings((current) => ({ ...current, [key]: event.target.value }))
                }
              />
            </div>
          ))}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="catering-booking-description">Descripción de reserva</Label>
            <Textarea
              id="catering-booking-description"
              maxLength={1000}
              rows={2}
              value={pageSettings.catering_booking_description}
              onChange={(event) =>
                setPageSettings((current) => ({
                  ...current,
                  catering_booking_description: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="catering-notes">Notas (una por línea)</Label>
            <Textarea
              id="catering-notes"
              maxLength={5000}
              rows={4}
              value={pageSettings.catering_notes}
              onChange={(event) =>
                setPageSettings((current) => ({ ...current, catering_notes: event.target.value }))
              }
            />
          </div>
        </div>

        <CoursePageBuilderEditor
          sections={pageSections}
          onChange={(sections) =>
            setPageSettings((current) => ({
              ...current,
              catering_page_builder: JSON.stringify(sections),
            }))
          }
          onMediaUpload={uploadPageMedia}
        />
      </section>

      {packages.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paquete</TableHead>
                <TableHead>Precio / persona</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">
                      {p.name}
                      {p.highlight && (
                        <span className="ml-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          {p.highlight}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.portion}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.price} {CURRENCY}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.sort_order}</TableCell>
                  <TableCell>
                    {p.active ? (
                      <span className="font-cond rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        Activo
                      </span>
                    ) : (
                      <span className="font-cond rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Oculto
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    <UtensilsCrossed className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                    Todavía no hay paquetes. Crea el primero.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar paquete" : "Nuevo paquete"}</DialogTitle>
            <DialogDescription>Se muestra en /reservar-catering para clientes.</DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              upsertMutation.mutate(form);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-name">Nombre</Label>
                <Input
                  id="p-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-highlight">Etiqueta (opcional)</Label>
                <Input
                  id="p-highlight"
                  value={form.highlight}
                  onChange={(e) => setForm((f) => ({ ...f, highlight: e.target.value }))}
                  placeholder="PREMIUM"
                  maxLength={40}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-image">Imagen del paquete</Label>
              {form.imageUrl && (
                <div className="aspect-video w-full overflow-hidden rounded-xl bg-secondary/30">
                  <img
                    src={form.imageUrl}
                    alt={`Vista previa de ${form.name || "paquete"}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              {!form.imageUrl && (
                <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 text-sm text-muted-foreground">
                  La imagen del paquete aparecerá aquí
                </div>
              )}
              <Input
                id="p-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingImage}
                onChange={async (event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  if (!file) return;
                  try {
                    const url = await uploadPageMedia(file, "image");
                    setForm((current) => ({ ...current, imageUrl: url }));
                    toast.success("Imagen subida. Guarda el paquete para publicarla.");
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "No se pudo subir la imagen",
                    );
                  } finally {
                    input.value = "";
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                PNG, JPG o WebP · máximo 6 MB. Para guardar la imagen, aplica primero la migración
                de imágenes de catering en Supabase.
              </p>
              {form.imageUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}
                >
                  Quitar imagen
                </Button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Precio por persona (Bs)</Label>
                <Input
                  id="p-price"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-portion">Porción</Label>
                <Input
                  id="p-portion"
                  value={form.portion}
                  onChange={(e) => setForm((f) => ({ ...f, portion: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-includes">Nota de "incluye" (opcional)</Label>
              <Input
                id="p-includes"
                value={form.includesNote}
                onChange={(e) => setForm((f) => ({ ...f, includesNote: e.target.value }))}
                placeholder="Todos los productos de Churrasqueando"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-picada">Detalle de picada (opcional)</Label>
              <Textarea
                id="p-picada"
                value={form.picada}
                onChange={(e) => setForm((f) => ({ ...f, picada: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cortes">Cortes (uno por línea)</Label>
              <Textarea
                id="p-cortes"
                value={form.cortes}
                onChange={(e) => setForm((f) => ({ ...f, cortes: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-guarniciones">Guarniciones (una por línea)</Label>
              <Textarea
                id="p-guarniciones"
                value={form.guarniciones}
                onChange={(e) => setForm((f) => ({ ...f, guarniciones: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-utencilios">Utensilios (uno por línea)</Label>
              <Textarea
                id="p-utencilios"
                value={form.utencilios}
                onChange={(e) => setForm((f) => ({ ...f, utencilios: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-sort">Orden</Label>
                <Input
                  id="p-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                  id="p-active"
                />
                <Label htmlFor="p-active">Visible para los clientes</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={upsertMutation.isPending || uploadingImage}
                className="font-cond uppercase tracking-wide"
              >
                {upsertMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este paquete?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará de /reservar-catering. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ClubShell>
  );
}
