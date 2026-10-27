import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  ImageOff,
  GraduationCap,
  Upload,
  Layers3,
  FileText,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getMyClub } from "@/lib/club.functions";
import { adminSaveClubContent, getClubContent } from "@/lib/club-content.functions";
import { getCoursePageSections } from "@/lib/course-page-content";
import { CoursePageBuilderEditor } from "@/components/CoursePageBuilder";
import type { CoursePageSection } from "@/lib/course-page-content";
import {
  adminListCourses,
  adminUpsertCourse,
  adminDeleteCourse,
  adminUploadCourseImage,
  adminListSubcourses,
  adminUpsertSubcourse,
  adminDeleteSubcourse,
  adminListLessons,
  adminUpsertLesson,
  adminDeleteLesson,
  adminCreateLessonVideoUploadUrl,
  adminCreateLessonPdfUploadUrl,
  adminListCoursePracticalSubmissions,
  adminReviewCoursePracticalSubmission,
  type ClubCourse,
  type CourseSubcourse,
  type CourseLesson,
  type CourseExamQuestion,
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

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

function AdminCursos() {
  const fetchClub = useServerFn(getMyClub);
  const fetchCourses = useServerFn(adminListCourses);
  const upsert = useServerFn(adminUpsertCourse);
  const remove = useServerFn(adminDeleteCourse);
  const uploadImage = useServerFn(adminUploadCourseImage);
  const fetchPageContent = useServerFn(getClubContent);
  const savePageContent = useServerFn(adminSaveClubContent);
  const createVideoUploadUrl = useServerFn(adminCreateLessonVideoUploadUrl);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const courses = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: () => fetchCourses(),
    enabled: !!me.data?.isAdmin,
  });
  const pageContent = useQuery({
    queryKey: ["admin", "courses-page-content"],
    queryFn: () => fetchPageContent(),
    enabled: !!me.data?.isAdmin,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [pageSections, setPageSections] = useState<CoursePageSection[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ClubCourse | null>(null);
  const [subcoursesCourse, setSubcoursesCourse] = useState<ClubCourse | null>(null);
  const [lessonsSubcourse, setLessonsSubcourse] = useState<CourseSubcourse | null>(null);

  useEffect(() => {
    if (pageContent.data) {
      setPageSections(getCoursePageSections(pageContent.data.courses_page_builder));
    }
  }, [pageContent.data]);

  const upsertMutation = useMutation({
    mutationFn: (vars: FormState) =>
      upsert({
        data: {
          id: vars.id,
          title: vars.title,
          subtitle: vars.subtitle,
          tag: vars.tag,
          description: vars.description,
          bullets: vars.bullets
            .split("\n")
            .map((b) => b.trim())
            .filter(Boolean),
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
    onError: (err: unknown) => toast.error(errorMessage(err, "No se pudo guardar el curso")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Curso eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["club", "courses"] });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "No se pudo eliminar el curso")),
  });

  const savePageContentMutation = useMutation({
    mutationFn: (sections: CoursePageSection[]) =>
      savePageContent({ data: { entries: { courses_page_builder: JSON.stringify(sections) } } }),
    onSuccess: () => {
      toast.success("Contenido adicional guardado");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses-page-content"] });
      queryClient.invalidateQueries({ queryKey: ["club", "courses-page-content"] });
    },
    onError: (err: unknown) =>
      toast.error(errorMessage(err, "No se pudo guardar el contenido adicional")),
  });

  const uploadPageMedia = async (file: File, type: "image" | "video") => {
    if (type === "image") {
      if (file.size > 6_000_000) throw new Error("La imagen no debe superar 6 MB");
      const dataUrl = await fileToDataUrl(file);
      const result = await uploadImage({ data: { fileName: file.name, dataUrl } });
      return result.url;
    }
    if (!["video/mp4", "video/webm", "video/ogg"].includes(file.type)) {
      throw new Error("Usa un video MP4, WebM u OGG");
    }
    if (file.size > 100 * 1024 * 1024) throw new Error("El video no debe superar 100 MB");
    const signed = await createVideoUploadUrl({ data: { fileName: file.name } });
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.storage
      .from("course-videos")
      .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
    if (error) throw error;
    return signed.publicUrl;
  };

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
    } catch (err: unknown) {
      toast.error(errorMessage(err, "No se pudo subir la imagen"));
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

      {pageContent.isLoading ? (
        <div className="mt-6 flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : pageContent.isError ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          No se pudo cargar el contenido editable de la página.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          <CoursePageBuilderEditor
            sections={pageSections}
            onChange={setPageSections}
            onMediaUpload={uploadPageMedia}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => savePageContentMutation.mutate(pageSections)}
              disabled={savePageContentMutation.isPending}
              className="font-cond uppercase tracking-wide"
            >
              {savePageContentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar contenido adicional
            </Button>
          </div>
        </div>
      )}

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
                      <Button variant="outline" size="sm" onClick={() => setSubcoursesCourse(c)}>
                        <Layers3 className="h-3.5 w-3.5" /> Subcursos
                      </Button>
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
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
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

      {subcoursesCourse && (
        <SubcoursesDialog
          course={subcoursesCourse}
          onClose={() => setSubcoursesCourse(null)}
          onManageLessons={(subcourse) => {
            setSubcoursesCourse(null);
            setLessonsSubcourse(subcourse);
          }}
        />
      )}
      {lessonsSubcourse && (
        <LessonsDialog subcourse={lessonsSubcourse} onClose={() => setLessonsSubcourse(null)} />
      )}
    </ClubShell>
  );
}

function SubcoursesDialog({
  course,
  onClose,
  onManageLessons,
}: {
  course: ClubCourse;
  onClose: () => void;
  onManageLessons: (subcourse: CourseSubcourse) => void;
}) {
  const fetchSubcourses = useServerFn(adminListSubcourses);
  const upsertSubcourse = useServerFn(adminUpsertSubcourse);
  const deleteSubcourse = useServerFn(adminDeleteSubcourse);
  const queryClient = useQueryClient();
  const subcourses = useQuery({
    queryKey: ["admin", "subcourses", course.id],
    queryFn: () => fetchSubcourses({ data: { courseId: course.id } }),
  });
  const [form, setForm] = useState({
    id: undefined as string | undefined,
    title: "",
    description: "",
    active: true,
    sortOrder: "0",
    examQuestions: [] as CourseExamQuestion[],
    practicalTask: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<CourseSubcourse | null>(null);
  const [reviewSubcourse, setReviewSubcourse] = useState<CourseSubcourse | null>(null);
  const [theorySubcourse, setTheorySubcourse] = useState<CourseSubcourse | null>(null);
  const [practicalSubcourse, setPracticalSubcourse] = useState<CourseSubcourse | null>(null);
  const list = subcourses.data ?? [];

  const resetForm = () =>
    setForm({
      id: undefined,
      title: "",
      description: "",
      active: true,
      sortOrder: "0",
      examQuestions: [],
      practicalTask: "",
    });

  const upsertMutation = useMutation({
    mutationFn: () =>
      upsertSubcourse({
        data: {
          id: form.id,
          courseId: course.id,
          title: form.title,
          description: form.description,
          active: form.active,
          sortOrder: Number(form.sortOrder) || 0,
          examQuestions: form.examQuestions,
          practicalTask: form.practicalTask,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Subcurso actualizado" : "Subcurso creado");
      queryClient.invalidateQueries({ queryKey: ["admin", "subcourses", course.id] });
      queryClient.invalidateQueries({ queryKey: ["club", "course-subcourses", course.id] });
      resetForm();
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "No se pudo guardar el subcurso")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubcourse({ data: { id } }),
    onSuccess: () => {
      toast.success("Subcurso eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin", "subcourses", course.id] });
      queryClient.invalidateQueries({ queryKey: ["club", "course-subcourses", course.id] });
      queryClient.invalidateQueries({ queryKey: ["club", "course-lessons"] });
      setDeleteTarget(null);
    },
    onError: (error: unknown) =>
      toast.error(errorMessage(error, "No se pudo eliminar el subcurso")),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Subcursos de "{course.title}"</DialogTitle>
          <DialogDescription>
            Organiza el contenido del curso en subcursos y administra sus lecciones por separado.
          </DialogDescription>
        </DialogHeader>

        {subcourses.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : subcourses.isError ? (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {errorMessage(subcourses.error, "No se pudieron cargar los subcursos.")}
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((subcourse, index) => (
              <div
                key={subcourse.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-5 shrink-0 text-xs text-muted-foreground">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {subcourse.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {subcourse.active ? "Visible para socios" : "Oculto"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onManageLessons(subcourse)}>
                    <GraduationCap className="h-3.5 w-3.5" /> Lecciones
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setTheorySubcourse(subcourse)}>
                    <FileText className="h-3.5 w-3.5" /> Examen teórico
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPracticalSubcourse(subcourse)}
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" /> Práctica
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReviewSubcourse(subcourse)}
                    aria-label={`Revisar entregas de ${subcourse.title}`}
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" /> Entregas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({
                        id: subcourse.id,
                        title: subcourse.title,
                        description: subcourse.description,
                        active: subcourse.active,
                        sortOrder: String(subcourse.sortOrder),
                        examQuestions: subcourse.examQuestions ?? [],
                        practicalTask: subcourse.practicalTask ?? "",
                      })
                    }
                    aria-label={`Editar ${subcourse.title}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteTarget(subcourse)}
                    aria-label={`Eliminar ${subcourse.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {list.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Este curso aún no tiene subcursos.
              </p>
            )}
          </div>
        )}

        <form
          className="mt-4 space-y-4 rounded-2xl border border-border bg-secondary/30 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            upsertMutation.mutate();
          }}
        >
          <p className="font-cond text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {form.id ? "Editar subcurso" : "Nuevo subcurso"}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="subcourse-title">Título</Label>
            <Input
              id="subcourse-title"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              maxLength={150}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subcourse-description">Descripción</Label>
            <Textarea
              id="subcourse-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={2}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="subcourse-sort">Orden</Label>
              <Input
                id="subcourse-sort"
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sortOrder: event.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                id="subcourse-active"
                checked={form.active}
                onCheckedChange={(active) => setForm((current) => ({ ...current, active }))}
              />
              <Label htmlFor="subcourse-active">Visible para socios</Label>
            </div>
          </div>
          {form.id && (
            <p className="border-t border-border pt-4 text-sm text-muted-foreground">
              El examen teórico y la evaluación práctica se configuran por separado desde los
              botones de cada subcurso.
            </p>
          )}
          <div className="flex justify-end gap-2">
            {form.id && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancelar edición
              </Button>
            )}
            <Button type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {form.id ? "Guardar cambios" : "Agregar subcurso"}
            </Button>
          </div>
        </form>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este subcurso?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminarán "{deleteTarget?.title}", todas sus lecciones y los comentarios
                asociados. Esta acción no se puede deshacer.
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
        {reviewSubcourse && (
          <CoursePracticalReviewDialog
            subcourse={reviewSubcourse}
            onClose={() => setReviewSubcourse(null)}
          />
        )}
        {theorySubcourse && (
          <TheoreticalExamDialog
            subcourse={theorySubcourse}
            onClose={() => setTheorySubcourse(null)}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ["admin", "subcourses", course.id] });
              queryClient.invalidateQueries({ queryKey: ["club", "course-subcourses", course.id] });
            }}
          />
        )}
        {practicalSubcourse && (
          <PracticalTaskDialog
            subcourse={practicalSubcourse}
            onClose={() => setPracticalSubcourse(null)}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ["admin", "subcourses", course.id] });
              queryClient.invalidateQueries({ queryKey: ["club", "course-subcourses", course.id] });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CoursePracticalReviewDialog({
  subcourse,
  onClose,
}: {
  subcourse: CourseSubcourse;
  onClose: () => void;
}) {
  const fetchSubmissions = useServerFn(adminListCoursePracticalSubmissions);
  const review = useServerFn(adminReviewCoursePracticalSubmission);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const submissions = useQuery({
    queryKey: ["admin", "practical-submissions", subcourse.id],
    queryFn: () => fetchSubmissions({ data: { subcourseId: subcourse.id } }),
  });
  const reviewMutation = useMutation({
    mutationFn: (id: string) =>
      review({ data: { submissionId: id, feedback: feedback[id] ?? "" } }),
    onSuccess: () => {
      toast.success("Entrega revisada");
      queryClient.invalidateQueries({ queryKey: ["admin", "practical-submissions", subcourse.id] });
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "No se pudo guardar la revisión")),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Entregas prácticas · {subcourse.title}</DialogTitle>
          <DialogDescription>
            Los archivos se mantienen privados. El enlace firmado solo funciona por tiempo limitado.
          </DialogDescription>
        </DialogHeader>
        {submissions.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : submissions.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(submissions.error, "No se pudieron cargar las entregas.")}
          </p>
        ) : submissions.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Todavía no hay entregas para este subcurso.
          </p>
        ) : (
          <div className="space-y-3">
            {submissions.data.map((submission) => (
              <article
                key={submission.id}
                className="space-y-3 rounded-xl border border-border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{submission.authorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(submission.createdAt).toLocaleString("es-BO")} ·{" "}
                      {submission.status === "reviewed" ? "Revisada" : "Pendiente"}
                    </p>
                  </div>
                  <a
                    href={submission.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" /> Ver evidencia
                  </a>
                </div>
                {submission.note && (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {submission.note}
                  </p>
                )}
                <Textarea
                  value={feedback[submission.id] ?? submission.adminFeedback}
                  onChange={(event) =>
                    setFeedback((current) => ({ ...current, [submission.id]: event.target.value }))
                  }
                  placeholder="Devolución para el socio (opcional)"
                  maxLength={2000}
                  rows={2}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate(submission.id)}
                  >
                    {reviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Guardar revisión
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TheoreticalExamDialog({
  subcourse,
  onClose,
  onSaved,
}: {
  subcourse: CourseSubcourse;
  onClose: () => void;
  onSaved: () => void;
}) {
  const upsertSubcourse = useServerFn(adminUpsertSubcourse);
  const [questions, setQuestions] = useState<CourseExamQuestion[]>(() =>
    (subcourse.examQuestions ?? []).map((question) => ({
      ...question,
      type: question.type ?? "multiple_choice",
      options: [...question.options],
    })),
  );
  const saveMutation = useMutation({
    mutationFn: () =>
      upsertSubcourse({
        data: {
          id: subcourse.id,
          courseId: subcourse.courseId,
          title: subcourse.title,
          description: subcourse.description,
          active: subcourse.active,
          sortOrder: subcourse.sortOrder,
          examQuestions: questions,
          practicalTask: subcourse.practicalTask ?? "",
        },
      }),
    onSuccess: () => {
      toast.success("Examen teórico actualizado");
      onSaved();
      onClose();
    },
    onError: (error: unknown) =>
      toast.error(errorMessage(error, "No se pudo guardar el examen teórico")),
  });

  const updateQuestion = (
    id: string,
    update: (question: CourseExamQuestion) => CourseExamQuestion,
  ) =>
    setQuestions((current) =>
      current.map((question) => (question.id === id ? update(question) : question)),
    );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Examen teórico · {subcourse.title}</DialogTitle>
          <DialogDescription>
            Crea preguntas de selección múltiple o verdadero/falso. Puedes combinar los formatos en
            el mismo examen.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {questions.map((question, questionIndex) => (
            <section key={question.id} className="space-y-3 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Pregunta {questionIndex + 1}</Label>
                <div className="flex items-center gap-2">
                  <select
                    value={question.type ?? "multiple_choice"}
                    onChange={(event) => {
                      const type = event.target.value as "multiple_choice" | "true_false";
                      updateQuestion(question.id, (current) => ({
                        ...current,
                        type,
                        options:
                          type === "true_false"
                            ? ["Verdadero", "Falso"]
                            : current.type === "true_false"
                              ? ["", ""]
                              : current.options,
                        correctAnswerIndex: 0,
                      }));
                    }}
                    aria-label={`Formato de pregunta ${questionIndex + 1}`}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="multiple_choice">Opción múltiple</option>
                    <option value="true_false">Verdadero o falso</option>
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar pregunta ${questionIndex + 1}`}
                    onClick={() =>
                      setQuestions((current) => current.filter((item) => item.id !== question.id))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <Textarea
                value={question.question}
                onChange={(event) =>
                  updateQuestion(question.id, (current) => ({
                    ...current,
                    question: event.target.value,
                  }))
                }
                placeholder="Escribe la pregunta"
                maxLength={500}
                rows={2}
              />
              {question.options.map((option, optionIndex) => (
                <div key={`${question.id}-${optionIndex}`} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${question.id}`}
                    checked={question.correctAnswerIndex === optionIndex}
                    aria-label={`Marcar opción ${optionIndex + 1} como correcta`}
                    onChange={() =>
                      updateQuestion(question.id, (current) => ({
                        ...current,
                        correctAnswerIndex: optionIndex,
                      }))
                    }
                  />
                  {question.type === "true_false" ? (
                    <span className="text-sm text-muted-foreground">{option}</span>
                  ) : (
                    <>
                      <Input
                        value={option}
                        onChange={(event) =>
                          updateQuestion(question.id, (current) => ({
                            ...current,
                            options: current.options.map((value, index) =>
                              index === optionIndex ? event.target.value : value,
                            ),
                          }))
                        }
                        placeholder={`Opción ${optionIndex + 1}`}
                        maxLength={200}
                      />
                      {question.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Eliminar opción ${optionIndex + 1}`}
                          onClick={() =>
                            updateQuestion(question.id, (current) => ({
                              ...current,
                              options: current.options.filter((_, index) => index !== optionIndex),
                              correctAnswerIndex:
                                current.correctAnswerIndex === optionIndex
                                  ? 0
                                  : current.correctAnswerIndex > optionIndex
                                    ? current.correctAnswerIndex - 1
                                    : current.correctAnswerIndex,
                            }))
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ))}
              {question.type !== "true_false" && question.options.length < 6 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateQuestion(question.id, (current) => ({
                      ...current,
                      options: [...current.options, ""],
                    }))
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar opción
                </Button>
              )}
            </section>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={questions.length >= 50}
            onClick={() =>
              setQuestions((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  type: "multiple_choice",
                  question: "",
                  options: ["", ""],
                  correctAnswerIndex: 0,
                },
              ])
            }
          >
            <Plus className="h-4 w-4" /> Agregar pregunta
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar examen teórico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PracticalTaskDialog({
  subcourse,
  onClose,
  onSaved,
}: {
  subcourse: CourseSubcourse;
  onClose: () => void;
  onSaved: () => void;
}) {
  const upsertSubcourse = useServerFn(adminUpsertSubcourse);
  const [task, setTask] = useState(subcourse.practicalTask ?? "");
  const saveMutation = useMutation({
    mutationFn: () =>
      upsertSubcourse({
        data: {
          id: subcourse.id,
          courseId: subcourse.courseId,
          title: subcourse.title,
          description: subcourse.description,
          active: subcourse.active,
          sortOrder: subcourse.sortOrder,
          examQuestions: subcourse.examQuestions ?? [],
          practicalTask: task,
        },
      }),
    onSuccess: () => {
      toast.success("Evaluación práctica actualizada");
      onSaved();
      onClose();
    },
    onError: (error: unknown) =>
      toast.error(errorMessage(error, "No se pudo guardar la evaluación práctica")),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Evaluación práctica · {subcourse.title}</DialogTitle>
          <DialogDescription>
            Describe el trabajo que el socio debe realizar y la evidencia que debe enviar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="practical-task-description">Consigna para el estudiante</Label>
          <Textarea
            id="practical-task-description"
            value={task}
            onChange={(event) => setTask(event.target.value)}
            placeholder="Describe qué debe realizar y qué fotos o videos debe enviar."
            maxLength={5000}
            rows={7}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar evaluación práctica
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function emptyLessonForm() {
  return {
    id: undefined as string | undefined,
    title: "",
    description: "",
    videoUrl: "",
    pdfUrl: "",
    sortOrder: "0",
  };
}

function LessonsDialog({
  subcourse,
  onClose,
}: {
  subcourse: CourseSubcourse;
  onClose: () => void;
}) {
  const fetchLessons = useServerFn(adminListLessons);
  const upsertLesson = useServerFn(adminUpsertLesson);
  const deleteLesson = useServerFn(adminDeleteLesson);
  const createUploadUrl = useServerFn(adminCreateLessonVideoUploadUrl);
  const createPdfUploadUrl = useServerFn(adminCreateLessonPdfUploadUrl);
  const queryClient = useQueryClient();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const lessons = useQuery({
    queryKey: ["admin", "lessons", subcourse.id],
    queryFn: () => fetchLessons({ data: { subcourseId: subcourse.id } }),
  });

  const [form, setForm] = useState(emptyLessonForm());
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<CourseLesson | null>(null);

  const upsertMutation = useMutation({
    mutationFn: (vars: typeof form) =>
      upsertLesson({
        data: {
          id: vars.id,
          courseId: subcourse.courseId,
          subcourseId: subcourse.id,
          title: vars.title,
          description: vars.description,
          videoUrl: vars.videoUrl || null,
          pdfUrl: vars.pdfUrl || null,
          sortOrder: Number(vars.sortOrder) || 0,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Lección actualizada" : "Lección agregada");
      queryClient.invalidateQueries({ queryKey: ["admin", "lessons", subcourse.id] });
      queryClient.invalidateQueries({ queryKey: ["club", "course-lessons", subcourse.id] });
      setForm(emptyLessonForm());
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "No se pudo guardar la lección")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLesson({ data: { id } }),
    onSuccess: () => {
      toast.success("Lección eliminada");
      queryClient.invalidateQueries({ queryKey: ["admin", "lessons", subcourse.id] });
      queryClient.invalidateQueries({ queryKey: ["club", "course-lessons", subcourse.id] });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "No se pudo eliminar la lección")),
  });

  const openEdit = (l: CourseLesson) => {
    setForm({
      id: l.id,
      title: l.title,
      description: l.description,
      videoUrl: l.videoUrl ?? "",
      pdfUrl: l.pdfUrl ?? "",
      sortOrder: String(l.sortOrder),
    });
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Selecciona un archivo de video");
      return;
    }
    setUploadingVideo(true);
    setUploadProgress(0);
    try {
      const { path, token, publicUrl } = await createUploadUrl({ data: { fileName: file.name } });
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.storage
        .from("course-videos")
        .uploadToSignedUrl(path, token, file);
      if (error) throw error;
      setForm((f) => ({ ...f, videoUrl: publicUrl }));
      toast.success("Video subido");
    } catch (err: unknown) {
      toast.error(errorMessage(err, "No se pudo subir el video"));
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
      toast.error("Selecciona un archivo PDF");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("El PDF no debe superar 20 MB");
      return;
    }
    setUploadingPdf(true);
    try {
      const { path, token, publicUrl } = await createPdfUploadUrl({
        data: { fileName: file.name },
      });
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.storage
        .from("course-materials")
        .uploadToSignedUrl(path, token, file, { contentType: "application/pdf" });
      if (error) throw error;
      setForm((f) => ({ ...f, pdfUrl: publicUrl }));
      toast.success("PDF subido");
    } catch (err: unknown) {
      toast.error(errorMessage(err, "No se pudo subir el PDF"));
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const list = lessons.data ?? [];

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lecciones de "{subcourse.title}"</DialogTitle>
          <DialogDescription>
            Cada lección tiene su título, descripción, video y material PDF opcional. Los socios las
            ven en el orden indicado.
          </DialogDescription>
        </DialogHeader>

        {lessons.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((l, idx) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-5 shrink-0 text-xs text-muted-foreground">{idx + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{l.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[l.videoUrl ? "Video cargado" : "Sin video", l.pdfUrl ? "PDF cargado" : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(l)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteTarget(l)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {list.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Todavía no hay lecciones. Agrega la primera abajo.
              </p>
            )}
          </div>
        )}

        <form
          className="mt-4 space-y-4 rounded-2xl border border-border bg-secondary/30 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            upsertMutation.mutate(form);
          }}
        >
          <p className="font-cond text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {form.id ? "Editar lección" : "Nueva lección"}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="l-title">Título de la lección</Label>
            <Input
              id="l-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ej: Cómo elegir cortes de buena calidad"
              required
              maxLength={150}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-description">Descripción</Label>
            <Textarea
              id="l-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Video</Label>
            {form.videoUrl ? (
              <video
                src={form.videoUrl}
                controls
                controlsList="nodownload"
                onContextMenu={(event) => event.preventDefault()}
                className="max-h-40 w-full rounded-lg bg-black"
              />
            ) : (
              <div className="flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                Sin video todavía
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingVideo}
                onClick={() => videoInputRef.current?.click()}
              >
                {uploadingVideo ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {uploadingVideo
                  ? "Subiendo..."
                  : form.videoUrl
                    ? "Reemplazar video"
                    : "Subir video"}
              </Button>
              {form.videoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, videoUrl: "" }))}
                >
                  Quitar
                </Button>
              )}
            </div>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="hidden"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-pdf">Material PDF (opcional)</Label>
            {form.pdfUrl ? (
              <a
                href={form.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-foreground hover:bg-secondary/50"
              >
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                Ver PDF cargado
              </a>
            ) : (
              <div className="flex h-16 w-full items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                Sin material PDF
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingPdf}
                onClick={() => pdfInputRef.current?.click()}
              >
                {uploadingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {uploadingPdf ? "Subiendo..." : form.pdfUrl ? "Reemplazar PDF" : "Subir PDF"}
              </Button>
              {form.pdfUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, pdfUrl: "" }))}
                >
                  Quitar
                </Button>
              )}
            </div>
            <input
              id="l-pdf"
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handlePdfChange}
              className="hidden"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="l-sort">Orden</Label>
              <Input
                id="l-sort"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
            </div>
            <div className="flex items-end gap-2">
              {form.id && (
                <Button type="button" variant="ghost" onClick={() => setForm(emptyLessonForm())}>
                  Cancelar edición
                </Button>
              )}
              <Button
                type="submit"
                disabled={upsertMutation.isPending || uploadingVideo || uploadingPdf}
                className="font-cond uppercase tracking-wide"
              >
                {upsertMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {form.id ? "Guardar cambios" : "Agregar lección"}
              </Button>
            </div>
          </div>
        </form>

        <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar esta lección?</AlertDialogTitle>
              <AlertDialogDescription>
                "{deleteTarget?.title}" se eliminará del curso. Esta acción no se puede deshacer.
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
      </DialogContent>
    </Dialog>
  );
}
