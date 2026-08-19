import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CLUB, pointsForAmount } from "@/lib/club";

export type ClubProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  points: number;
  membership_status: "inactive" | "active" | "expired";
  membership_expires_at: string | null;
};

export type ClubOrder = {
  id: string;
  total: number;
  points_earned: number;
  status: string;
  delivery_type: string;
  created_at: string;
  items: { name: string; quantity: number; price: number; unit?: string }[];
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
  status: "pending" | "approved" | "rejected";
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
      const { data: created, error } = await supabaseAdmin
        .from("profiles")
        .insert({ id: context.userId, email })
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
        .select("id, total, points_earned, status, delivery_type, created_at, items")
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("point_transactions")
        .select("id, points, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("membership_requests")
        .select("id, plan, amount, status, created_at")
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
  .inputValidator((input: { fullName: string; phone: string }) => {
    const fullName = input.fullName?.trim() ?? "";
    const phone = input.phone?.trim() ?? "";
    if (fullName.length > 120 || phone.length > 30) throw new Error("Datos demasiado largos");
    return { fullName, phone };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.fullName, phone: data.phone })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const requestMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reference?: string }) => ({
    reference: input?.reference?.trim().slice(0, 200) || null,
  }))
  .handler(async ({ data, context }) => {
    const { data: pending } = await context.supabase
      .from("membership_requests")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .maybeSingle();
    if (pending) return { ok: true, alreadyPending: true };

    const { error } = await context.supabase.from("membership_requests").insert({
      user_id: context.userId,
      plan: "monthly",
      amount: CLUB.monthlyPriceBs,
      reference: data.reference,
    });
    if (error) throw error;
    return { ok: true, alreadyPending: false };
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
    }) => {
      if (!input.items?.length) throw new Error("El pedido está vacío");
      if (!(input.total >= 0)) throw new Error("Total inválido");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const points = pointsForAmount(data.total);

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
        points_earned: points,
      })
      .select("id")
      .single();
    if (error) throw error;

    if (points > 0) {
      await supabaseAdmin.from("point_transactions").insert({
        user_id: context.userId,
        points,
        reason: "Compra registrada",
        order_id: order.id,
      });
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("points")
        .eq("id", context.userId)
        .maybeSingle();
      await supabaseAdmin
        .from("profiles")
        .update({ points: (profile?.points ?? 0) + points })
        .eq("id", context.userId);
    }

    return { ok: true, points };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
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
      .select("id, user_id, plan, amount, status, reference, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    const ids = [...new Set((requests ?? []).map((r) => r.user_id))];
    const { data: profiles } = ids.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, full_name, email, phone, membership_status, membership_expires_at")
          .in("id", ids)
      : { data: [] as any[] };

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error } = await supabaseAdmin
      .from("membership_requests")
      .update({
        status: data.approve ? "approved" : "rejected",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("user_id")
      .single();
    if (error) throw error;

    if (data.approve) {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + 1);
      await supabaseAdmin
        .from("profiles")
        .update({
          membership_status: "active",
          membership_expires_at: expires.toISOString(),
        })
        .eq("id", req.user_id);
    }
    return { ok: true };
  });
