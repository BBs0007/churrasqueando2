import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
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
  membership_plan_id: string | null;
  membership_plan_name: string | null;
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

    const planIds = [
      ...new Set(
        (profiles ?? [])
          .map((profile) => profile.membership_plan_id)
          .filter((id): id is string => typeof id === "string"),
      ),
    ];
    const { data: plans, error: plansError } = planIds.length
      ? await supabaseAdmin.from("club_membership_plans").select("id, name").in("id", planIds)
      : { data: [], error: null };
    if (plansError) throw plansError;
    const planNames = new Map((plans ?? []).map((plan) => [plan.id, plan.name]));

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
        membership_plan_id: p.membership_plan_id,
        membership_plan_name: planNames.get(p.membership_plan_id ?? "") ?? null,
        is_member: isMember,
        orders_count: orderCounts.get(p.id) ?? 0,
        created_at: p.created_at,
      };
    });

    return { customers };
  });

function validateCustomerFields(input: {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
}) {
  const fullName = input?.fullName?.trim() ?? "";
  const email = input?.email?.trim().toLowerCase() ?? "";
  const phone = input?.phone?.trim() ?? "";
  const address = input?.address?.trim() ?? "";
  const birthDate = input?.birthDate?.trim() || null;
  if (!fullName || fullName.length > 120)
    throw new Error("El nombre es obligatorio y debe ser válido");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Ingresa un correo electrónico válido");
  }
  if (phone.length > 30 || address.length > 200) throw new Error("Datos demasiado largos");
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    throw new Error("La fecha de nacimiento no es válida");
  }
  return { fullName, email, phone, address, birthDate };
}

export const adminCreateCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Parameters<typeof validateCustomerFields>[0]) =>
    validateCustomerFields(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const temporaryPassword = `${crypto.randomUUID()}Aa1!`;
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        phone: data.phone,
        address: data.address,
        birth_date: data.birthDate,
      },
    });
    if (createError) throw createError;
    if (!created.user) throw new Error("Supabase no devolvió el usuario creado");

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      birth_date: data.birthDate,
    });
    if (profileError) {
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      if (cleanupError) {
        throw new Error(
          `No se pudo guardar el perfil del cliente y tampoco limpiar la cuenta creada: ${cleanupError.message}`,
        );
      }
      throw profileError;
    }
    return { ok: true, temporaryPassword };
  });

export const adminUpdateCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Parameters<typeof validateCustomerFields>[0] & { id: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input?.id ?? "")) throw new Error("El cliente no es válido");
    return { ...validateCustomerFields(input), id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: oldUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(
      data.id,
    );
    if (getUserError) throw getUserError;
    if (!oldUser.user) throw new Error("No se encontró la cuenta del cliente");

    const emailChanged = oldUser.user.email?.toLowerCase() !== data.email;
    if (emailChanged) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
        email: data.email,
        email_confirm: true,
        user_metadata: {
          ...oldUser.user.user_metadata,
          full_name: data.fullName,
          phone: data.phone,
          address: data.address,
          birth_date: data.birthDate,
        },
      });
      if (error) throw error;
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        birth_date: data.birthDate,
      })
      .eq("id", data.id);
    if (profileError) {
      if (emailChanged && oldUser.user.email) {
        const { error: rollbackError } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
          email: oldUser.user.email,
          email_confirm: true,
        });
        if (rollbackError) {
          throw new Error(
            `No se pudo guardar el perfil ni restaurar el correo anterior: ${rollbackError.message}`,
          );
        }
      }
      throw profileError;
    }
    return { ok: true };
  });

export const adminSetCustomerMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      customerId: string;
      planId: string | null;
      active: boolean;
      paymentConfirmed: boolean;
      paymentMethod: "bolivia_qr" | "binance";
      countryCode: "BO" | "INT";
      reference: string;
    }) => {
      if (!/^[0-9a-f-]{36}$/i.test(input?.customerId ?? ""))
        throw new Error("El cliente no es válido");
      if (typeof input.active !== "boolean" || typeof input.paymentConfirmed !== "boolean") {
        throw new Error("La confirmación de pago no es válida");
      }
      if (input.active && !/^[0-9a-f-]{36}$/i.test(input.planId ?? "")) {
        throw new Error("Selecciona un plan para activar la membresía");
      }
      if (!["bolivia_qr", "binance"].includes(input.paymentMethod)) {
        throw new Error("Selecciona un método de pago válido");
      }
      if (!["BO", "INT"].includes(input.countryCode)) {
        throw new Error("Selecciona un país válido");
      }
      if (
        (input.countryCode === "BO" && input.paymentMethod !== "bolivia_qr") ||
        (input.countryCode === "INT" && input.paymentMethod !== "binance")
      ) {
        throw new Error("El método de pago no corresponde al país");
      }
      if (input.reference.length > 120)
        throw new Error("La referencia del pago es demasiado larga");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.active) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          membership_status: "inactive",
          membership_plan_id: null,
          membership_expires_at: null,
        })
        .eq("id", data.customerId);
      if (error) throw error;
      return { ok: true };
    }
    const planId = data.planId;
    if (!planId) throw new Error("Selecciona un plan para activar la membresía");
    const { error } = await context.supabase.rpc("admin_activate_customer_membership", {
      p_customer_id: data.customerId,
      p_plan_id: planId,
      p_payment_confirmed: data.paymentConfirmed,
      p_payment_method: data.paymentMethod,
      p_country_code: data.countryCode,
      p_reference: data.reference.trim() || null,
    });
    if (error) throw error;
    return { ok: true };
  });
