ALTER TABLE public.membership_payment_settings
  ADD COLUMN IF NOT EXISTS international_qr_url text;
