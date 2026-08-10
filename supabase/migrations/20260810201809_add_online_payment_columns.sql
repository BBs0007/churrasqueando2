-- Soporte para pago en línea (PagosNet) además de la coordinación por WhatsApp.
-- payment_method: 'whatsapp' (coordinado manualmente) | 'pagosnet' (pasarela online)
-- payment_status: 'pending' | 'paid' | 'failed'

ALTER TABLE public.orders
  ADD COLUMN payment_method text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN payment_reference text;

ALTER TABLE public.membership_requests
  ADD COLUMN payment_method text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN payment_reference text;

-- El webhook de PagosNet actualiza estas filas con la service_role key (ya tiene ALL).
-- No se requieren policies nuevas: las columnas se leen/escriben igual que el resto de la fila.
