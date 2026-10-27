import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, FileUp, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  createCoursePracticalEvidenceUploadUrl,
  getCourseSubcourseAssessment,
  submitCoursePracticalEvidence,
  submitCourseSubcourseExam,
} from "@/lib/courses.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CourseSubcourseAssessment({ subcourseId }: { subcourseId: string }) {
  const fetchAssessment = useServerFn(getCourseSubcourseAssessment);
  const createUploadUrl = useServerFn(createCoursePracticalEvidenceUploadUrl);
  const submitExam = useServerFn(submitCourseSubcourseExam);
  const submitPractical = useServerFn(submitCoursePracticalEvidence);
  const assessment = useQuery({
    queryKey: ["club", "course-assessment", subcourseId],
    queryFn: () => fetchAssessment({ data: { subcourseId } }),
  });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [examResult, setExamResult] = useState<{ score: number; total: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [evidencePath, setEvidencePath] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);

  const examMutation = useMutation({
    mutationFn: () => submitExam({ data: { subcourseId, answers } }),
    onSuccess: (result) => {
      setExamResult(result);
      toast.success("Evaluación enviada");
    },
    onError: (error) => toast.error(error.message || "No se pudo enviar la evaluación"),
  });
  const practicalMutation = useMutation({
    mutationFn: () => submitPractical({ data: { subcourseId, evidencePath, note } }),
    onSuccess: () => {
      setEvidencePath("");
      setFile(null);
      setNote("");
      toast.success("Evidencia práctica enviada para revisión");
    },
    onError: (error) => toast.error(error.message || "No se pudo enviar la evidencia"),
  });

  const uploadEvidence = async () => {
    if (!file) return;
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/ogg",
    ];
    if (!allowed.includes(file.type)) {
      toast.error("Usa una imagen JPG, PNG, WebP o un video MP4, WebM u OGG");
      return;
    }
    const limit = file.type.startsWith("image/") ? 10 * 1024 * 1024 : 300 * 1024 * 1024;
    if (file.size > limit) {
      toast.error(
        file.type.startsWith("image/")
          ? "La imagen no debe superar 10 MB"
          : "El video no debe superar 300 MB",
      );
      return;
    }
    setUploading(true);
    try {
      const signed = await createUploadUrl({
        data: { subcourseId, fileName: file.name, contentType: file.type, size: file.size },
      });
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.storage
        .from("course-practical-evidence")
        .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
      if (error) throw error;
      setEvidencePath(signed.path);
      toast.success("Archivo cargado de forma privada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el archivo");
    } finally {
      setUploading(false);
    }
  };

  if (assessment.isLoading) {
    return (
      <div className="mt-8 flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }
  if (assessment.isError) {
    return (
      <p className="mt-8 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
        {assessment.error instanceof Error
          ? assessment.error.message
          : "No se pudieron cargar las evaluaciones."}
      </p>
    );
  }

  const { questions, practicalTask, subcourseTitle } = assessment.data;
  if (!questions.length && !practicalTask.trim()) {
    return (
      <section className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5 text-white/70">
        <h2 className="font-display text-lg uppercase tracking-wide text-white">
          Evaluación final · {subcourseTitle}
        </h2>
        <p className="mt-2 text-sm">
          El administrador todavía no ha configurado el examen teórico ni la evaluación práctica de
          este subcurso.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-5 border-t border-white/10 pt-7">
      <div>
        <p className="font-cond text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Evaluación del subcurso
        </p>
        <h2 className="font-display mt-1 text-xl uppercase tracking-wide text-white">
          {subcourseTitle || "Comprueba y practica lo aprendido"}
        </h2>
        <p className="mt-2 text-sm text-white/55">
          Puedes completar el examen teórico y enviar la evidencia práctica por separado.
        </p>
      </div>

      {questions.length > 0 && (
        <form
          className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (Object.keys(answers).length !== questions.length) {
              toast.error("Responde todas las preguntas antes de enviar");
              return;
            }
            examMutation.mutate();
          }}
        >
          <h3 className="font-cond text-sm font-semibold uppercase tracking-wide text-white">
            Examen teórico
          </h3>
          {questions.map((question, index) => (
            <fieldset key={question.id} className="space-y-2">
              <legend className="text-sm font-medium text-white/85">
                {index + 1}. {question.question}
                <span className="ml-2 text-xs font-normal text-primary">
                  {question.type === "true_false" ? "Verdadero o falso" : "Opción múltiple"}
                </span>
              </legend>
              {question.options.map((option, optionIndex) => (
                <label
                  key={`${question.id}-${optionIndex}`}
                  className="flex items-center gap-2 text-sm text-white/65"
                >
                  <input
                    type="radio"
                    name={question.id}
                    checked={answers[question.id] === optionIndex}
                    onChange={() =>
                      setAnswers((current) => ({ ...current, [question.id]: optionIndex }))
                    }
                    disabled={!!examResult}
                  />
                  {option}
                </label>
              ))}
            </fieldset>
          ))}
          {examResult ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/75">
              <span>
                Resultado: {examResult.score} de {examResult.total}. Puedes volver a intentarlo
                cuando quieras.
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAnswers({});
                  setExamResult(null);
                }}
              >
                Intentar de nuevo
              </Button>
            </div>
          ) : (
            <Button
              type="submit"
              disabled={examMutation.isPending}
              className="font-cond uppercase tracking-wide"
            >
              {examMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar respuestas
            </Button>
          )}
        </form>
      )}

      {practicalTask.trim() && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <h3 className="font-cond text-sm font-semibold uppercase tracking-wide text-white">
              Tarea práctica
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-white/65">{practicalTask}</p>
          </div>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Describe brevemente tu trabajo (opcional)"
            maxLength={2000}
            rows={3}
            className="border-white/10 bg-black/20 text-sm text-white"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm text-white/75 hover:bg-white/5">
              <FileUp className="h-4 w-4" />
              {file?.name ?? "Elegir foto o video"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/ogg"
                className="sr-only"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setEvidencePath("");
                }}
              />
            </label>
            {file && !evidencePath && (
              <Button type="button" variant="outline" onClick={uploadEvidence} disabled={uploading}>
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileUp className="h-4 w-4" />
                )}
                Cargar evidencia
              </Button>
            )}
            {evidencePath && (
              <>
                <span className="inline-flex items-center gap-1 text-xs text-primary">
                  <CheckCircle2 className="h-4 w-4" /> Archivo listo
                </span>
                <Button
                  type="button"
                  onClick={() => practicalMutation.mutate()}
                  disabled={practicalMutation.isPending}
                  className="font-cond uppercase tracking-wide"
                >
                  {practicalMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar tarea
                </Button>
              </>
            )}
          </div>
          <p className="text-xs text-white/40">
            Fotos hasta 10 MB; videos hasta 300 MB. El archivo queda privado.
          </p>
        </div>
      )}
    </section>
  );
}
