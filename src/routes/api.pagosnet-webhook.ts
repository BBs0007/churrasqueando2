import { createFileRoute } from "@tanstack/react-router";
import { verifyPagosNetSignature, parseWebhookPayload } from "@/lib/pagosnet";

// PagosNet debe llamar a POST /api/pagosnet-webhook cuando un cobro se
// confirma. Aquí marcamos el pedido/solicitud como pagado y, si es una
// membresía, la activamos automáticamente (reemplaza la aprobación manual
// del admin cuando el pago fue online).
export const Route = createFileRoute("/api/pagosnet-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-pagosnet-signature");

        if (!verifyPagosNetSignature(rawBody, signature)) {
          return new Response("invalid signature", { status: 401 });
        }

        let json: any;
        try {
          json = JSON.parse(rawBody);
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const event = parseWebhookPayload(json);
        if (!event) return new Response("ignored", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1) ¿Es un pedido de productos?
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id")
          .eq("id", event.reference)
          .maybeSingle();

        if (order) {
          await supabaseAdmin
            .from("orders")
            .update({
              payment_status: event.status,
              payment_reference: event.transactionId,
              status: event.status === "paid" ? "confirmed" : "pending",
            })
            .eq("id", order.id);
          return new Response("ok", { status: 200 });
        }

        // 2) ¿Es una solicitud de membresía?
        const { data: membershipRequest } = await supabaseAdmin
          .from("membership_requests")
          .select("id, user_id")
          .eq("id", event.reference)
          .maybeSingle();

        if (membershipRequest) {
          await supabaseAdmin
            .from("membership_requests")
            .update({
              payment_status: event.status,
              payment_reference: event.transactionId,
              status: event.status === "paid" ? "approved" : "pending",
              reviewed_at: event.status === "paid" ? new Date().toISOString() : null,
            })
            .eq("id", membershipRequest.id);

          if (event.status === "paid") {
            const expires = new Date();
            expires.setMonth(expires.getMonth() + 1);
            await supabaseAdmin
              .from("profiles")
              .update({
                membership_status: "active",
                membership_expires_at: expires.toISOString(),
              })
              .eq("id", membershipRequest.user_id);
          }
          return new Response("ok", { status: 200 });
        }

        return new Response("not found", { status: 404 });
      },
    },
  },
});
