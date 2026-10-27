CREATE TABLE IF NOT EXISTS public.course_lesson_watch_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  duration_seconds double precision,
  watched_seconds double precision NOT NULL DEFAULT 0,
  last_position_seconds double precision NOT NULL DEFAULT 0,
  last_is_playing boolean NOT NULL DEFAULT false,
  last_ping_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_lesson_watch_sessions
  ADD COLUMN IF NOT EXISTS last_is_playing boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS course_lesson_watch_sessions_user_lesson_idx
  ON public.course_lesson_watch_sessions (user_id, lesson_id, created_at DESC);

ALTER TABLE public.course_lesson_watch_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.course_lesson_watch_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.course_lesson_watch_sessions TO service_role;

CREATE OR REPLACE FUNCTION public.start_course_lesson_watch(p_lesson_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_session_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Inicia sesión para ver esta lección';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_user_id
      AND membership_status = 'active'
      AND (membership_expires_at IS NULL OR membership_expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Necesitas una membresía activa para ganar Puntos de Brasa';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.course_lessons AS lessons
    JOIN public.club_subcourses AS subcourses ON subcourses.id = lessons.subcourse_id
    JOIN public.club_courses AS courses ON courses.id = lessons.course_id
    WHERE lessons.id = p_lesson_id
      AND lessons.video_url IS NOT NULL
      AND btrim(lessons.video_url) <> ''
      AND subcourses.active
      AND courses.active
  ) THEN
    RAISE EXCEPTION 'No se encontró un video disponible para completar';
  END IF;

  INSERT INTO public.course_lesson_watch_sessions (user_id, lesson_id)
  VALUES (v_user_id, p_lesson_id)
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_course_lesson_watch(
  p_session_id uuid,
  p_position_seconds double precision,
  p_duration_seconds double precision,
  p_is_playing boolean,
  p_ended boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_session public.course_lesson_watch_sessions%ROWTYPE;
  v_elapsed double precision := 0;
  v_delta double precision := 0;
  v_watched double precision;
  v_duration double precision;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Inicia sesión para registrar el avance';
  END IF;
  IF p_position_seconds IS NULL OR p_duration_seconds IS NULL
    OR p_position_seconds < 0 OR p_duration_seconds <= 0
    OR p_position_seconds > p_duration_seconds + 2
    OR p_position_seconds IN ('Infinity'::double precision, '-Infinity'::double precision)
    OR p_duration_seconds IN ('Infinity'::double precision, '-Infinity'::double precision)
    OR p_position_seconds = 'NaN'::double precision
    OR p_duration_seconds = 'NaN'::double precision THEN
    RAISE EXCEPTION 'El avance del video no es válido';
  END IF;

  SELECT *
  INTO v_session
  FROM public.course_lesson_watch_sessions
  WHERE id = p_session_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_session.ended_at IS NOT NULL
    OR v_session.created_at < now() - interval '24 hours' THEN
    RAISE EXCEPTION 'La sesión de reproducción expiró; vuelve a iniciar el video';
  END IF;

  v_duration := COALESCE(v_session.duration_seconds, p_duration_seconds);
  IF abs(v_duration - p_duration_seconds) > greatest(v_duration * 0.02, 2) THEN
    RAISE EXCEPTION 'La duración del video cambió durante la reproducción';
  END IF;

  IF v_session.last_ping_at IS NOT NULL THEN
    v_elapsed := least(
      greatest(extract(epoch FROM now() - v_session.last_ping_at), 0),
      30
    );
    v_delta := p_position_seconds - v_session.last_position_seconds;
    IF p_is_playing
      AND v_session.last_is_playing
      AND v_delta > 0
      AND v_delta <= v_elapsed * 2.2 + 0.5 THEN
      v_watched := v_session.watched_seconds + least(v_delta, v_elapsed * 2.2);
    ELSE
      v_watched := v_session.watched_seconds;
    END IF;
  ELSE
    v_watched := v_session.watched_seconds;
  END IF;

  IF p_ended THEN
    IF p_position_seconds < v_duration - 2
      OR v_watched < v_duration * 0.95 THEN
      RAISE EXCEPTION 'Reproduce el video hasta el final para completar la lección';
    END IF;
  END IF;

  UPDATE public.course_lesson_watch_sessions
  SET duration_seconds = v_duration,
      watched_seconds = v_watched,
      last_position_seconds = p_position_seconds,
      last_is_playing = p_is_playing AND NOT p_ended,
      last_ping_at = now(),
      ended_at = CASE WHEN p_ended THEN now() ELSE NULL END
  WHERE id = p_session_id;

  RETURN p_ended;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_course_lesson_after_watch(
  p_lesson_id uuid,
  p_session_id uuid
)
RETURNS TABLE (lesson_points integer, course_bonus integer, course_completed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Inicia sesión para guardar tu avance';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.course_lesson_watch_sessions AS sessions
    WHERE sessions.id = p_session_id
      AND sessions.user_id = v_user_id
      AND sessions.lesson_id = p_lesson_id
      AND sessions.ended_at IS NOT NULL
      AND sessions.duration_seconds > 0
      AND sessions.last_position_seconds >= sessions.duration_seconds - 2
      AND sessions.watched_seconds >= sessions.duration_seconds * 0.95
  ) THEN
    RAISE EXCEPTION 'Reproduce el video hasta el final antes de reclamar los Puntos de Brasa';
  END IF;

  RETURN QUERY SELECT * FROM public.complete_course_lesson(p_lesson_id);
END;
$$;

REVOKE ALL ON FUNCTION public.start_course_lesson_watch(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_course_lesson_watch(uuid, double precision, double precision, boolean, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_course_lesson_after_watch(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_course_lesson(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.start_course_lesson_watch(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_course_lesson_watch(uuid, double precision, double precision, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_course_lesson_after_watch(uuid, uuid) TO authenticated;
