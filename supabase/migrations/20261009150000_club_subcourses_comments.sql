CREATE TABLE public.club_subcourses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.club_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, course_id)
);
GRANT SELECT ON public.club_subcourses TO anon, authenticated;
GRANT ALL ON public.club_subcourses TO service_role;
ALTER TABLE public.club_subcourses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active subcourses" ON public.club_subcourses
  FOR SELECT TO anon, authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage subcourses" ON public.club_subcourses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER club_subcourses_touch_updated_at BEFORE UPDATE ON public.club_subcourses
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.create_default_club_subcourse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.club_subcourses (course_id, title, description, sort_order)
  VALUES (NEW.id, 'Contenido general', 'Lecciones del curso', 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER club_courses_create_default_subcourse
AFTER INSERT ON public.club_courses
FOR EACH ROW EXECUTE FUNCTION public.create_default_club_subcourse();
REVOKE ALL ON FUNCTION public.create_default_club_subcourse() FROM PUBLIC, anon, authenticated;

INSERT INTO public.club_subcourses (course_id, title, description, sort_order)
SELECT course.id, 'Contenido general', 'Lecciones del curso', 0
FROM public.club_courses AS course
WHERE NOT EXISTS (
  SELECT 1
  FROM public.club_subcourses AS subcourse
  WHERE subcourse.course_id = course.id
);

ALTER TABLE public.course_lessons
  ADD COLUMN subcourse_id uuid;

UPDATE public.course_lessons AS lesson
SET subcourse_id = subcourse.id
FROM public.club_subcourses AS subcourse
WHERE subcourse.course_id = lesson.course_id
  AND subcourse.title = 'Contenido general';

ALTER TABLE public.course_lessons
  ALTER COLUMN subcourse_id SET NOT NULL,
  ADD CONSTRAINT course_lessons_subcourse_course_fkey
    FOREIGN KEY (subcourse_id, course_id)
    REFERENCES public.club_subcourses (id, course_id)
    ON DELETE CASCADE;

CREATE INDEX course_lessons_subcourse_sort_idx
  ON public.course_lessons (subcourse_id, sort_order);

CREATE TABLE public.course_lesson_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.course_lesson_comments TO authenticated;
GRANT ALL ON public.course_lesson_comments TO service_role;
ALTER TABLE public.course_lesson_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX course_lesson_comments_lesson_created_idx
  ON public.course_lesson_comments (lesson_id, created_at DESC);

CREATE POLICY "Members and admins read lesson comments" ON public.course_lesson_comments
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.membership_status = 'active'
        AND (
          profiles.membership_expires_at IS NULL
          OR profiles.membership_expires_at > now()
        )
    )
  );
CREATE POLICY "Active members write lesson comments" ON public.course_lesson_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.membership_status = 'active'
        AND (
          profiles.membership_expires_at IS NULL
          OR profiles.membership_expires_at > now()
        )
    )
  );
