import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createCourseLessonComment, getCourseLessonComments } from "@/lib/courses.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CourseLessonComments({
  lessonId,
  userId,
  isMember,
}: {
  lessonId: string;
  userId: string;
  isMember: boolean;
}) {
  const fetchComments = useServerFn(getCourseLessonComments);
  const createComment = useServerFn(createCourseLessonComment);
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const queryKey = ["course-lesson-comments", lessonId];

  const comments = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchComments({ data: { lessonId, page: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length : undefined),
  });

  const addComment = useMutation({
    mutationFn: (commentBody: string) => createComment({ data: { lessonId, body: commentBody } }),
    onSuccess: async () => {
      setBody("");
      await queryClient.resetQueries({ queryKey });
      toast.success("Comentario publicado");
    },
    onError: (error) => toast.error(error.message || "No se pudo publicar el comentario"),
  });

  const commentList = comments.data?.pages.flatMap((page) => page.comments) ?? [];

  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h3 className="font-cond text-sm font-semibold uppercase tracking-wide text-white">
          Comentarios
        </h3>
        {commentList.length > 0 && (
          <span className="text-xs text-white/40">{commentList.length}</span>
        )}
      </div>

      {isMember ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            addComment.mutate(body);
          }}
        >
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Comparte tu opinión o pregunta sobre esta lección…"
            maxLength={1000}
            rows={3}
            aria-label="Escribe un comentario"
            className="border-white/10 bg-black/20 text-sm text-white placeholder:text-white/35"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-white/40">{body.length}/1000</span>
            <Button
              type="submit"
              size="sm"
              disabled={!body.trim() || addComment.isPending}
              className="font-cond uppercase tracking-wide"
            >
              {addComment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publicar
            </Button>
          </div>
        </form>
      ) : (
        <p className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/50">
          Activa tu membresía para participar en los comentarios.
        </p>
      )}

      <div className="mt-5 space-y-3">
        {comments.isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : comments.isError ? (
          <p className="py-3 text-sm text-red-300">No se pudieron cargar los comentarios.</p>
        ) : commentList.length === 0 ? (
          <p className="py-3 text-sm text-white/45">Sé el primero en comentar esta lección.</p>
        ) : (
          [...commentList].reverse().map((comment) => (
            <article key={comment.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-semibold text-white/90">
                  {comment.userId === userId ? "Tú" : comment.authorName}
                </p>
                <time dateTime={comment.createdAt} className="text-xs text-white/40">
                  {new Intl.DateTimeFormat("es-BO", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(comment.createdAt))}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-white/70">
                {comment.body}
              </p>
            </article>
          ))
        )}
      </div>

      {comments.hasNextPage && (
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            disabled={comments.isFetchingNextPage}
            onClick={() => comments.fetchNextPage()}
            className="text-white/70 hover:text-white"
          >
            {comments.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
            Ver comentarios anteriores
          </Button>
        </div>
      )}
    </section>
  );
}
