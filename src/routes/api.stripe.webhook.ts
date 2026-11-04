import { createFileRoute } from "@tanstack/react-router";

type StripeCheckoutSession = {
  id?: string;
  mode?: string;
  payment_status?: string;
  amount_total?: number | null;
  currency?: string;
  client_reference_id?: string | null;
  metadata?: Record<string, string | undefined> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const values = signatureHeader.split(",").map((part) => part.split("=", 2));
  const timestamp = values.find(([key]) => key === "t")?.[1];
  const signatures = values.filter(([key]) => key === "v1").map(([, value]) => value);
  const parsedTimestamp = Number(timestamp);
  if (
    !Number.isInteger(parsedTimestamp) ||
    Math.abs(Date.now() / 1000 - parsedTimestamp) > 300 ||
    signatures.length === 0
  ) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const expected = toHex(new Uint8Array(digest));
  return signatures.some((signature) => constantTimeEqual(signature, expected));
}

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
          console.error("[Stripe] STRIPE_WEBHOOK_SECRET is not configured");
          return new Response("Webhook is not configured", { status: 500 });
        }

        const signature = request.headers.get("stripe-signature");
        const payload = await request.text();
        if (!signature || !(await verifyStripeSignature(payload, signature, webhookSecret))) {
          return new Response("Invalid Stripe signature", { status: 400 });
        }

        let event: { type?: string; data?: { object?: unknown } };
        try {
          event = JSON.parse(payload) as { type?: string; data?: { object?: unknown } };
        } catch {
          return new Response("Invalid event payload", { status: 400 });
        }
        if (
          event.type !== "checkout.session.completed" &&
          event.type !== "checkout.session.async_payment_succeeded"
        ) {
          return Response.json({ received: true });
        }

        const sessionValue = event.data?.object;
        if (!isRecord(sessionValue))
          return new Response("Invalid checkout session", { status: 400 });
        const session = sessionValue as StripeCheckoutSession;
        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        const planName = session.metadata?.plan_name?.trim();
        if (
          !session.id?.startsWith("cs_") ||
          session.mode !== "payment" ||
          session.payment_status !== "paid" ||
          session.currency !== "usd" ||
          !Number.isInteger(session.amount_total) ||
          Number(session.amount_total) <= 0 ||
          !userId ||
          !/^[0-9a-f-]{36}$/i.test(userId) ||
          session.client_reference_id !== userId ||
          !planId ||
          !/^[0-9a-f-]{36}$/i.test(planId) ||
          !planName ||
          planName.length > 80
        ) {
          return Response.json({ received: true, ignored: true });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: existing, error: existingError } = await supabaseAdmin
          .from("membership_requests")
          .select("id")
          .eq("payment_method", "stripe")
          .eq("reference", session.id)
          .maybeSingle();
        if (existingError) {
          console.error("[Stripe] Could not check for a duplicate checkout", existingError);
          return new Response("Could not verify payment request", { status: 500 });
        }
        if (existing) return Response.json({ received: true });

        const { data: profile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();
        if (profileError || !profile) {
          console.error("[Stripe] Paid checkout has no matching user profile", profileError);
          return new Response("Could not verify payment owner", { status: 500 });
        }

        const { data: plan, error: planError } = await supabaseAdmin
          .from("club_membership_plans")
          .select("id, name")
          .eq("id", planId)
          .maybeSingle();
        if (planError) {
          console.error("[Stripe] Could not load the checkout plan", planError);
          return new Response("Could not load checkout plan", { status: 500 });
        }

        const { error: insertError } = await supabaseAdmin.from("membership_requests").insert({
          user_id: userId,
          plan: plan?.name ?? planName,
          amount: Number(session.amount_total) / 100,
          currency: "USD",
          membership_plan_id: plan?.id ?? null,
          status: "pending",
          payment_method: "stripe",
          country_code: "INT",
          reference: session.id,
        });
        if (insertError?.code === "23505") return Response.json({ received: true });
        if (insertError) {
          console.error("[Stripe] Could not save the paid checkout", insertError);
          return new Response("Could not save payment request", { status: 500 });
        }
        return Response.json({ received: true });
      },
    },
  },
});
