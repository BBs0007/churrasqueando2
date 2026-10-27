CREATE TABLE public.club_discount_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  value numeric(10,2) NOT NULL CHECK (value >= 0),
  scope text NOT NULL CHECK (scope IN ('all', 'products', 'categories')),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (discount_type <> 'percentage' OR value <= 100),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at)
);

CREATE TABLE public.club_discount_campaign_products (
  campaign_id uuid NOT NULL REFERENCES public.club_discount_campaigns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, product_id)
);

CREATE TABLE public.club_discount_campaign_categories (
  campaign_id uuid NOT NULL REFERENCES public.club_discount_campaigns(id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, category_id)
);

CREATE TABLE public.club_discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.club_discount_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  redeemed_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  redeemed_discount_amount numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id),
  CHECK (
    (redeemed_at IS NULL AND redeemed_discount_amount IS NULL) OR
    (redeemed_at IS NOT NULL AND redeemed_discount_amount IS NOT NULL)
  )
);

CREATE INDEX club_discount_campaigns_active_dates
  ON public.club_discount_campaigns (active, starts_at, ends_at);
CREATE INDEX club_discount_codes_user_campaign
  ON public.club_discount_codes (user_id, campaign_id);
CREATE INDEX club_discount_codes_redemptions
  ON public.club_discount_codes (redeemed_at DESC)
  WHERE redeemed_at IS NOT NULL;

ALTER TABLE public.club_discount_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_discount_campaign_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_discount_campaign_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_discount_codes ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.club_discount_campaigns TO service_role;
GRANT ALL ON public.club_discount_campaign_products TO service_role;
GRANT ALL ON public.club_discount_campaign_categories TO service_role;
GRANT ALL ON public.club_discount_codes TO service_role;

CREATE POLICY "Admins manage Club discount campaigns"
  ON public.club_discount_campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage Club discount products"
  ON public.club_discount_campaign_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage Club discount categories"
  ON public.club_discount_campaign_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage Club discount codes"
  ON public.club_discount_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER club_discount_campaigns_touch_updated_at
  BEFORE UPDATE ON public.club_discount_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.admin_upsert_club_discount_campaign(
  p_admin_user_id uuid,
  p_campaign_id uuid,
  p_title text,
  p_description text,
  p_discount_type text,
  p_value numeric,
  p_scope text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_active boolean,
  p_product_ids uuid[],
  p_category_ids text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id uuid;
BEGIN
  IF NOT public.has_role(p_admin_user_id, 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_campaign_id IS NULL THEN
    INSERT INTO public.club_discount_campaigns (
      title, description, discount_type, value, scope, starts_at, ends_at, active, created_by
    )
    VALUES (
      p_title, p_description, p_discount_type, p_value, p_scope, p_starts_at, p_ends_at, p_active,
      p_admin_user_id
    )
    RETURNING id INTO v_campaign_id;
  ELSE
    UPDATE public.club_discount_campaigns
    SET title = p_title,
        description = p_description,
        discount_type = p_discount_type,
        value = p_value,
        scope = p_scope,
        starts_at = p_starts_at,
        ends_at = p_ends_at,
        active = p_active
    WHERE id = p_campaign_id
    RETURNING id INTO v_campaign_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se encontró la promoción del Club';
    END IF;
  END IF;

  DELETE FROM public.club_discount_campaign_products
  WHERE campaign_id = v_campaign_id;
  DELETE FROM public.club_discount_campaign_categories
  WHERE campaign_id = v_campaign_id;

  IF p_scope = 'products' THEN
    INSERT INTO public.club_discount_campaign_products (campaign_id, product_id)
    SELECT v_campaign_id, selected.product_id
    FROM unnest(COALESCE(p_product_ids, ARRAY[]::uuid[])) AS selected(product_id);
  ELSIF p_scope = 'categories' THEN
    INSERT INTO public.club_discount_campaign_categories (campaign_id, category_id)
    SELECT v_campaign_id, selected.category_id
    FROM unnest(COALESCE(p_category_ids, ARRAY[]::text[])) AS selected(category_id);
  END IF;

  IF p_campaign_id IS NULL THEN
    INSERT INTO public.club_discount_codes (campaign_id, user_id, code)
    SELECT
      v_campaign_id,
      profiles.id,
      'CLUB' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
    FROM public.profiles
    WHERE profiles.membership_status = 'active'
      AND (
        profiles.membership_expires_at IS NULL
        OR profiles.membership_expires_at > now()
      )
    ON CONFLICT (campaign_id, user_id) DO NOTHING;
  END IF;

  RETURN v_campaign_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_upsert_club_discount_campaign(
  uuid, uuid, text, text, text, numeric, text, timestamptz, timestamptz, boolean, uuid[], text[]
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_club_discount_campaign(
  uuid, uuid, text, text, text, numeric, text, timestamptz, timestamptz, boolean, uuid[], text[]
) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_club_discount_checkout(
  p_order_id uuid,
  p_user_id uuid,
  p_member_code text,
  p_points integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_code public.club_discount_codes%ROWTYPE;
  v_campaign public.club_discount_campaigns%ROWTYPE;
  v_subtotal numeric(10,2);
  v_eligible_subtotal numeric(10,2);
  v_expected_discount numeric(10,2);
  v_order_discount numeric(10,2);
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Inicia sesión con la cuenta del socio para usar este código';
  END IF;
  IF p_points < 0 OR p_points % 100 <> 0 THEN
    RAISE EXCEPTION 'La cantidad de Puntos de Brasa no es válida';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND user_id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el pedido de esta cuenta';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el perfil del socio';
  END IF;

  SELECT COALESCE(SUM((item->>'price')::numeric * (item->>'quantity')::numeric), 0)
  INTO v_subtotal
  FROM jsonb_array_elements(v_order.items) AS item;

  IF p_points > 0 THEN
    IF v_order.brasa_points_redeemed <> p_points
      OR v_order.brasa_discount_amount <> (p_points / 100) * 10
      OR v_order.discount_amount < v_order.brasa_discount_amount
      OR v_order.brasa_discount_amount > v_subtotal
      OR v_order.discount_amount > v_subtotal
    THEN
      RAISE EXCEPTION 'El canje de Puntos de Brasa no coincide con el pedido';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.point_transactions
      WHERE order_id = p_order_id
        AND reason = 'Canje de Puntos de Brasa en pedido'
    ) THEN
      RAISE EXCEPTION 'Los Puntos de Brasa de este pedido ya fueron canjeados';
    END IF;

    IF v_profile.points < p_points THEN
      RAISE EXCEPTION 'No tienes suficientes Puntos de Brasa para este canje';
    END IF;
  ELSIF v_order.brasa_points_redeemed <> 0 OR v_order.brasa_discount_amount <> 0 THEN
    RAISE EXCEPTION 'El canje de Puntos de Brasa no coincide con el pedido';
  END IF;

  IF p_member_code IS NOT NULL THEN
    SELECT * INTO v_code
    FROM public.club_discount_codes
    WHERE code = upper(trim(p_member_code))
      AND user_id = p_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Este código no corresponde a tu cuenta';
    END IF;
    IF v_code.redeemed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Este código ya fue utilizado';
    END IF;
    IF v_order.discount_code IS DISTINCT FROM v_code.code THEN
      RAISE EXCEPTION 'El código no coincide con el pedido';
    END IF;

    SELECT * INTO v_campaign
    FROM public.club_discount_campaigns
    WHERE id = v_code.campaign_id;
    IF NOT FOUND OR NOT v_campaign.active
      OR (v_campaign.starts_at IS NOT NULL AND v_campaign.starts_at > now())
      OR (v_campaign.ends_at IS NOT NULL AND v_campaign.ends_at < now())
    THEN
      RAISE EXCEPTION 'Esta promoción ya no está disponible';
    END IF;
    IF v_profile.membership_status <> 'active'
      OR (v_profile.membership_expires_at IS NOT NULL AND v_profile.membership_expires_at <= now())
    THEN
      RAISE EXCEPTION 'Se requiere una membresía activa para usar este código';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_order.items) AS item
      LEFT JOIN public.products p
        ON p.id::text = item->>'id' AND p.active
      LEFT JOIN public.combos c
        ON c.id = item->>'id' AND c.active
      WHERE (p.id IS NULL AND c.id IS NULL)
        OR (p.id IS NOT NULL AND (item->>'price')::numeric <> p.price)
        OR (c.id IS NOT NULL AND (item->>'price')::numeric <> c.price)
        OR (item->>'quantity')::numeric <= 0
    ) THEN
      RAISE EXCEPTION 'Los precios o productos del pedido cambiaron; vuelve a revisar tu carrito';
    END IF;
    IF v_order.total + 0.01 < greatest(0, v_subtotal - v_order.discount_amount) THEN
      RAISE EXCEPTION 'El total del pedido no coincide con los productos y descuentos';
    END IF;

    SELECT COALESCE(SUM(
      CASE
        WHEN v_campaign.scope = 'all' THEN COALESCE(p.price, c.price) * (item->>'quantity')::numeric
        WHEN v_campaign.scope = 'products' AND cp.product_id IS NOT NULL
          THEN p.price * (item->>'quantity')::numeric
        WHEN v_campaign.scope = 'categories' AND cc.category_id IS NOT NULL
          THEN p.price * (item->>'quantity')::numeric
        ELSE 0
      END
    ), 0)
    INTO v_eligible_subtotal
    FROM jsonb_array_elements(v_order.items) AS item
    LEFT JOIN public.products p
      ON p.id::text = item->>'id' AND p.active
    LEFT JOIN public.combos c
      ON c.id = item->>'id' AND c.active
    LEFT JOIN public.club_discount_campaign_products cp
      ON cp.campaign_id = v_campaign.id AND cp.product_id = p.id
    LEFT JOIN public.club_discount_campaign_categories cc
      ON cc.campaign_id = v_campaign.id AND cc.category_id = p.category_id;

    IF v_eligible_subtotal <= 0 THEN
      RAISE EXCEPTION 'Esta promoción no aplica a los productos del pedido';
    END IF;

    v_expected_discount := CASE
      WHEN v_campaign.discount_type = 'percentage'
        THEN round(v_eligible_subtotal * v_campaign.value / 100, 2)
      ELSE least(v_campaign.value, v_eligible_subtotal)
    END;
    v_order_discount := v_order.discount_amount - v_order.brasa_discount_amount;
    IF v_order_discount <> v_expected_discount THEN
      RAISE EXCEPTION 'El descuento de la promoción no coincide con el pedido';
    END IF;

    UPDATE public.club_discount_codes
    SET redeemed_at = now(),
        redeemed_order_id = p_order_id,
        redeemed_discount_amount = v_expected_discount
    WHERE id = v_code.id;
  END IF;

  IF p_points > 0 THEN
    UPDATE public.profiles
    SET points = points - p_points
    WHERE id = p_user_id
    RETURNING points INTO v_profile.points;

    INSERT INTO public.point_transactions (user_id, points, reason, order_id)
    VALUES (p_user_id, -p_points, 'Canje de Puntos de Brasa en pedido', p_order_id);
  END IF;

  RETURN v_profile.points;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_club_discount_checkout(uuid, uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_club_discount_checkout(uuid, uuid, text, integer)
  TO service_role;
