import { createServerFn } from "@tanstack/react-start";

export type OrderItemInput = {
  name: string;
  quantity: number;
  price: number;
  unit: string;
};

export type OrderInput = {
  customerName: string;
  customerPhone: string;
  // Whether the customer is logged in. When true, the order is saved
  // separately (with points) via recordOrder, so we skip the guest insert
  // here to avoid a duplicate row in admin sales.
  hasAccount?: boolean;
  deliveryType: "delivery" | "pickup" | "province";
  address?: string;
  lat?: number;
  lng?: number;
  department?: string;
  province?: string;
  town?: string;
  shippingMethod?: "bidmodal" | "avion" | "trufi";
  coolerSize?: string;
  notes?: string;
  items: OrderItemInput[];
  total: number;
  discountCode?: string;
  discountAmount?: number;
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
    if (data.shippingMethod) {
      const shippingLabels = {
        bidmodal: "Terminal Bimodal / flota (desde 50 Bs, no incluido en el total)",
        avion: "Por avión (desde 90 Bs, no incluido en el total)",
        trufi: "Trufi (desde 40 Bs, no incluido en el total)",
      } as const;
      lines.push(`*Medio de transporte:* ${shippingLabels[data.shippingMethod]}`);
    }
    if (data.coolerSize) lines.push(`*Conservadora (incluida en el total):* ${data.coolerSize}`);
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
  if (data.discountAmount && data.discountAmount > 0) {
    lines.push(
      `*Descuento${data.discountCode ? ` (${data.discountCode})` : ""}:* -${data.discountAmount} Bs`,
    );
  }
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

    // Record every sale made through the website — including guest checkouts
    // without an account — so admins can see it under Ventas. Logged-in
    // customers get their order saved (with points) via recordOrder instead,
    // so we skip this insert for them to avoid a duplicate row.
    if (!data.hasAccount) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("orders").insert({
          user_id: null,
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
          points_earned: 0,
          discount_code: data.discountCode ?? null,
          discount_amount: data.discountAmount ?? 0,
          source: "web-guest",
        });
      } catch (e) {
        console.error("No se pudo registrar la venta de invitado", e);
      }
    }

    return {
      autoSent: toBusiness,
      sentToBusiness: toBusiness,
      sentToCustomer: false,
      businessWhatsappUrl,
      message,
    };
  });
