import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type MembershipPlan = {
  id: string;
  name: string;
  interval: "monthly" | "quarterly" | "annual";
  duration_days: number;
  price: number;
  currency: "Bs" | "USD";
  active: boolean;
  sort_order: number;
};

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("No autorizado");
}

export const getActiveMembershipPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("club_membership_plans")
    .select("id, name, interval, duration_days, price, currency, active, sort_order")
    .eq("active", true)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data as MembershipPlan[];
});

export const adminListMembershipPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("club_membership_plans")
      .select("id, name, interval, duration_days, price, currency, active, sort_order")
      .order("sort_order")
      .order("created_at");
    if (error) throw error;
    return data as MembershipPlan[];
  });

export const adminSaveMembershipPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      interval: MembershipPlan["interval"];
      durationDays: number;
      price: number;
      currency: MembershipPlan["currency"];
      active: boolean;
      sortOrder: number;
    }) => {
      const name = input?.name?.trim() ?? "";
      if (name.length < 2 || name.length > 80) throw new Error("El nombre del plan no es válido");
      if (!["monthly", "quarterly", "annual"].includes(input.interval)) {
        throw new Error("Selecciona una frecuencia válida");
      }
      if (
        !Number.isInteger(input.durationDays) ||
        input.durationDays < 1 ||
        input.durationDays > 3660
      ) {
        throw new Error("La duración debe estar entre 1 y 3660 días");
      }
      if (!Number.isFinite(input.price) || input.price <= 0 || input.price > 1_000_000) {
        throw new Error("El precio del plan no es válido");
      }
      if (!["Bs", "USD"].includes(input.currency)) throw new Error("Selecciona una moneda válida");
      if (!Number.isInteger(input.sortOrder) || Math.abs(input.sortOrder) > 100_000) {
        throw new Error("El orden del plan no es válido");
      }
      if (input.id && !/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error("El plan no es válido");
      return { ...input, name };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, durationDays, sortOrder, ...fields } = data;
    const values = {
      ...fields,
      duration_days: durationDays,
      sort_order: sortOrder,
    };
    const result = id
      ? await supabaseAdmin
          .from("club_membership_plans")
          .update(values)
          .eq("id", id)
          .select("id")
          .single()
      : await supabaseAdmin.from("club_membership_plans").insert(values).select("id").single();
    if (result.error) throw result.error;
    return { ok: true };
  });

export const adminDeleteMembershipPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input?.id ?? "")) throw new Error("El plan no es válido");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [activeMembers, pendingRequests] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("membership_plan_id", data.id)
        .eq("membership_status", "active"),
      supabaseAdmin
        .from("membership_requests")
        .select("id", { count: "exact", head: true })
        .eq("membership_plan_id", data.id)
        .eq("status", "pending"),
    ]);
    if (activeMembers.error) throw activeMembers.error;
    if (pendingRequests.error) throw pendingRequests.error;
    if ((activeMembers.count ?? 0) > 0 || (pendingRequests.count ?? 0) > 0) {
      throw new Error(
        "No se puede eliminar un plan con socios activos o solicitudes pendientes. Desactívalo.",
      );
    }
    const { error } = await supabaseAdmin.from("club_membership_plans").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
