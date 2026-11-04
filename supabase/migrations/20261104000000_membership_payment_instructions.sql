ALTER TABLE public.membership_payment_settings
  ADD COLUMN IF NOT EXISTS bolivia_instructions text NOT NULL DEFAULT '';
