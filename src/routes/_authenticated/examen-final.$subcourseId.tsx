import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, GraduationCap, Loader2, Lock } from "lucide-react";
import { getMyClub } from "@/lib/club.functions";
import { CourseSubcourseAssessment } from "@/components/CourseSubcourseAssessment";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/examen-final/$subcourseId")({
  head: () => ({
    meta: [
      { title: "Examen final · Cursos · Club Churrasqueando" },
      { name: "description", content: "Completa las evaluaciones finales de tu subcurso." },
    ],
  }),
  component: CourseSubcourseFinalExamPage,
});

function CourseSubcourseFinalExamPage() {
  const { subcourseId } = Route.useParams();
  const fetchClub = useServerFn(getMyClub);
  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });

  if (me.isLoading) {
    return (
      <ClubShell>
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </ClubShell>
    );
  }

  if (!me.data?.isMember && !me.data?.isAdmin) {
    return (
      <ClubShell>
        <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <Lock className="mx-auto h-7 w-7 text-primary" />
          <h1 className="font-display mt-4 text-xl uppercase text-white">
            Evaluación exclusiva para socios
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Necesitas una membresía activa para realizar los exámenes.
          </p>
        </div>
      </ClubShell>
    );
  }

  return (
    <ClubShell
      points={me.data.profile.points}
      isMember={me.data.isMember}
      isAdmin={me.data.isAdmin}
    >
      <main className="-mx-4 -mb-8 min-h-[70vh] bg-[#0b0b0c] px-4 py-10 sm:-mx-6 sm:px-10">
        <div className="mx-auto max-w-4xl">
          <Button asChild variant="ghost" className="mb-6 text-white/70 hover:text-white">
            <Link to="/cursos">
              <ArrowLeft className="h-4 w-4" /> Volver a mis cursos
            </Link>
          </Button>
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <p className="font-cond text-xs uppercase tracking-[0.2em] text-primary">
                Evaluación final
              </p>
              <h1 className="font-display text-2xl uppercase tracking-wide text-white">
                Exámenes del subcurso
              </h1>
            </div>
          </div>
          <CourseSubcourseAssessment subcourseId={subcourseId} />
        </div>
      </main>
    </ClubShell>
  );
}
