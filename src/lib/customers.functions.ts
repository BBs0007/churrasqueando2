import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("No autorizado");
}

export type AdminCustomer = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  birth_date: string | null;
  points: number;
  membership_status: "inactive" | "active" | "expired";
  membership_expires_at: string | null;
  is_member: boolean;
  orders_count: number;
  created_at: string;
};

export const adminListCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const { data: orders } = await supabaseAdmin.from("orders").select("user_id");
    const orderCounts = new Map<string, number>();
    for (const o of orders ?? []) {
      if (!o.user_id) continue;
      orderCounts.set(o.user_id, (orderCounts.get(o.user_id) ?? 0) + 1);
    }

    const customers: AdminCustomer[] = (profiles ?? []).map((p) => {
      const isMember =
        p.membership_status === "active" &&
        (!p.membership_expires_at || new Date(p.membership_expires_at) > new Date());
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        address: p.address ?? "",
        birth_date: p.birth_date,
        points: p.points,
        membership_status: p.membership_status,
        membership_expires_at: p.membership_expires_at,
        is_member: isMember,
        orders_count: orderCounts.get(p.id) ?? 0,
        created_at: p.created_at,
      };
    });

    return { customers };
  });
