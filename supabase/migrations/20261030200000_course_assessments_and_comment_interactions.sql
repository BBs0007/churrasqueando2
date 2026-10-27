ALTER TABLE public.club_subcourses
  ADD COLUMN IF NOT EXISTS exam_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS practical_task text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.course_subcourse_exam_keys (
  subcourse_id uuid PRIMARY KEY REFERENCES public.club_subcourses(id) ON DELETE CASCADE,
  answer_key jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_subcourse_exam_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.course_subcourse_exam_keys FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.course_subcourse_exam_keys TO service_role;

ALTER TABLE public.course_lesson_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.course_lesson_comments'::regclass
      AND conname = 'course_lesson_comments_id_lesson_unique'
  ) THEN
    ALTER TABLE public.course_lesson_comments
      ADD CONSTRAINT course_lesson_comments_id_lesson_unique UNIQUE (id, lesson_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.course_lesson_comments'::regclass
      AND conname = 'course_lesson_comments_parent_lesson_fkey'
  ) THEN
    ALTER TABLE public.course_lesson_comments
      ADD CONSTRAINT course_lesson_comments_parent_lesson_fkey
      FOREIGN KEY (parent_comment_id, lesson_id)
      REFERENCES public.course_lesson_comments (id, lesson_id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS course_lesson_comments_parent_idx
  ON public.course_lesson_comments (parent_comment_id, created_at);

CREATE TABLE IF NOT EXISTS public.course_lesson_comment_likes (
  comment_id uuid NOT NULL REFERENCES public.course_lesson_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
ALTER TABLE public.course_lesson_comment_likes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.course_lesson_comment_likes TO authenticated;
GRANT ALL ON public.course_lesson_comment_likes TO service_role;

DROP POLICY IF EXISTS "Active members read comment likes" ON public.course_lesson_comment_likes;
CREATE POLICY "Active members read comment likes" ON public.course_lesson_comment_likes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.membership_status = 'active'
        AND (profiles.membership_expires_at IS NULL OR profiles.membership_expires_at > now())
    )
  );
DROP POLICY IF EXISTS "Active members like comments" ON public.course_lesson_comment_likes;
CREATE POLICY "Active members like comments" ON public.course_lesson_comment_likes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.membership_status = 'active'
        AND (profiles.membership_expires_at IS NULL OR profiles.membership_expires_at > now())
    )
  );
DROP POLICY IF EXISTS "Members remove own comment likes" ON public.course_lesson_comment_likes;
CREATE POLICY "Members remove own comment likes" ON public.course_lesson_comment_likes
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.membership_status = 'active'
        AND (profiles.membership_expires_at IS NULL OR profiles.membership_expires_at > now())
    )
  );

CREATE TABLE IF NOT EXISTS public.course_assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcourse_id uuid NOT NULL REFERENCES public.club_subcourses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  score integer NOT NULL CHECK (score >= 0),
  question_count integer NOT NULL CHECK (question_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_assessment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.course_assessment_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.course_assessment_attempts TO service_role;

CREATE TABLE IF NOT EXISTS public.course_practical_upload_tickets (
  path text PRIMARY KEY,
  subcourse_id uuid NOT NULL REFERENCES public.club_subcourses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  max_size bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);
ALTER TABLE public.course_practical_upload_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.course_practical_upload_tickets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.course_practical_upload_tickets TO service_role;

CREATE TABLE IF NOT EXISTS public.course_practical_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcourse_id uuid NOT NULL REFERENCES public.club_subcourses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evidence_path text NOT NULL UNIQUE,
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed')),
  admin_feedback text NOT NULL DEFAULT '',
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS course_practical_submissions_subcourse_created_idx
  ON public.course_practical_submissions (subcourse_id, created_at DESC);
ALTER TABLE public.course_practical_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.course_practical_submissions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.course_practical_submissions TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-practical-evidence',
  'course-practical-evidence',
  false,
  314572800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Uploads and downloads are mediated by server functions using signed storage URLs.
-- No direct object access policies are granted to browser clients.
