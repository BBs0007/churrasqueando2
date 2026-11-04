ALTER TABLE public.membership_requests
  DROP CONSTRAINT IF EXISTS membership_requests_payment_method_check;

ALTER TABLE public.membership_requests
  ADD CONSTRAINT membership_requests_payment_method_check
  CHECK (payment_method IN ('bolivia_qr', 'binance', 'stripe')) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS membership_requests_stripe_reference_uidx
  ON public.membership_requests (reference)
  WHERE payment_method = 'stripe' AND reference IS NOT NULL;
