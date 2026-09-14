import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Plus, Trash2, ImageOff, GraduationCap, Upload } from "lucide-react";
import { toast } from "sonner";
import { getMyClub } from "@/lib/club.functions";
import {
  adminListCourses,
  adminUpsertCourse,
  adminDeleteCourse,
  adminUploadCourseImage,
  type ClubCourse,
} from "@/lib/courses.functions";
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

export const Route = createFileRoute("/_authenticated/admin-cursos")({
  head: () => ({
    meta: [
      { title: "Cursos · Admin · Churrasqueando" },
      {
        name: "description",
        content: "Panel interno para administrar los cursos del Club Churrasqueando.",
      },
    ],
  }),
  component: AdminCursos,
});

type FormState = {
  id?: string;
  title: string;
  subtitle: string;
  tag: string;
  description: string;
  bullets: string;
  imageUrl: string;
  active: boolean;
  sortOrder: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  subtitle: "",
  tag: "",
  description: "",
  bullets: "",
  imageUrl: "",
  active: true,
  sortOrder: "0",
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AdminCursos() {
  const fetchClub = useServerFn(getMyClub);
  const fetchCourses = useServerFn(adminListCourses);
  const upsert = useServerFn(adminUpsertCourse);
  const remove = useServerFn(adminDeleteCourse);
  const uploadImage = useServerFn(adminUploadCourseImage);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const courses = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: () => fetchCourses(),
    enabled: !!me.data?.isAdmin,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClubCourse | null>(null);

  const upsertMutation = useMutation({
    mutationFn: (vars: FormState) =>
      upsert({
        data: {
          id: vars.id,
          title: vars.title,
          subtitle: vars.subtitle,
          tag: vars.tag,
          description: vars.description,
          bullets: vars.bullets.split("\n").map((b) => b.trim()).filter(Boolean),
          imageUrl: vars.imageUrl || null,
          active: vars.active,
          sortOrder: Number(vars.sortOrder) || 0,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Curso actualizado" : "Curso creado");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["club", "courses"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo guardar el curso"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Curso eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["club", "courses"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo eliminar el curso"),
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (c: ClubCourse) => {
    setForm({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      tag: c.tag,
      description: c.description,
      bullets: c.bullets.join("\n"),
      imageUrl: c.image ?? "",
      active: c.active,
      sortOrder: String(c.sort_order),
    });
    setDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6_000_000) {
      toast.error("La imagen no debe superar 6 MB");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await uploadImage({ data: { fileName: file.name, dataUrl } });
      setForm((f) => ({ ...f, imageUrl: res.url }));
      toast.success("Imagen subida");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

  if (!me.data?.isAdmin) {
    return (
      <ClubShell points={me.data?.profile.points} isMember={me.data?.isMember}>
        <h1 className="font-display text-2xl uppercase tracking-wide text-foreground">
          Acceso restringido
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección es solo para el equipo de Churrasqueando.
        </p>
      </ClubShell>
    );
  }

  const list = courses.data ?? [];

  return (
    <ClubShell points={me.data.profile.points} isMember={me.data.isMember} isAdmin>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">
            Cursos del Club
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {list.length} curso{list.length === 1 ? "" : "s"} · visibles en /club y /cursos para
            socios activos.
          </p>
        </div>
        <Button onClick={openCreate} className="font-cond uppercase tracking-wide">
          <Plus className="h-4 w-4" /> Nuevo curso
        </Button>
      </div>

      {courses.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Etiqueta</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {c.image ? (
                          <img src={c.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <ImageOff className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{c.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.subtitle}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.tag}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.sort_order}</TableCell>
                  <TableCell>
                    {c.active ? (
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
                      <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(c)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    <GraduationCap className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                    Todavía no hay cursos. Crea el primero.
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
            <DialogTitle>{form.id ? "Editar curso" : "Nuevo curso"}</DialogTitle>
            <DialogDescription>
              Este contenido se muestra en /club (para todos) y en /cursos (solo socios).
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              upsertMutation.mutate(form);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="c-title">Título</Label>
              <Input
                id="c-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                maxLength={150}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-subtitle">Subtítulo</Label>
                <Input
                  id="c-subtitle"
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  maxLength={150}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-tag">Etiqueta</Label>
                <Input
                  id="c-tag"
                  value={form.tag}
                  onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
                  placeholder="Curso insignia"
                  maxLength={60}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-description">Descripción</Label>
              <Textarea
                id="c-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-bullets">Puntos clave (uno por línea)</Label>
              <Textarea
                id="c-bullets"
                value={form.bullets}
                onChange={(e) => setForm((f) => ({ ...f, bullets: e.target.value }))}
                rows={4}
                placeholder={"El punto exacto de cada corte\nSellado, reposo y timing"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Imagen</Label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageOff className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Subir imagen
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-sort">Orden</Label>
                <Input
                  id="c-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                  id="c-active"
                />
                <Label htmlFor="c-active">Visible para los clientes</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={upsertMutation.isPending}
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
            <AlertDialogTitle>¿Eliminar este curso?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará de /club y /cursos. Esta acción no se puede deshacer.
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
