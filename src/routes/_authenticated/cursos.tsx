import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Lock, Play, GraduationCap, X, Check } from "lucide-react";
import { getMyClub } from "@/lib/club.functions";
import { getPublicCourses, type ClubCourse } from "@/lib/courses.functions";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { CLUB } from "@/lib/club";

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

function CursosPage() {
  const fetchClub = useServerFn(getMyClub);
  const fetchCourses = useServerFn(getPublicCourses);
  const [openCourse, setOpenCourse] = useState<ClubCourse | null>(null);

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const courses = useQuery({
    queryKey: ["club", "courses"],
    queryFn: () => fetchCourses(),
    enabled: !!me.data,
  });

  if (me.isLoading) {
    return (
      <ClubShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </ClubShell>
    );
  }

  if (!me.data?.isMember) {
    return (
      <ClubShell points={me.data?.profile.points} isMember={me.data?.isMember} isAdmin={me.data?.isAdmin}>
        <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-border bg-card p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="font-display mt-4 text-2xl uppercase tracking-wide text-foreground">
            Solo para socios del Club
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Los {CLUB.coursesCount} cursos completos son un beneficio exclusivo del{" "}
            {CLUB.name}. Activa tu membresía para desbloquearlos.
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

  return (
    <ClubShell points={me.data.profile.points} isMember={me.data.isMember} isAdmin={me.data.isAdmin}>
      <div className="-mx-4 -mb-8 min-h-[70vh] bg-[#0b0b0c] px-4 py-10 sm:-mx-6 sm:px-10">
        <div className="mx-auto max-w-6xl">
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
                  onClick={() => setOpenCourse(c)}
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
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Play className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                  <p className="font-cond mt-2.5 text-sm font-semibold uppercase tracking-wide text-white/90">
                    {c.title}
                  </p>
                </button>
              ))}
              {list.length === 0 && (
                <p className="col-span-full py-10 text-sm text-white/50">
                  Todavía no hay cursos publicados.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {openCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpenCourse(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-cond inline-block rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                  {openCourse.tag}
                </span>
                <h2 className="font-display mt-3 text-2xl uppercase tracking-wide text-foreground">
                  {openCourse.title}
                </h2>
                <p className="font-sans text-sm italic text-primary">{openCourse.subtitle}</p>
              </div>
              <button
                onClick={() => setOpenCourse(null)}
                className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{openCourse.description}</p>
            <ul className="mt-4 space-y-2">
              {openCourse.bullets.map((b) => (
                <li key={b} className="flex gap-2.5 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" disabled className="mt-6 w-full font-cond uppercase tracking-wide">
              <Play className="h-4 w-4" /> Contenido en preparación
            </Button>
          </div>
        </div>
      )}
    </ClubShell>
  );
}
