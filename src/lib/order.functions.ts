import { createServerFn } from "@tanstack/react-start";
import { createPagosNetCheckout } from "@/lib/pagosnet";

export type OrderItemInput = {
  name: string;
  quantity: number;
  price: number;
  unit: string;
};

export type OrderInput = {
  customerName: string;
  customerPhone: string;
  deliveryType: "delivery" | "pickup" | "province";
  address?: string;
  lat?: number;
  lng?: number;
  department?: string;
  province?: string;
  town?: string;
  notes?: string;
  items: OrderItemInput[];
  total: number;
};

export type OrderResult = {
  autoSent: boolean;
  sentToBusiness: boolean;
  sentToCustomer: boolean;
  businessWhatsappUrl: string;
  message: string;
};

function buildMessage(data: OrderInput): string {
  const lines: string[] = [];
  lines.push("*NUEVO PEDIDO — CHURRASQUEANDO* 🔥");
  lines.push("");
  lines.push(`*Cliente:* ${data.customerName}`);
  lines.push(`*Teléfono:* ${data.customerPhone}`);
  if (data.deliveryType === "delivery") {
    lines.push("*Entrega:* A domicilio 🛵");
    if (data.address) lines.push(`*Dirección:* ${data.address}`);
    if (data.lat != null && data.lng != null) {
      lines.push(`*Ubicación:* https://www.google.com/maps?q=${data.lat},${data.lng}`);
    }
  } else if (data.deliveryType === "province") {
    lines.push("*Entrega:* Envío a provincias 🚚");
    if (data.department) lines.push(`*Departamento:* ${data.department}`);
    if (data.province) lines.push(`*Provincia:* ${data.province}`);
    if (data.town) lines.push(`*Pueblo/Municipio:* ${data.town}`);
    if (data.address) lines.push(`*Referencia:* ${data.address}`);
  } else {
    lines.push("*Entrega:* Recoger en el local 🏠");
  }
  if (data.notes) lines.push(`*Notas:* ${data.notes}`);
  lines.push("");
  lines.push("*Productos:*");
  for (const it of data.items) {
    lines.push(`• ${it.quantity}x ${it.name} (${it.unit}) — ${it.price * it.quantity} Bs`);
  }
  lines.push("");
  lines.push(`*TOTAL: ${data.total} Bs*`);
  return lines.join("\n");
}

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio/Messages.json";

function toWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `whatsapp:+${digits}`;
}

async function sendWhatsApp(params: {
  to: string;
  body: string;
  mediaUrl?: string;
}): Promise<boolean> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.TWILIO_API_KEY;
  const from = process.env.TWILIO_WHATSAPP_FROM; // ej: whatsapp:+14155238886

  if (!lovableKey || !twilioKey || !from) return false;

  const body = new URLSearchParams({
    To: params.to,
    From: from,
    Body: params.body,
  });
  if (params.mediaUrl) body.set("MediaUrl", params.mediaUrl);

  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      console.error("Twilio error", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("Twilio fetch failed", e);
    return false;
  }
}

type AutoSendResult = { toBusiness: boolean; toCustomer: boolean };

async function trySendWhatsApp(data: OrderInput, message: string): Promise<AutoSendResult> {
  const businessNumber = process.env.BUSINESS_WHATSAPP || "59175358008";

  // Pedido completo al número de la empresa
  const toBusiness = await sendWhatsApp({
    to: toWhatsApp(businessNumber),
    body: message,
  });

  return { toBusiness, toCustomer: false };
}

export type OnlinePaymentResult =
  | { ok: true; redirectUrl: string; orderId: string }
  | { ok: false; error: string };

// Crea el pedido en la base de datos y devuelve la URL de PagosNet para
// que el cliente pague en línea (tarjeta / QR / banca) en vez de coordinar
// por WhatsApp. Funciona con o sin sesión iniciada.
export const startOnlinePayment = createServerFn({ method: "POST" })
  .inputValidator((data: OrderInput & { userId?: string | null; returnUrl: string }) => {
    if (!data.customerName?.trim()) throw new Error("Falta el nombre");
    if (!data.customerPhone?.trim()) throw new Error("Falta el teléfono");
    if (!data.items?.length) throw new Error("El pedido está vacío");
    if (!data.returnUrl) throw new Error("Falta returnUrl");
    return data;
  })
  .handler(async ({ data }): Promise<OnlinePaymentResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: data.userId ?? null,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        delivery_type: data.deliveryType,
        address: data.address ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        department: data.department ?? null,
        province: data.province ?? null,
        town: data.town ?? null,
        notes: data.notes ?? null,
        items: data.items,
        total: data.total,
        payment_method: "pagosnet",
        payment_status: "pending",
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: "No se pudo registrar el pedido." };

    const checkout = await createPagosNetCheckout({
      reference: order.id,
      amountBs: data.total,
      description: `Pedido Churrasqueando #${order.id.slice(0, 8)}`,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      returnUrl: `${data.returnUrl}?orderId=${order.id}`,
    });

    if (!checkout.ok || !checkout.redirectUrl) {
      return { ok: false, error: checkout.error || "No se pudo iniciar el pago en línea." };
    }

    return { ok: true, redirectUrl: checkout.redirectUrl, orderId: order.id };
  });

// Consulta el estado de pago de un pedido (para la pantalla de retorno).
export const getOrderPaymentStatus = createServerFn({ method: "GET" })
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, payment_status, total")
      .eq("id", data.orderId)
      .maybeSingle();
    return { status: order?.payment_status ?? "unknown" };
  });

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((data: OrderInput) => {
    if (!data.customerName?.trim()) throw new Error("Falta el nombre");
    if (!data.customerPhone?.trim()) throw new Error("Falta el teléfono");
    if (!data.items?.length) throw new Error("El pedido está vacío");
    return data;
  })
  .handler(async ({ data }): Promise<OrderResult> => {
    const message = buildMessage(data);
    const businessNumber = process.env.BUSINESS_WHATSAPP || "59175358008";
    const { toBusiness } = await trySendWhatsApp(data, message);
    const businessWhatsappUrl = `https://wa.me/${businessNumber}?text=${encodeURIComponent(message)}`;
    return {
      autoSent: toBusiness,
      sentToBusiness: toBusiness,
      sentToCustomer: false,
      businessWhatsappUrl,
      message,
    };
  });
