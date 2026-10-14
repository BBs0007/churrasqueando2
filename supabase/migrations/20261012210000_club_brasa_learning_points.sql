ALTER TABLE public.orders
  ADD COLUMN brasa_points_redeemed integer NOT NULL DEFAULT 0,
  ADD COLUMN brasa_discount_amount numeric(10, 2) NOT NULL DEFAULT 0;

CREATE TABLE public.course_lesson_progress (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
GRANT SELECT ON public.course_lesson_progress TO authenticated;
GRANT ALL ON public.course_lesson_progress TO service_role;
ALTER TABLE public.course_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own course progress" ON public.course_lesson_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.course_completion_rewards (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.club_courses(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
GRANT SELECT ON public.course_completion_rewards TO authenticated;
GRANT ALL ON public.course_completion_rewards TO service_role;
ALTER TABLE public.course_completion_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own course completion rewards" ON public.course_completion_rewards
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.complete_course_lesson(p_lesson_id uuid)
RETURNS TABLE (lesson_points integer, course_bonus integer, course_completed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_course_id uuid;
  v_profile_points integer;
  v_new_progress integer := 0;
  v_new_course_reward integer := 0;
  v_lesson_points integer := 0;
  v_course_bonus integer := 0;
  v_course_completed boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Inicia sesión para guardar tu avance';
  END IF;

  SELECT profiles.points
  INTO v_profile_points
  FROM public.profiles
  WHERE profiles.id = v_user_id
    AND profiles.membership_status = 'active'
    AND (
      profiles.membership_expires_at IS NULL
      OR profiles.membership_expires_at > now()
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Necesitas una membresía activa para ganar Puntos de Brasa';
  END IF;

  SELECT lessons.course_id
  INTO v_course_id
  FROM public.course_lessons AS lessons
  JOIN public.club_subcourses AS subcourses
    ON subcourses.id = lessons.subcourse_id
  JOIN public.club_courses AS courses
    ON courses.id = lessons.course_id
  WHERE lessons.id = p_lesson_id
    AND lessons.video_url IS NOT NULL
    AND btrim(lessons.video_url) <> ''
    AND subcourses.active
    AND courses.active;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró un video disponible para completar';
  END IF;

  INSERT INTO public.course_lesson_progress (user_id, lesson_id)
  VALUES (v_user_id, p_lesson_id)
  ON CONFLICT (user_id, lesson_id) DO NOTHING;

  GET DIAGNOSTICS v_new_progress = ROW_COUNT;
  IF v_new_progress > 0 THEN
    v_lesson_points := 10;
    INSERT INTO public.point_transactions (user_id, points, reason)
    VALUES (v_user_id, v_lesson_points, 'Video de curso completado');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.course_lessons AS lessons
    JOIN public.club_subcourses AS subcourses
      ON subcourses.id = lessons.subcourse_id
    WHERE lessons.course_id = v_course_id
      AND lessons.video_url IS NOT NULL
      AND btrim(lessons.video_url) <> ''
      AND subcourses.active
      AND NOT EXISTS (
        SELECT 1
        FROM public.course_lesson_progress AS progress
        WHERE progress.user_id = v_user_id
          AND progress.lesson_id = lessons.id
      )
  ) AND EXISTS (
    SELECT 1
    FROM public.course_lessons AS lessons
    JOIN public.club_subcourses AS subcourses
      ON subcourses.id = lessons.subcourse_id
    WHERE lessons.course_id = v_course_id
      AND lessons.video_url IS NOT NULL
      AND btrim(lessons.video_url) <> ''
      AND subcourses.active
  ) THEN
    v_course_completed := true;
    INSERT INTO public.course_completion_rewards (user_id, course_id)
    VALUES (v_user_id, v_course_id)
    ON CONFLICT (user_id, course_id) DO NOTHING;

    GET DIAGNOSTICS v_new_course_reward = ROW_COUNT;
    IF v_new_course_reward > 0 THEN
      v_course_bonus := 50;
      INSERT INTO public.point_transactions (user_id, points, reason)
      SELECT v_user_id, v_course_bonus, 'Curso completado: ' || courses.title
      FROM public.club_courses AS courses
      WHERE courses.id = v_course_id;
    END IF;
  END IF;

  UPDATE public.profiles
  SET points = points + v_lesson_points + v_course_bonus
  WHERE id = v_user_id;

  RETURN QUERY
  SELECT v_lesson_points, v_course_bonus, v_course_completed;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_course_lesson(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_course_lesson(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_brasa_points(p_order_id uuid, p_points integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance integer;
  v_items_subtotal numeric(10, 2);
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Inicia sesión para canjear Puntos de Brasa';
  END IF;
  IF p_points <= 0 OR p_points % 100 <> 0 THEN
    RAISE EXCEPTION 'El canje debe hacerse en bloques de 100 Puntos de Brasa';
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_order.brasa_points_redeemed <> p_points
    OR v_order.brasa_discount_amount <> (p_points / 100) * 10
    OR v_order.discount_amount < v_order.brasa_discount_amount THEN
    RAISE EXCEPTION 'El canje de Puntos de Brasa no coincide con el pedido';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.point_transactions
    WHERE order_id = p_order_id
      AND reason = 'Canje de Puntos de Brasa en pedido'
  ) THEN
    RAISE EXCEPTION 'Los Puntos de Brasa de este pedido ya fueron canjeados';
  END IF;

  SELECT COALESCE(SUM((item->>'price')::numeric * (item->>'quantity')::numeric), 0)
  INTO v_items_subtotal
  FROM jsonb_array_elements(v_order.items) AS item;

  IF v_order.brasa_discount_amount > v_items_subtotal
    OR v_order.discount_amount > v_items_subtotal THEN
    RAISE EXCEPTION 'El descuento supera el subtotal de productos del pedido';
  END IF;

  SELECT points
  INTO v_balance
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_balance < p_points THEN
    RAISE EXCEPTION 'No tienes suficientes Puntos de Brasa para este canje';
  END IF;

  UPDATE public.profiles
  SET points = points - p_points
  WHERE id = v_user_id
  RETURNING points INTO v_balance;

  INSERT INTO public.point_transactions (user_id, points, reason, order_id)
  VALUES (v_user_id, -p_points, 'Canje de Puntos de Brasa en pedido', p_order_id);

  RETURN v_balance;
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_brasa_points(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_brasa_points(uuid, integer) TO authenticated;
