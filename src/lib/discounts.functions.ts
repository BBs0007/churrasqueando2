import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("No autorizado");
}

export type DiscountCode = {
  id: string;
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  value: number;
  scope: "all" | "products" | "categories";
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  created_at: string;
  product_ids: string[];
  category_ids: string[];
};

export const adminListDiscountCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: codes, error }, { data: cp }, { data: cc }] = await Promise.all([
      supabaseAdmin.from("discount_codes").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("discount_code_products").select("code_id, product_id"),
      supabaseAdmin.from("discount_code_categories").select("code_id, category_id"),
    ]);
    if (error) throw error;

    const list: DiscountCode[] = (codes ?? []).map((c) => ({
      id: c.id,
      code: c.code,
      description: c.description,
      discount_type: c.discount_type,
      value: Number(c.value),
      scope: c.scope,
      starts_at: c.starts_at,
      ends_at: c.ends_at,
      active: c.active,
      created_at: c.created_at,
      product_ids: (cp ?? []).filter((r) => r.code_id === c.id).map((r) => r.product_id),
      category_ids: (cc ?? []).filter((r) => r.code_id === c.id).map((r) => r.category_id),
    }));

    return { codes: list };
  });

export const adminUpsertDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      code: string;
      description: string;
      discountType: "percentage" | "fixed";
      value: number;
      scope: "all" | "products" | "categories";
      productIds: string[];
      categoryIds: string[];
      startsAt: string | null;
      endsAt: string | null;
      active: boolean;
    }) => {
      const code = input.code?.trim().toUpperCase() ?? "";
      if (!code) throw new Error("El código es obligatorio");
      if (code.length > 40) throw new Error("Código demasiado largo");
      if (!(input.value >= 0)) throw new Error("Valor inválido");
      if (input.discountType === "percentage" && input.value > 100) {
        throw new Error("Un descuento porcentual no puede superar 100%");
      }
      if (input.scope === "products" && (!input.productIds || input.productIds.length === 0)) {
        throw new Error("Selecciona al menos un producto");
      }
      if (input.scope === "categories" && (!input.categoryIds || input.categoryIds.length === 0)) {
        throw new Error("Selecciona al menos una categoría");
      }
      if (input.startsAt && input.endsAt && new Date(input.startsAt) > new Date(input.endsAt)) {
        throw new Error("La fecha de inicio no puede ser posterior a la de fin");
      }
      return {
        id: input.id,
        code,
        description: input.description?.trim() ?? "",
        discountType: input.discountType,
        value: input.value,
        scope: input.scope,
        productIds: input.scope === "products" ? input.productIds : [],
        categoryIds: input.scope === "categories" ? input.categoryIds : [],
        startsAt: input.startsAt || null,
        endsAt: input.endsAt || null,
        active: !!input.active,
      };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      code: data.code,
      description: data.description,
      discount_type: data.discountType,
      value: data.value,
      scope: data.scope,
      starts_at: data.startsAt,
      ends_at: data.endsAt,
      active: data.active,
    };

    let codeId = data.id;
    if (codeId) {
      const { error } = await supabaseAdmin.from("discount_codes").update(payload).eq("id", codeId);
      if (error) throw error;
      await Promise.all([
        supabaseAdmin.from("discount_code_products").delete().eq("code_id", codeId),
        supabaseAdmin.from("discount_code_categories").delete().eq("code_id", codeId),
      ]);
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("discount_codes")
        .insert({ ...payload, created_by: context.userId })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("Ya existe un código con ese nombre");
        throw error;
      }
      codeId = created.id;
    }

    if (data.scope === "products" && data.productIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("discount_code_products")
        .insert(data.productIds.map((product_id) => ({ code_id: codeId, product_id })));
      if (error) throw error;
    }
    if (data.scope === "categories" && data.categoryIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("discount_code_categories")
        .insert(data.categoryIds.map((category_id) => ({ code_id: codeId, category_id })));
      if (error) throw error;
    }

    return { ok: true, id: codeId };
  });

export const adminDeleteDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Falta el código");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("discount_codes").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Para socios del Club: promociones activas (dentro de su rango de fechas) a modo informativo.
export const getActivePromotions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("discount_codes")
      .select("id, code, description, discount_type, value, scope, starts_at, ends_at")
      .eq("active", true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return { promotions: data ?? [] };
  });

export type ValidateDiscountResult = {
  valid: boolean;
  message?: string;
  code?: string;
  discountType?: "percentage" | "fixed";
  value?: number;
  discountAmount?: number;
  eligibleSubtotal?: number;
};

// Público: valida un código ingresado en el checkout y calcula cuánto
// descuento corresponde según los ítems del carrito. No requiere sesión
// para permitir aplicarlo también en pedidos por WhatsApp de invitados.
export const validateDiscountCode = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { code: string; items: { id: string; price: number; quantity: number }[] }) => {
      const code = input.code?.trim().toUpperCase() ?? "";
      if (!code) throw new Error("Ingresa un código");
      if (!input.items?.length) throw new Error("El carrito está vacío");
      return { code, items: input.items };
    },
  )
  .handler(async ({ data }): Promise<ValidateDiscountResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: found, error } = await supabaseAdmin
      .from("discount_codes")
      .select("*")
      .eq("code", data.code)
      .maybeSingle();
    if (error) throw error;
    if (!found || !found.active) {
      return { valid: false, message: "Ese código no existe o ya no está activo." };
    }
    const now = new Date();
    if (found.starts_at && new Date(found.starts_at) > now) {
      return { valid: false, message: "Ese código todavía no está disponible." };
    }
    if (found.ends_at && new Date(found.ends_at) < now) {
      return { valid: false, message: "Ese código ya venció." };
    }

    let eligibleSubtotal = 0;
    if (found.scope === "all") {
      eligibleSubtotal = data.items.reduce((s, i) => s + i.price * i.quantity, 0);
    } else if (found.scope === "products") {
      const { data: cp } = await supabaseAdmin
        .from("discount_code_products")
        .select("product_id")
        .eq("code_id", found.id);
      const eligibleIds = new Set((cp ?? []).map((r) => r.product_id));
      eligibleSubtotal = data.items
        .filter((i) => eligibleIds.has(i.id))
        .reduce((s, i) => s + i.price * i.quantity, 0);
    } else {
      const { data: cc } = await supabaseAdmin
        .from("discount_code_categories")
        .select("category_id")
        .eq("code_id", found.id);
      const categoryIds = (cc ?? []).map((r) => r.category_id);
      const itemIds = data.items.map((i) => i.id);
      const { data: prods } = await supabaseAdmin
        .from("products")
        .select("id, category_id")
        .in("id", itemIds);
      const eligibleIds = new Set(
        (prods ?? []).filter((p) => categoryIds.includes(p.category_id)).map((p) => p.id),
      );
      eligibleSubtotal = data.items
        .filter((i) => eligibleIds.has(i.id))
        .reduce((s, i) => s + i.price * i.quantity, 0);
    }

    if (eligibleSubtotal <= 0) {
      return {
        valid: false,
        message: "Ese código no aplica a los productos de tu carrito.",
      };
    }

    const discountAmount =
      found.discount_type === "percentage"
        ? Math.round(eligibleSubtotal * (Number(found.value) / 100) * 100) / 100
        : Math.min(Number(found.value), eligibleSubtotal);

    return {
      valid: true,
      code: found.code,
      discountType: found.discount_type,
      value: Number(found.value),
      discountAmount,
      eligibleSubtotal,
    };
  });
