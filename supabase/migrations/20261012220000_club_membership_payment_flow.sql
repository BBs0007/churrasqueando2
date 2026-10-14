ALTER TABLE public.membership_requests
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'bolivia_qr'
    CHECK (payment_method IN ('bolivia_qr', 'binance'));

ALTER TABLE public.membership_requests
  ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'BO'
    CHECK (country_code IN ('BO', 'INT'));

CREATE INDEX IF NOT EXISTS membership_requests_pending_created_idx
  ON public.membership_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.membership_payment_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  bolivia_qr_url text,
  international_instructions text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.membership_payment_settings TO anon, authenticated;
GRANT ALL ON public.membership_payment_settings TO service_role;
ALTER TABLE public.membership_payment_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read membership payment settings" ON public.membership_payment_settings;
CREATE POLICY "Public read membership payment settings" ON public.membership_payment_settings
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage membership payment settings" ON public.membership_payment_settings;
CREATE POLICY "Admins manage membership payment settings" ON public.membership_payment_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.membership_payment_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('membership-payments', 'membership-payments', true, 5242880,
        ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read membership payment QR" ON storage.objects;
CREATE POLICY "Public read membership payment QR" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'membership-payments');
DROP POLICY IF EXISTS "Admins upload membership payment QR" ON storage.objects;
CREATE POLICY "Admins upload membership payment QR" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'membership-payments' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update membership payment QR" ON storage.objects;
CREATE POLICY "Admins update membership payment QR" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'membership-payments' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete membership payment QR" ON storage.objects;
CREATE POLICY "Admins delete membership payment QR" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'membership-payments' AND public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.review_membership_request(p_request_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
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
  RETURNING user_id INTO v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La solicitud no existe o ya fue revisada';
  END IF;

  IF p_approve THEN
    UPDATE public.profiles
    SET membership_status = 'active',
        membership_expires_at = now() + interval '1 year'
    WHERE id = v_user_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.review_membership_request(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_membership_request(uuid, boolean) TO authenticated;
