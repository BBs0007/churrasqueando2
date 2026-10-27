import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CLUB } from "@/lib/club";
import type { Database } from "@/integrations/supabase/types";

export type ClubProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  birth_date: string | null;
  avatar_url: string | null;
  points: number;
  membership_status: "inactive" | "active" | "expired";
  membership_expires_at: string | null;
  membership_plan_id: string | null;
};

export type ClubOrder = {
  id: string;
  total: number;
  status: string;
  delivery_type: string;
  created_at: string;
  items: { id: string; name: string; quantity: number; price: number; unit?: string }[];
};

export type ClubTransaction = {
  id: string;
  points: number;
  reason: string;
  created_at: string;
};

export type ClubRequest = {
  id: string;
  plan: string;
  amount: number;
  currency: string;
  membership_plan_id: string | null;
  status: "pending" | "approved" | "rejected";
  payment_method: "bolivia_qr" | "binance";
  country_code: "BO" | "INT";
  created_at: string;
};

export const getMyClub = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (context.claims as { email?: string })?.email ?? "";

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();

    let profile = existing;
    if (!profile) {
      const meta =
        (context.claims as { user_metadata?: Record<string, unknown> })?.user_metadata ?? {};
      const { data: created, error } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: context.userId,
          email,
          full_name: typeof meta.full_name === "string" ? meta.full_name : "",
          phone: typeof meta.phone === "string" ? meta.phone : "",
          address: typeof meta.address === "string" ? meta.address : "",
          birth_date:
            typeof meta.birth_date === "string" && meta.birth_date ? meta.birth_date : null,
        })
        .select("*")
        .single();
      if (error) throw error;
      profile = created;
    } else if (email && profile.email !== email) {
      await supabaseAdmin.from("profiles").update({ email }).eq("id", context.userId);
      profile.email = email;
    }

    const [orders, transactions, requests, roles] = await Promise.all([
      context.supabase
        .from("orders")
        .select("id, total, status, delivery_type, created_at, items")
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("point_transactions")
        .select("id, points, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("membership_requests")
        .select(
          "id, plan, amount, currency, membership_plan_id, status, payment_method, country_code, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(10),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);

    const isActive =
      profile.membership_status === "active" &&
      (!profile.membership_expires_at || new Date(profile.membership_expires_at) > new Date());

    return {
      profile: profile as ClubProfile,
      isMember: isActive,
      isAdmin: (roles.data ?? []).some((r) => r.role === "admin"),
      orders: (orders.data ?? []) as unknown as ClubOrder[],
      transactions: (transactions.data ?? []) as ClubTransaction[],
      requests: (requests.data ?? []) as ClubRequest[],
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { fullName: string; phone: string; address: string; birthDate: string }) => {
      const fullName = input.fullName?.trim() ?? "";
      const phone = input.phone?.trim() ?? "";
      const address = input.address?.trim() ?? "";
      const birthDate = input.birthDate?.trim() || null;
      if (fullName.length > 120 || phone.length > 30 || address.length > 200) {
        throw new Error("Datos demasiado largos");
      }
      return { fullName, phone, address, birthDate };
    },
  )
  .handler(async ({ data, context }) => {
    const { data: updatedProfile, error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone,
        address: data.address,
        birth_date: data.birthDate,
      })
      .eq("id", context.userId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!updatedProfile) throw new Error("No se encontró el perfil para actualizar");
    return { ok: true };
  });

export const uploadMyAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileName: string; dataUrl: string }) => {
    if (!input?.dataUrl?.startsWith("data:")) throw new Error("Imagen inválida");
    if (input.dataUrl.length > 6_000_000) throw new Error("La imagen es demasiado grande");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const match = data.dataUrl.match(/^data:(.+);base64,(.*)$/);
    if (!match) throw new Error("Imagen inválida");
    const contentType = match[1];
    const bytes = Buffer.from(match[2], "base64");
    const ext = (data.fileName.split(".").pop() || "jpg").toLowerCase();
    const path = `${context.userId}/avatar.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("avatars")
      .upload(path, bytes, { contentType, upsert: true });
    if (upErr) throw upErr;

    const { data: pub } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", context.userId);
    if (error) throw error;

    return { ok: true, url };
  });

export const requestMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      planId: string;
      paymentMethod: "bolivia_qr" | "binance";
      countryCode: "BO" | "INT";
    }) => {
      if (!/^[0-9a-f-]{36}$/i.test(input?.planId ?? "")) {
        throw new Error("Selecciona un plan de membresía válido");
      }
      if (!["bolivia_qr", "binance"].includes(input?.paymentMethod)) {
        throw new Error("Selecciona un método de pago válido");
      }
      if (!["BO", "INT"].includes(input?.countryCode)) {
        throw new Error("Selecciona un país válido");
      }
      if (
        (input.countryCode === "BO" && input.paymentMethod !== "bolivia_qr") ||
        (input.countryCode === "INT" && input.paymentMethod !== "binance")
      ) {
        throw new Error("El método de pago no corresponde al país seleccionado");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plan, error: planError } = await supabaseAdmin
      .from("club_membership_plans")
      .select("id, name, price, currency")
      .eq("id", data.planId)
      .eq("active", true)
      .single();
    if (planError) throw planError;
    if (plan.currency === "USD" && data.countryCode !== "INT") {
      throw new Error("Los planes en USD deben pagarse con un método internacional");
    }
    const { data: pending, error: pendingError } = await context.supabase
      .from("membership_requests")
      .select("id, amount, currency, membership_plan_id, payment_method, country_code")
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pendingError) throw pendingError;
    if (pending) {
      if (pending.membership_plan_id !== data.planId) {
        throw new Error(
          "Ya tienes una solicitud pendiente. Espera la verificación para cambiar de plan.",
        );
      }
      return {
        ok: true,
        alreadyPending: true,
        request: { ...pending, plan: plan.name },
      };
    }

    const { data: request, error } = await context.supabase
      .from("membership_requests")
      .insert({
        user_id: context.userId,
        plan: plan.name,
        membership_plan_id: plan.id,
        amount: plan.price,
        currency: plan.currency,
        payment_method: data.paymentMethod,
        country_code: data.countryCode,
      })
      .select("id, plan, amount, currency, membership_plan_id, payment_method, country_code")
      .single();
    if (error) throw error;
    return { ok: true, alreadyPending: false, request };
  });

export const getMembershipPaymentSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("membership_payment_settings")
    .select("bolivia_qr_url, international_instructions")
    .eq("id", true)
    .single();
  if (error) throw error;
  return {
    boliviaQrUrl: data.bolivia_qr_url,
    internationalInstructions: data.international_instructions,
  };
});

export const adminSaveMembershipPaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { internationalInstructions: string; boliviaQrUrl: string | null }) => {
    const internationalInstructions = input.internationalInstructions?.trim() ?? "";
    if (internationalInstructions.length > 1200) {
      throw new Error("Las instrucciones no deben superar 1200 caracteres");
    }
    const boliviaQrUrl = input.boliviaQrUrl?.trim() || null;
    if (boliviaQrUrl && (!boliviaQrUrl.startsWith("https://") || boliviaQrUrl.length > 1000)) {
      throw new Error("La dirección del QR no es válida");
    }
    return { internationalInstructions, boliviaQrUrl };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("membership_payment_settings")
      .update({
        international_instructions: data.internationalInstructions,
        bolivia_qr_url: data.boliviaQrUrl,
      })
      .eq("id", true);
    if (error) throw error;
    return { ok: true };
  });

export const adminCreateMembershipQrUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileName: string; contentType: string }) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(input?.contentType)) throw new Error("Formato de imagen no válido");
    if (!input?.fileName) throw new Error("Falta el archivo");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = data.contentType === "image/jpeg" ? "jpg" : data.contentType.split("/")[1];
    const path = `club-membership/${crypto.randomUUID()}.${ext}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("membership-payments")
      .createSignedUploadUrl(path);
    if (error) throw error;
    const { data: publicData } = supabaseAdmin.storage
      .from("membership-payments")
      .getPublicUrl(path);
    return { path, token: signed.token, publicUrl: publicData.publicUrl };
  });

export const recordOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      customerName: string;
      customerPhone: string;
      deliveryType: string;
      address?: string | null;
      lat?: number | null;
      lng?: number | null;
      department?: string | null;
      province?: string | null;
      town?: string | null;
      notes?: string | null;
      items: { name: string; quantity: number; price: number; unit?: string }[];
      total: number;
      discountCode?: string | null;
      discountAmount?: number | null;
      pointsToRedeem?: number;
      brasaDiscountAmount?: number;
    }) => {
      if (!input.items?.length) throw new Error("El pedido está vacío");
      if (!Number.isFinite(input.total) || input.total < 0) throw new Error("Total inválido");
      if (
        input.items.some(
          (item) =>
            !Number.isFinite(item.price) ||
            item.price < 0 ||
            !Number.isFinite(item.quantity) ||
            item.quantity <= 0,
        )
      ) {
        throw new Error("Los productos del pedido no son válidos");
      }
      const pointsToRedeem = input.pointsToRedeem ?? 0;
      const brasaDiscountAmount = input.brasaDiscountAmount ?? 0;
      const discountAmount = input.discountAmount ?? 0;
      if (
        !Number.isInteger(pointsToRedeem) ||
        pointsToRedeem < 0 ||
        pointsToRedeem % CLUB.redeemStep !== 0
      ) {
        throw new Error("La cantidad de Puntos de Brasa a canjear no es válida");
      }
      if (!Number.isFinite(brasaDiscountAmount) || brasaDiscountAmount < 0) {
        throw new Error("El descuento de Puntos de Brasa no es válido");
      }
      if (!Number.isFinite(discountAmount) || discountAmount < 0) {
        throw new Error("El descuento del pedido no es válido");
      }
      return { ...input, pointsToRedeem, brasaDiscountAmount, discountAmount };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let memberDiscountCode: string | null = null;
    const brasaDiscount = (data.pointsToRedeem / CLUB.redeemStep) * CLUB.redeemValueBs;
    const itemsSubtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (
      !Number.isFinite(itemsSubtotal) ||
      data.brasaDiscountAmount !== brasaDiscount ||
      brasaDiscount > itemsSubtotal ||
      data.discountAmount > itemsSubtotal ||
      (brasaDiscount > 0 && (data.discountAmount ?? 0) < brasaDiscount)
    ) {
      throw new Error("El descuento de Puntos de Brasa no coincide con el pedido");
    }

    if (data.discountCode) {
      const { data: memberCode, error: memberCodeError } = await supabaseAdmin
        .from("club_discount_codes")
        .select("code, user_id, redeemed_at")
        .eq("code", data.discountCode.trim().toUpperCase())
        .maybeSingle();
      if (memberCodeError) throw memberCodeError;
      if (memberCode) {
        if (memberCode.user_id !== context.userId) {
          throw new Error("Este código personal pertenece a otra cuenta del Club");
        }
        if (memberCode.redeemed_at) throw new Error("Este código ya fue utilizado");
        memberDiscountCode = memberCode.code;
      }
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: context.userId,
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
        brasa_points_redeemed: data.pointsToRedeem,
        brasa_discount_amount: data.brasaDiscountAmount,
      })
      .select("id")
      .single();
    if (error) throw error;

    if (data.pointsToRedeem > 0 || memberDiscountCode) {
      const { error: finalizeError } = await supabaseAdmin.rpc("finalize_club_discount_checkout", {
        p_order_id: order.id,
        p_user_id: context.userId,
        p_member_code: memberDiscountCode,
        p_points: data.pointsToRedeem,
      });
      if (finalizeError) {
        const { error: cleanupError } = await supabaseAdmin
          .from("orders")
          .delete()
          .eq("id", order.id);
        if (cleanupError) {
          console.error(
            "No se pudo quitar un pedido tras fallar el canje de Puntos de Brasa",
            cleanupError,
          );
        }
        throw finalizeError;
      }
    }

    return {
      ok: true,
      orderId: order.id,
      pointsRedeemed: data.pointsToRedeem,
      discountAmount: data.brasaDiscountAmount,
    };
  });

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("No autorizado");
}

export const adminListRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: requests, error } = await supabaseAdmin
      .from("membership_requests")
      .select(
        "id, user_id, plan, amount, currency, membership_plan_id, status, reference, payment_method, country_code, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    const ids = [...new Set((requests ?? []).map((r) => r.user_id))];
    const profiles = ids.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, full_name, email, phone, membership_status, membership_expires_at")
          .in("id", ids)
      : null;
    if (profiles && profiles.error) throw profiles.error;

    const byId = new Map((profiles?.data ?? []).map((p) => [p.id, p]));
    return (requests ?? []).map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null }));
  });

export const adminReviewRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; approve: boolean }) => {
    if (!input?.id) throw new Error("Falta la solicitud");
    return { id: input.id, approve: !!input.approve };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("review_membership_request", {
      p_request_id: data.id,
      p_approve: data.approve,
    });
    if (error) throw error;
    return { ok: true };
  });
