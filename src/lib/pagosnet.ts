// ─────────────────────────────────────────────────────────────────────────
// Integración PagosNet (pasarela de pago boliviana)
//
// ⚠️ IMPORTANTE: PagosNet no publica una API pública genérica; el formato
// exacto de los endpoints, el algoritmo de firma y el payload del webhook
// te los entrega PagosNet cuando activas tu cuenta comercial y contratas
// el "Método On Line: API Web Services" (tienen un costo de integración
// único, ronda los 1.800 Bs, y piden empresa con NIT).
//
// Este archivo deja la arquitectura lista (checkout redirect + webhook de
// confirmación, que es el patrón que usa PagosNet) para que cuando tengas
// tus credenciales solo tengas que:
//   1. Rellenar las 4 variables de entorno de abajo.
//   2. Ajustar `buildCheckoutPayload` y `parseWebhookPayload` con los
//      nombres de campo exactos de la documentación que te entreguen.
//   3. Ajustar `verifySignature` con el método de firma que indiquen
//      (normalmente HMAC-SHA256 sobre ciertos campos, o un hash MD5/SHA1
//      de una cadena concatenada — varía según el manual del comercio).
// ─────────────────────────────────────────────────────────────────────────

const PAGOSNET_BASE_URL = process.env.PAGOSNET_BASE_URL || ""; // ej: https://api.pagosnet.com.bo
const PAGOSNET_MERCHANT_ID = process.env.PAGOSNET_MERCHANT_ID || "";
const PAGOSNET_API_KEY = process.env.PAGOSNET_API_KEY || "";
const PAGOSNET_WEBHOOK_SECRET = process.env.PAGOSNET_WEBHOOK_SECRET || "";

export function isPagosNetConfigured(): boolean {
  return Boolean(PAGOSNET_BASE_URL && PAGOSNET_MERCHANT_ID && PAGOSNET_API_KEY);
}

export type PagosNetCheckoutParams = {
  /** ID interno tuyo (order.id o membership_requests.id) para conciliar en el webhook */
  reference: string;
  amountBs: number;
  description: string;
  customerName: string;
  customerPhone: string;
  /** A dónde vuelve el cliente después de pagar (éxito o cancelado) */
  returnUrl: string;
};

export type PagosNetCheckoutResult = {
  ok: boolean;
  redirectUrl?: string;
  error?: string;
};

/**
 * Crea una orden de cobro en PagosNet y devuelve la URL a la que hay que
 * redirigir al cliente para que pague (tarjeta / QR / banca online, según
 * lo que hayas habilitado en tu cuenta).
 */
export async function createPagosNetCheckout(
  params: PagosNetCheckoutParams,
): Promise<PagosNetCheckoutResult> {
  if (!isPagosNetConfigured()) {
    return {
      ok: false,
      error:
        "PagosNet no está configurado todavía. Faltan PAGOSNET_BASE_URL / PAGOSNET_MERCHANT_ID / PAGOSNET_API_KEY.",
    };
  }

  try {
    // TODO: reemplazar el endpoint y el shape del body con el de la
    // documentación que te dé PagosNet (esto es un placeholder razonable
    // basado en el patrón típico de checkout redirect + webhook).
    const res = await fetch(`${PAGOSNET_BASE_URL}/v1/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PAGOSNET_API_KEY}`,
      },
      body: JSON.stringify(buildCheckoutPayload(params)),
    });

    if (!res.ok) {
      console.error("PagosNet checkout error", res.status, await res.text());
      return { ok: false, error: "No se pudo crear el cobro con PagosNet." };
    }

    const data = (await res.json()) as { checkout_url?: string; redirect_url?: string };
    const redirectUrl = data.checkout_url || data.redirect_url;
    if (!redirectUrl) return { ok: false, error: "PagosNet no devolvió una URL de pago." };

    return { ok: true, redirectUrl };
  } catch (e) {
    console.error("PagosNet fetch failed", e);
    return { ok: false, error: "No se pudo conectar con PagosNet." };
  }
}

function buildCheckoutPayload(params: PagosNetCheckoutParams) {
  // TODO: ajustar nombres de campo según el manual técnico de PagosNet.
  return {
    merchant_id: PAGOSNET_MERCHANT_ID,
    external_reference: params.reference,
    amount: params.amountBs,
    currency: "BOB",
    description: params.description,
    customer: {
      name: params.customerName,
      phone: params.customerPhone,
    },
    return_url: params.returnUrl,
  };
}

export type PagosNetWebhookEvent = {
  reference: string;
  status: "paid" | "failed" | "pending";
  transactionId: string;
  amountBs: number;
};

/**
 * Verifica la firma del webhook. PagosNet debería incluir algún header
 * (ej. X-PagosNet-Signature) o un campo de firma en el body — ajusta esto
 * con el método exacto que te indiquen antes de confiar en producción.
 */
export function verifyPagosNetSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!PAGOSNET_WEBHOOK_SECRET) return false;
  if (!signatureHeader) return false;
  // TODO: reemplazar por el algoritmo real (ej. HMAC-SHA256(rawBody, secret) === signatureHeader).
  return true;
}

export function parseWebhookPayload(body: any): PagosNetWebhookEvent | null {
  // TODO: mapear a los nombres de campo reales del webhook de PagosNet.
  if (!body?.external_reference) return null;
  return {
    reference: body.external_reference,
    status: body.status === "approved" || body.status === "paid" ? "paid" : body.status === "failed" ? "failed" : "pending",
    transactionId: body.transaction_id ?? body.id ?? "",
    amountBs: Number(body.amount ?? 0),
  };
}
