CREATE TABLE public.club_membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  interval text NOT NULL CHECK (interval IN ('monthly', 'quarterly', 'annual')),
  duration_days integer NOT NULL CHECK (duration_days BETWEEN 1 AND 3660),
  price numeric(10,2) NOT NULL CHECK (price > 0),
  currency text NOT NULL DEFAULT 'Bs' CHECK (currency IN ('Bs', 'USD')),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX club_membership_plans_active_sort_idx
  ON public.club_membership_plans (active, sort_order, created_at);
ALTER TABLE public.club_membership_plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.club_membership_plans TO anon, authenticated;
GRANT ALL ON public.club_membership_plans TO service_role;
CREATE POLICY "Anyone can read active membership plans" ON public.club_membership_plans
  FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage membership plans" ON public.club_membership_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER club_membership_plans_touch_updated_at
  BEFORE UPDATE ON public.club_membership_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.profiles
  ADD COLUMN membership_plan_id uuid REFERENCES public.club_membership_plans(id) ON DELETE SET NULL;
ALTER TABLE public.membership_requests
  ADD COLUMN membership_plan_id uuid REFERENCES public.club_membership_plans(id) ON DELETE SET NULL,
  ADD COLUMN currency text NOT NULL DEFAULT 'Bs' CHECK (currency IN ('Bs', 'USD'));

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, email, phone, address, birth_date) ON public.profiles TO authenticated;
REVOKE INSERT ON public.profiles FROM authenticated;

INSERT INTO public.club_membership_plans (name, interval, duration_days, price, currency, sort_order)
SELECT
  'Anual fundador',
  'annual',
  365,
  COALESCE(
    (
      SELECT CASE
        WHEN value ~ '^[0-9]+([.][0-9]+)?$' THEN value::numeric
        ELSE 450
      END
      FROM public.club_content
      WHERE key = 'membership_annual_price'
    ),
    450
  ),
  'Bs',
  0
WHERE NOT EXISTS (SELECT 1 FROM public.club_membership_plans);

UPDATE public.profiles AS profile
SET membership_plan_id = plans.id
FROM public.club_membership_plans AS plans
WHERE profile.membership_status = 'active'
  AND profile.membership_plan_id IS NULL
  AND plans.interval = 'annual';

UPDATE public.membership_requests AS request
SET membership_plan_id = plans.id
FROM public.club_membership_plans AS plans
WHERE request.plan = 'annual'
  AND request.membership_plan_id IS NULL
  AND plans.interval = 'annual';

CREATE OR REPLACE FUNCTION public.review_membership_request(p_request_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_plan_id uuid;
  v_duration_days integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.membership_requests
  SET status = CASE WHEN p_approve THEN 'approved'::public.request_status
                    ELSE 'rejected'::public.request_status END,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_request_id
    AND status = 'pending'
  RETURNING user_id, membership_plan_id INTO v_user_id, v_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La solicitud no existe o ya fue revisada';
  END IF;

  IF p_approve THEN
    SELECT duration_days INTO v_duration_days
    FROM public.club_membership_plans
    WHERE id = v_plan_id;

    UPDATE public.profiles
    SET membership_status = 'active',
        membership_plan_id = v_plan_id,
        membership_expires_at =
          GREATEST(now(), COALESCE(membership_expires_at, now()))
          + make_interval(days => COALESCE(v_duration_days, 365))
    WHERE id = v_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.review_membership_request(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_membership_request(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_activate_customer_membership(
  p_customer_id uuid,
  p_plan_id uuid,
  p_payment_confirmed boolean,
  p_payment_method text,
  p_country_code text,
  p_reference text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.club_membership_plans%ROWTYPE;
  v_status public.membership_status;
  v_expires_at timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NOT p_payment_confirmed THEN
    RAISE EXCEPTION 'Confirma el pago antes de activar la membresía';
  END IF;
  IF p_payment_method NOT IN ('bolivia_qr', 'binance')
    OR p_country_code NOT IN ('BO', 'INT') THEN
    RAISE EXCEPTION 'El método de pago no es válido';
  END IF;
  IF (p_country_code = 'BO' AND p_payment_method <> 'bolivia_qr')
    OR (p_country_code = 'INT' AND p_payment_method <> 'binance') THEN
    RAISE EXCEPTION 'El método de pago no corresponde al país';
  END IF;

  SELECT * INTO v_plan
  FROM public.club_membership_plans
  WHERE id = p_plan_id AND active
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El plan no existe o está desactivado';
  END IF;
  IF v_plan.currency = 'USD' AND p_country_code <> 'INT' THEN
    RAISE EXCEPTION 'Los planes en USD deben pagarse con un método internacional';
  END IF;

  SELECT membership_status, membership_expires_at
  INTO v_status, v_expires_at
  FROM public.profiles
  WHERE id = p_customer_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el perfil del cliente';
  END IF;

  INSERT INTO public.membership_requests (
    user_id, plan, amount, currency, membership_plan_id, status,
    payment_method, country_code, reference, reviewed_by, reviewed_at
  )
  VALUES (
    p_customer_id, v_plan.name, v_plan.price, v_plan.currency, v_plan.id,
    'approved', p_payment_method, p_country_code, NULLIF(trim(p_reference), ''),
    auth.uid(), now()
  );

  UPDATE public.profiles
  SET membership_status = 'active',
      membership_plan_id = v_plan.id,
      membership_expires_at =
        GREATEST(now(), COALESCE(v_expires_at, now()))
        + make_interval(days => v_plan.duration_days)
  WHERE id = p_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_activate_customer_membership(uuid, uuid, boolean, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_activate_customer_membership(uuid, uuid, boolean, text, text, text)
  TO authenticated;
