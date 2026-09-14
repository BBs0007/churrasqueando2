import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminSale = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  accountName: string | null;
  hasAccount: boolean;
  deliveryType: string;
  items: { name: string; quantity: number; price: number; unit?: string }[];
  total: number;
  pointsEarned: number;
  discountCode: string | null;
  discountAmount: number;
  status: string;
  createdAt: string;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("No autorizado");
}

// Admin: list every sale/order placed through the website, including guest
// (non-logged-in) checkouts, with the customer that placed each one.
export const adminListSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, user_id, customer_name, customer_phone, delivery_type, items, total, points_earned, discount_code, discount_amount, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    const userIds = [...new Set((orders ?? []).map((o) => o.user_id).filter(Boolean))] as string[];
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds)
      : { data: [] as any[] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    const sales: AdminSale[] = (orders ?? []).map((o) => {
      const profile = o.user_id ? byId.get(o.user_id) : null;
      return {
        id: o.id,
        customerName: o.customer_name || profile?.full_name || "Cliente sin nombre",
        customerPhone: o.customer_phone || "",
        customerEmail: profile?.email ?? null,
        accountName: profile?.full_name ?? null,
        hasAccount: !!o.user_id,
        deliveryType: o.delivery_type,
        items: o.items ?? [],
        total: Number(o.total),
        pointsEarned: o.points_earned,
        discountCode: o.discount_code ?? null,
        discountAmount: Number(o.discount_amount ?? 0),
        status: o.status,
        createdAt: o.created_at,
      };
    });

    const totalAmount = sales.reduce((sum, s) => sum + s.total, 0);
    const totalOrders = sales.length;
    const avgTicket = totalOrders > 0 ? totalAmount / totalOrders : 0;
    const registeredCustomers = sales.filter((s) => s.hasAccount).length;

    return {
      sales,
      stats: {
        totalAmount,
        totalOrders,
        avgTicket,
        registeredCustomers,
        guestOrders: totalOrders - registeredCustomers,
      },
    };
  });
