import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Lock,
  Play,
  GraduationCap,
  ChevronLeft,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
} from "lucide-react";
import { getMyClub } from "@/lib/club.functions";
import { getClubContent } from "@/lib/club-content.functions";
import { getCoursePageSections } from "@/lib/course-page-content";
import { CoursePageBuilderContent } from "@/components/CoursePageBuilder";
import {
  getPublicCourses,
  getPublicCourseSubcourses,
  getPublicCourseLessons,
  completeCourseLesson,
  type ClubCourse,
} from "@/lib/courses.functions";
import { ClubShell } from "@/components/ClubShell";
import { CourseLessonComments } from "@/components/CourseLessonComments";
import { Button } from "@/components/ui/button";
import { CLUB, COURSES_LAUNCH_AT } from "@/lib/club";

export const Route = createFileRoute("/_authenticated/cursos")({
  head: () => ({
    meta: [
      { title: "Cursos · Club Churrasqueando" },
      {
        name: "description",
        content: "Todos los cursos del Club Churrasqueando en un solo lugar, para socios activos.",
      },
    ],
  }),
  component: CursosPage,
});

function launchCountdown(): string {
  const diffMs = new Date(COURSES_LAUNCH_AT).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  if (days <= 0) return "Muy pronto";
  return `Faltan ${days} día${days === 1 ? "" : "s"}`;
}

function CursosPage() {
  const fetchClub = useServerFn(getMyClub);
  const fetchCourses = useServerFn(getPublicCourses);
  const fetchPageContent = useServerFn(getClubContent);
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const courses = useQuery({
    queryKey: ["club", "courses"],
    queryFn: () => fetchCourses(),
    enabled: !!me.data,
  });
  const pageContent = useQuery({
    queryKey: ["club", "courses-page-content"],
    queryFn: () => fetchPageContent(),
    enabled: !!me.data?.isMember || !!me.data?.isAdmin,
  });

  const isAdmin = !!me.data?.isAdmin;
  const isMember = !!me.data?.isMember;
  const launched = Date.now() >= new Date(COURSES_LAUNCH_AT).getTime();
  const unlocked = isAdmin || launched;

  if (me.isLoading || !me.data) {
    return (
      <ClubShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </ClubShell>
    );
  }

  if (!isMember && !isAdmin) {
    return (
      <ClubShell
        points={me.data?.profile.points}
        isMember={me.data?.isMember}
        isAdmin={me.data?.isAdmin}
      >
        <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-border bg-card p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="font-display mt-4 text-2xl uppercase tracking-wide text-foreground">
            Solo para socios del Club
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Los {CLUB.coursesCount} cursos completos son un beneficio exclusivo del {CLUB.name}.
            Activa tu membresía para desbloquearlos.
          </p>
          <Link to="/club" className="mt-5 inline-block">
            <Button className="font-cond uppercase tracking-wide">
              <GraduationCap className="h-4 w-4" /> Ver el Club Churrasqueando
            </Button>
          </Link>
        </div>
      </ClubShell>
    );
  }

  const list = courses.data ?? [];
  const openCourse = list.find((c) => c.id === openCourseId) ?? null;

  return (
    <ClubShell
      points={me.data.profile.points}
      isMember={me.data.isMember}
      isAdmin={me.data.isAdmin}
    >
      <div className="-mx-4 -mb-8 min-h-[70vh] bg-[#0b0b0c] px-4 py-10 sm:-mx-6 sm:px-10">
        <div className="mx-auto max-w-6xl">
          {!unlocked && (
            <div className="mb-8 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4">
              <Clock className="h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm text-white/80">
                Los cursos se habilitan para todos los socios el{" "}
                <span className="font-semibold text-primary">29 de septiembre de 2026</span>.{" "}
                <span className="text-white/50">{launchCountdown()}.</span> Mientras tanto podés ver
                los títulos y temarios de cada curso.
              </p>
            </div>
          )}

          {!openCourse ? (
            <>
              <h1 className="font-display text-3xl uppercase tracking-wide text-white sm:text-4xl">
                Mis cursos
              </h1>
              <p className="mt-2 text-sm text-white/50">
                Todo lo que incluye tu membresía del {CLUB.name}, en un solo lugar.
              </p>

              <p className="font-cond mt-10 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
                Cursos de parrilla
              </p>

              {courses.isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {list.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setOpenCourseId(c.id)}
                      className="group text-left"
                    >
                      <div className="relative aspect-video overflow-hidden rounded-lg bg-white/5">
                        {c.image ? (
                          <img
                            src={c.image}
                            alt={c.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center"
                            style={{
                              background:
                                "radial-gradient(circle at 50% 100%, oklch(0.62 0.22 35 / 0.35), transparent 65%), #1a1a1c",
                            }}
                          >
                            <GraduationCap className="h-7 w-7 text-white/30" />
                          </div>
                        )}
                        {!unlocked && (
                          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            <Lock className="h-3 w-3" /> 29 sep
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Play className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                      <p className="font-cond mt-2.5 text-sm font-semibold uppercase tracking-wide text-white/90">
                        {c.title}
                      </p>
                      <p className="text-xs text-white/40">{c.subtitle}</p>
                    </button>
                  ))}
                  {list.length === 0 && (
                    <p className="col-span-full py-10 text-sm text-white/50">
                      Todavía no hay cursos publicados.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <CourseDetail
              course={openCourse}
              unlocked={unlocked}
              userId={me.data.profile.id}
              email={me.data.profile.email}
              isMember={me.data.isMember}
              onBack={() => setOpenCourseId(null)}
            />
          )}
          {!openCourse && (
            <div className="mt-12">
              {pageContent.isError ? (
                <p role="alert" className="text-sm text-white/60">
                  No se pudo cargar el contenido adicional.
                </p>
              ) : (
                <CoursePageBuilderContent
                  sections={getCoursePageSections(pageContent.data?.courses_page_builder)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </ClubShell>
  );
}

function CourseDetail({
  course,
  unlocked,
  userId,
  email,
  isMember,
  onBack,
}: {
  course: ClubCourse;
  unlocked: boolean;
  userId: string;
  email: string;
  isMember: boolean;
  onBack: () => void;
}) {
  const fetchSubcourses = useServerFn(getPublicCourseSubcourses);
  const fetchLessons = useServerFn(getPublicCourseLessons);
  const saveLessonCompletion = useServerFn(completeCourseLesson);
  const queryClient = useQueryClient();
  const subcourses = useQuery({
    queryKey: ["club", "course-subcourses", course.id],
    queryFn: () => fetchSubcourses({ data: { courseId: course.id } }),
    enabled: unlocked,
  });
  const [openSubcourseId, setOpenSubcourseId] = useState<string | null>(null);
  const activeSubcourse = subcourses.data?.find((item) => item.id === openSubcourseId) ?? null;
  const lessons = useQuery({
    queryKey: ["club", "course-lessons", activeSubcourse?.id],
    queryFn: () => fetchLessons({ data: { subcourseId: activeSubcourse!.id } }),
    enabled: unlocked && !!activeSubcourse,
  });
  const list = lessons.data ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = list.find((l) => l.id === activeId) ?? list[0] ?? null;
  const completeMutation = useMutation({
    mutationFn: (lessonId: string) => saveLessonCompletion({ data: { lessonId } }),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["club", "course-lessons", activeSubcourse?.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["club", "me"] }),
      ]);
      if (result.courseBonus > 0) {
        toast.success(
          `¡Curso completado! Sumaste ${result.lessonPoints + result.courseBonus} Puntos de Brasa.`,
        );
      } else if (result.lessonPoints > 0) {
        toast.success(`Sumaste ${result.lessonPoints} Puntos de Brasa.`);
      } else {
        toast.success("Esta lección ya estaba completada.");
      }
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el avance"),
  });

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/50 hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" /> Mis cursos
      </button>

      <p className="font-cond text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        {course.tag}
      </p>
      <h1 className="font-display mt-1 text-2xl uppercase tracking-wide text-white sm:text-3xl">
        {course.title}
      </h1>
      <p className="font-sans text-sm italic text-white/50">{course.subtitle}</p>
      <p className="mt-3 max-w-2xl text-sm text-white/60">{course.description}</p>

      {!unlocked ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-14 text-center">
          <Lock className="h-6 w-6 text-primary" />
          <p className="font-display text-lg uppercase tracking-wide text-white">
            Contenido disponible el 29 de septiembre
          </p>
          <p className="max-w-sm text-sm text-white/50">
            Ya podés ver el temario de este curso. Los videos se habilitan para todos los socios el
            29 de septiembre de 2026.
          </p>
        </div>
      ) : subcourses.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : subcourses.isError ? (
        <p className="mt-8 text-sm text-red-300">
          {subcourses.error instanceof Error
            ? subcourses.error.message
            : "No se pudieron cargar los subcursos."}
        </p>
      ) : !activeSubcourse ? (
        subcourses.data?.length ? (
          <div className="mt-8">
            <h2 className="font-display text-xl uppercase tracking-wide text-white">Subcursos</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subcourses.data.map((subcourse) => (
                <button
                  key={subcourse.id}
                  onClick={() => {
                    setOpenSubcourseId(subcourse.id);
                    setActiveId(null);
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:border-primary/60 hover:bg-white/10"
                >
                  <span className="font-cond text-sm font-semibold uppercase tracking-wide text-white">
                    {subcourse.title}
                  </span>
                  {subcourse.description && (
                    <span className="mt-2 block text-sm text-white/50">
                      {subcourse.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-8 text-sm text-white/50">
            Este curso todavía no tiene subcursos publicados.
          </p>
        )
      ) : lessons.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : lessons.isError ? (
        <div className="mt-8">
          <button
            onClick={() => setOpenSubcourseId(null)}
            className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/50 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> Subcursos
          </button>
          <p className="text-sm text-red-300">No se pudieron cargar las lecciones.</p>
        </div>
      ) : list.length === 0 ? (
        <div className="mt-8">
          <button
            onClick={() => setOpenSubcourseId(null)}
            className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/50 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> Subcursos
          </button>
          <p className="text-sm text-white/50">
            Este subcurso todavía no tiene lecciones cargadas.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div>
            <button
              onClick={() => setOpenSubcourseId(null)}
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/50 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" /> Subcursos
            </button>
            <div
              className="relative aspect-video overflow-hidden rounded-xl bg-black"
              onContextMenu={(event) => event.preventDefault()}
            >
              {active?.videoUrl ? (
                <>
                  <video
                    key={active.id}
                    src={active.videoUrl}
                    controls
                    controlsList="nodownload noplaybackrate"
                    disablePictureInPicture
                    onContextMenu={(event) => event.preventDefault()}
                    className="h-full w-full"
                    poster={course.image ?? undefined}
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rotate-[-18deg] select-none text-xs font-semibold tracking-[0.2em] text-white/25 sm:text-sm">
                      {email || "CLUB CHURRASQUEANDO"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/40">
                  <Play className="h-8 w-8" />
                  <p className="text-xs uppercase tracking-wide">Video en preparación</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => active && completeMutation.mutate(active.id)}
              disabled={
                !isMember || !active?.videoUrl || active.completed || completeMutation.isPending
              }
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/50 py-2.5 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {completeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : active?.completed ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              {active?.completed
                ? `Lección completada · ${CLUB.pointsPerCompletedLesson} Puntos de Brasa`
                : `Marcar lección como completada · +${CLUB.pointsPerCompletedLesson}`}
            </button>
            <h2 className="font-display mt-5 text-xl uppercase tracking-wide text-white">
              {active?.title}
            </h2>
            {active?.description && (
              <p className="mt-2 text-sm text-white/60">{active.description}</p>
            )}
            {active?.pdfUrl && (
              <a
                href={active.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-primary/50 hover:bg-white/10"
              >
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-white">
                    Material de la lección
                  </span>
                  <span className="mt-0.5 block text-xs text-white/50">Abrir o descargar PDF</span>
                </span>
              </a>
            )}
            {active && (
              <CourseLessonComments lessonId={active.id} userId={userId} isMember={isMember} />
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="font-cond text-sm font-semibold uppercase tracking-wide text-white">
                {activeSubcourse.title}
              </p>
              <span className="text-xs text-white/40">{list.length} lecciones</span>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {list.map((l, idx) => (
                <button
                  key={l.id}
                  onClick={() => setActiveId(l.id)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    active?.id === l.id ? "bg-primary/15" : "hover:bg-white/5"
                  }`}
                >
                  <span className="w-4 shrink-0 text-xs text-white/40">{idx + 1}</span>
                  <div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-white/10">
                    {course.image && (
                      <img src={course.image} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span className="flex-1 text-xs font-medium leading-snug text-white/90">
                    {l.title}
                  </span>
                  {l.completed && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
