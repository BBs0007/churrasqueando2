import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Loader2, MessageCircle, Reply, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  createCourseLessonComment,
  getCourseLessonComments,
  setCourseLessonCommentLike,
  type CourseLessonComment as CourseComment,
} from "@/lib/courses.functions";
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
  const setLike = useServerFn(setCourseLessonCommentLike);
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
    mutationFn: (vars: { body: string; parentCommentId?: string }) =>
      createComment({ data: { lessonId, ...vars } }),
    onSuccess: async () => {
      setBody("");
      await queryClient.resetQueries({ queryKey });
      toast.success("Comentario publicado");
    },
    onError: (error) => toast.error(error.message || "No se pudo publicar el comentario"),
  });

  const toggleLike = useMutation({
    mutationFn: (comment: CourseComment) =>
      setLike({ data: { commentId: comment.id, liked: !comment.likedByMe } }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey }),
    onError: (error) => toast.error(error.message || "No se pudo actualizar el me gusta"),
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
            addComment.mutate({ body });
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
            <CommentCard
              key={comment.id}
              comment={comment}
              userId={userId}
              isMember={isMember}
              replyPending={addComment.isPending}
              likePending={toggleLike.isPending}
              onReply={(replyBody) =>
                addComment.mutate({ body: replyBody, parentCommentId: comment.id })
              }
              onLike={() => toggleLike.mutate(comment)}
            >
              {comment.replies.map((reply) => (
                <CommentCard
                  key={reply.id}
                  comment={reply}
                  userId={userId}
                  isMember={isMember}
                  replyPending={addComment.isPending}
                  likePending={toggleLike.isPending}
                  onReply={(replyBody) =>
                    addComment.mutate({ body: replyBody, parentCommentId: comment.id })
                  }
                  onLike={() => toggleLike.mutate(reply)}
                  isReply
                />
              ))}
            </CommentCard>
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

function CommentCard({
  comment,
  userId,
  isMember,
  replyPending,
  likePending,
  onReply,
  onLike,
  isReply = false,
  children,
}: {
  comment: CourseComment;
  userId: string;
  isMember: boolean;
  replyPending: boolean;
  likePending: boolean;
  onReply: (body: string) => void;
  onLike: () => void;
  isReply?: boolean;
  children?: React.ReactNode;
}) {
  const [reply, setReply] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);

  return (
    <article
      className={`rounded-lg border border-white/10 bg-black/20 p-3 ${isReply ? "ml-5 border-white/5 bg-white/[0.03]" : ""}`}
    >
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
      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-white/70">{comment.body}</p>
      {isMember && (
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            disabled={likePending}
            onClick={onLike}
            aria-pressed={comment.likedByMe}
            className={`inline-flex items-center gap-1 text-xs ${comment.likedByMe ? "text-primary" : "text-white/45 hover:text-white"}`}
          >
            <Heart className={`h-3.5 w-3.5 ${comment.likedByMe ? "fill-current" : ""}`} />
            {comment.likeCount || "Me gusta"}
          </button>
          {!isReply && (
            <button
              type="button"
              onClick={() => setReplyOpen((open) => !open)}
              className="inline-flex items-center gap-1 text-xs text-white/45 hover:text-white"
            >
              <Reply className="h-3.5 w-3.5" /> Responder
            </button>
          )}
        </div>
      )}
      {replyOpen && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!reply.trim()) return;
            onReply(reply.trim());
            setReply("");
            setReplyOpen(false);
          }}
        >
          <Textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder="Escribe una respuesta…"
            maxLength={1000}
            rows={2}
            aria-label="Escribe una respuesta"
            className="border-white/10 bg-black/20 text-sm text-white placeholder:text-white/35"
          />
          <Button type="submit" size="icon" disabled={!reply.trim() || replyPending}>
            {replyPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Enviar respuesta</span>
          </Button>
        </form>
      )}
      {children && <div className="mt-3 space-y-2">{children}</div>}
    </article>
  );
}
