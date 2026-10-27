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

export type ClubDiscountCampaign = {
  id: string;
  title: string;
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
  code_count: number;
  redeemed_count: number;
};

export type ClubDiscountRedemption = {
  id: string;
  campaign_title: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  order_id: string | null;
  order_total: number | null;
  discount_amount: number;
  redeemed_at: string;
};

export type ClubMemberPromotion = {
  id: string;
  title: string;
  description: string;
  discount_type: "percentage" | "fixed";
  value: number;
  starts_at: string | null;
  ends_at: string | null;
  code: string;
  redeemed_at: string | null;
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

function makeMemberDiscountCode(): string {
  return `CLUB${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

export const adminListClubDiscountCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [
      { data: campaigns, error },
      { data: campaignProducts, error: productsError },
      { data: campaignCategories, error: categoriesError },
      { data: memberCodes, error: codesError },
    ] = await Promise.all([
      supabaseAdmin
        .from("club_discount_campaigns")
        .select("*")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("club_discount_campaign_products").select("campaign_id, product_id"),
      supabaseAdmin.from("club_discount_campaign_categories").select("campaign_id, category_id"),
      supabaseAdmin.from("club_discount_codes").select("campaign_id, redeemed_at"),
    ]);
    if (error) throw error;
    if (productsError) throw productsError;
    if (categoriesError) throw categoriesError;
    if (codesError) throw codesError;

    return {
      campaigns: (campaigns ?? []).map((campaign): ClubDiscountCampaign => ({
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        discount_type: campaign.discount_type as ClubDiscountCampaign["discount_type"],
        value: Number(campaign.value),
        scope: campaign.scope as ClubDiscountCampaign["scope"],
        starts_at: campaign.starts_at,
        ends_at: campaign.ends_at,
        active: campaign.active,
        created_at: campaign.created_at,
        product_ids: (campaignProducts ?? [])
          .filter((item) => item.campaign_id === campaign.id)
          .map((item) => item.product_id),
        category_ids: (campaignCategories ?? [])
          .filter((item) => item.campaign_id === campaign.id)
          .map((item) => item.category_id),
        code_count: (memberCodes ?? []).filter((item) => item.campaign_id === campaign.id).length,
        redeemed_count: (memberCodes ?? []).filter(
          (item) => item.campaign_id === campaign.id && item.redeemed_at !== null,
        ).length,
      })),
    };
  });

export const adminListClubDiscountRedemptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: redeemedCodes, error } = await supabaseAdmin
      .from("club_discount_codes")
      .select(
        "id, campaign_id, user_id, code, redeemed_order_id, redeemed_at, redeemed_discount_amount",
      )
      .not("redeemed_at", "is", null)
      .order("redeemed_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    const campaignIds = [...new Set((redeemedCodes ?? []).map((item) => item.campaign_id))];
    const userIds = [...new Set((redeemedCodes ?? []).map((item) => item.user_id))];
    const orderIds = [
      ...new Set(
        (redeemedCodes ?? [])
          .map((item) => item.redeemed_order_id)
          .filter((id): id is string => !!id),
      ),
    ];
    const [campaignResult, profileResult, orderResult] = await Promise.all([
      campaignIds.length
        ? supabaseAdmin.from("club_discount_campaigns").select("id, title").in("id", campaignIds)
        : Promise.resolve({ data: [], error: null }),
      userIds.length
        ? supabaseAdmin.from("profiles").select("id, full_name, phone").in("id", userIds)
        : Promise.resolve({ data: [], error: null }),
      orderIds.length
        ? supabaseAdmin
            .from("orders")
            .select("id, customer_name, customer_phone, total")
            .in("id", orderIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (campaignResult.error) throw campaignResult.error;
    if (profileResult.error) throw profileResult.error;
    if (orderResult.error) throw orderResult.error;

    const campaignsById = new Map((campaignResult.data ?? []).map((item) => [item.id, item]));
    const profilesById = new Map((profileResult.data ?? []).map((item) => [item.id, item]));
    const ordersById = new Map((orderResult.data ?? []).map((item) => [item.id, item]));

    return {
      redemptions: (redeemedCodes ?? []).map((item): ClubDiscountRedemption => {
        const order = item.redeemed_order_id ? ordersById.get(item.redeemed_order_id) : null;
        const profile = profilesById.get(item.user_id);
        return {
          id: item.id,
          campaign_title: campaignsById.get(item.campaign_id)?.title ?? "Promoción eliminada",
          code: item.code,
          customer_name: order?.customer_name || profile?.full_name || "Socio",
          customer_phone: order?.customer_phone || profile?.phone || "",
          order_id: item.redeemed_order_id,
          order_total: order ? Number(order.total) : null,
          discount_amount: Number(item.redeemed_discount_amount ?? 0),
          redeemed_at: item.redeemed_at ?? "",
        };
      }),
    };
  });

export const adminUpsertClubDiscountCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      title: string;
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
      const title = input.title?.trim() ?? "";
      if (!title) throw new Error("El título de la promoción es obligatorio");
      if (title.length > 100) throw new Error("El título es demasiado largo");
      if (!Number.isFinite(input.value) || input.value < 0) throw new Error("Valor inválido");
      if (input.discountType === "percentage" && input.value > 100) {
        throw new Error("Un descuento porcentual no puede superar 100%");
      }
      if (input.scope === "products" && !input.productIds?.length) {
        throw new Error("Selecciona al menos un producto");
      }
      if (input.scope === "categories" && !input.categoryIds?.length) {
        throw new Error("Selecciona al menos una categoría");
      }
      if (
        (input.startsAt && Number.isNaN(Date.parse(input.startsAt))) ||
        (input.endsAt && Number.isNaN(Date.parse(input.endsAt)))
      ) {
        throw new Error("Una de las fechas no es válida");
      }
      if (input.startsAt && input.endsAt && new Date(input.startsAt) > new Date(input.endsAt)) {
        throw new Error("La fecha de inicio no puede ser posterior a la de fin");
      }
      return {
        id: input.id,
        title,
        description: input.description?.trim() ?? "",
        discountType: input.discountType,
        value: input.value,
        scope: input.scope,
        productIds: input.scope === "products" ? [...new Set(input.productIds)] : [],
        categoryIds: input.scope === "categories" ? [...new Set(input.categoryIds)] : [],
        startsAt: input.startsAt || null,
        endsAt: input.endsAt || null,
        active: !!input.active,
      };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: campaignId, error } = await supabaseAdmin.rpc(
      "admin_upsert_club_discount_campaign",
      {
        p_admin_user_id: context.userId,
        p_campaign_id: data.id ?? null,
        p_title: data.title,
        p_description: data.description,
        p_discount_type: data.discountType,
        p_value: data.value,
        p_scope: data.scope,
        p_starts_at: data.startsAt,
        p_ends_at: data.endsAt,
        p_active: data.active,
        p_product_ids: data.productIds,
        p_category_ids: data.categoryIds,
      },
    );
    if (error) throw error;
    if (!campaignId) throw new Error("No se pudo guardar la promoción del Club");
    return { ok: true, id: campaignId };
  });

export const getMyClubDiscountCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const nowIso = now.toISOString();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("membership_status, membership_expires_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (
      profile?.membership_status !== "active" ||
      (profile.membership_expires_at && new Date(profile.membership_expires_at) <= now)
    ) {
      return { promotions: [] as ClubMemberPromotion[] };
    }

    const { data: campaigns, error } = await supabaseAdmin
      .from("club_discount_campaigns")
      .select("*")
      .eq("active", true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const promotions = await Promise.all(
      (campaigns ?? []).map(async (campaign): Promise<ClubMemberPromotion> => {
        const { data: existing, error: existingError } = await supabaseAdmin
          .from("club_discount_codes")
          .select("id, code, redeemed_at")
          .eq("campaign_id", campaign.id)
          .eq("user_id", context.userId)
          .maybeSingle();
        if (existingError) throw existingError;

        let memberCode = existing;
        if (!memberCode) {
          const { data: inserted, error: insertError } = await supabaseAdmin
            .from("club_discount_codes")
            .insert({
              campaign_id: campaign.id,
              user_id: context.userId,
              code: makeMemberDiscountCode(),
            })
            .select("id, code, redeemed_at")
            .maybeSingle();
          if (insertError?.code === "23505") {
            const { data: raced, error: raceError } = await supabaseAdmin
              .from("club_discount_codes")
              .select("id, code, redeemed_at")
              .eq("campaign_id", campaign.id)
              .eq("user_id", context.userId)
              .single();
            if (raceError) throw raceError;
            memberCode = raced;
          } else if (insertError) {
            throw insertError;
          } else {
            memberCode = inserted;
          }
        }
        if (!memberCode) throw new Error("No se pudo generar el código personal de la promoción");

        return {
          id: campaign.id,
          title: campaign.title,
          description: campaign.description,
          discount_type: campaign.discount_type as ClubDiscountCampaign["discount_type"],
          value: Number(campaign.value),
          starts_at: campaign.starts_at,
          ends_at: campaign.ends_at,
          code: memberCode.code,
          redeemed_at: memberCode.redeemed_at,
        };
      }),
    );

    return { promotions };
  });

export type ValidateClubDiscountResult = ValidateDiscountResult & {
  isClubMemberCode: boolean;
};

export const validateClubDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { code: string; items: { id: string; price: number; quantity: number }[] }) => {
      const code = input.code?.trim().toUpperCase() ?? "";
      if (!code) throw new Error("Ingresa un código");
      if (!input.items?.length) throw new Error("El carrito está vacío");
      if (
        input.items.some(
          (item) =>
            !item.id ||
            !Number.isFinite(item.price) ||
            item.price < 0 ||
            !Number.isFinite(item.quantity) ||
            item.quantity <= 0,
        )
      ) {
        throw new Error("Los productos del carrito no son válidos");
      }
      return { code, items: input.items };
    },
  )
  .handler(async ({ data, context }): Promise<ValidateClubDiscountResult> => {
    const invalid = (message: string): ValidateClubDiscountResult => ({
      valid: false,
      message,
      isClubMemberCode: false,
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: memberCode, error } = await supabaseAdmin
      .from("club_discount_codes")
      .select("id, campaign_id, user_id, code, redeemed_at")
      .eq("code", data.code)
      .maybeSingle();
    if (error) throw error;
    if (!memberCode) return invalid("Ese código no pertenece a una promoción personal del Club.");
    if (memberCode.user_id !== context.userId) {
      return invalid("Este código personal pertenece a otra cuenta del Club.");
    }
    if (memberCode.redeemed_at) return invalid("Este código ya fue utilizado.");

    const now = new Date();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("membership_status, membership_expires_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (
      profile?.membership_status !== "active" ||
      (profile.membership_expires_at && new Date(profile.membership_expires_at) <= now)
    ) {
      return invalid("Se requiere una membresía activa para usar este código.");
    }

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("club_discount_campaigns")
      .select("*")
      .eq("id", memberCode.campaign_id)
      .maybeSingle();
    if (campaignError) throw campaignError;
    if (
      !campaign ||
      !campaign.active ||
      (campaign.starts_at && new Date(campaign.starts_at) > now) ||
      (campaign.ends_at && new Date(campaign.ends_at) < now)
    ) {
      return invalid("Esta promoción ya no está disponible.");
    }

    const itemIds = [...new Set(data.items.map((item) => item.id))];
    const productIds = itemIds.filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
    );
    const comboIds = itemIds.filter((id) => !productIds.includes(id));
    const [productResult, comboResult] = await Promise.all([
      productIds.length
        ? supabaseAdmin
            .from("products")
            .select("id, price, category_id")
            .eq("active", true)
            .in("id", productIds)
        : Promise.resolve({ data: [], error: null }),
      comboIds.length
        ? supabaseAdmin.from("combos").select("id, price").eq("active", true).in("id", comboIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (productResult.error) throw productResult.error;
    if (comboResult.error) throw comboResult.error;

    const catalog = new Map<
      string,
      { price: number; categoryId: string | null; kind: "product" | "combo" }
    >();
    for (const product of productResult.data ?? []) {
      catalog.set(product.id, {
        price: Number(product.price),
        categoryId: product.category_id,
        kind: "product",
      });
    }
    for (const combo of comboResult.data ?? []) {
      catalog.set(combo.id, { price: Number(combo.price), categoryId: null, kind: "combo" });
    }

    if (
      data.items.some((item) => {
        const current = catalog.get(item.id);
        return !current || Math.abs(current.price - item.price) > 0.01;
      })
    ) {
      return invalid("El catálogo cambió; actualiza el carrito antes de aplicar el código.");
    }

    let eligibleIds = new Set(itemIds);
    if (campaign.scope === "products") {
      const { data: selected, error: selectionError } = await supabaseAdmin
        .from("club_discount_campaign_products")
        .select("product_id")
        .eq("campaign_id", campaign.id);
      if (selectionError) throw selectionError;
      eligibleIds = new Set((selected ?? []).map((item) => item.product_id));
    } else if (campaign.scope === "categories") {
      const { data: selected, error: selectionError } = await supabaseAdmin
        .from("club_discount_campaign_categories")
        .select("category_id")
        .eq("campaign_id", campaign.id);
      if (selectionError) throw selectionError;
      const categories = new Set((selected ?? []).map((item) => item.category_id));
      eligibleIds = new Set(
        [...catalog.entries()]
          .filter(
            ([id, product]) =>
              product.kind === "product" &&
              product.categoryId &&
              categories.has(product.categoryId),
          )
          .map(([id]) => id),
      );
    }

    const eligibleSubtotal = data.items.reduce((sum, item) => {
      const catalogItem = catalog.get(item.id);
      return catalogItem && eligibleIds.has(item.id)
        ? sum + catalogItem.price * item.quantity
        : sum;
    }, 0);
    if (eligibleSubtotal <= 0) {
      return invalid("Esta promoción no aplica a los productos de tu carrito.");
    }

    const discountAmount =
      campaign.discount_type === "percentage"
        ? Math.round(eligibleSubtotal * (Number(campaign.value) / 100) * 100) / 100
        : Math.min(Number(campaign.value), eligibleSubtotal);
    return {
      valid: true,
      code: memberCode.code,
      isClubMemberCode: true,
      discountType: campaign.discount_type as "percentage" | "fixed",
      value: Number(campaign.value),
      discountAmount,
      eligibleSubtotal,
    };
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
  isClubMemberCode?: boolean;
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
    if (!found) {
      const { data: memberCode, error: memberCodeError } = await supabaseAdmin
        .from("club_discount_codes")
        .select("id")
        .eq("code", data.code)
        .maybeSingle();
      if (memberCodeError) throw memberCodeError;
      if (memberCode) {
        return {
          valid: false,
          message: "Para usar este código personal, inicia sesión con la cuenta del socio.",
        };
      }
      return { valid: false, message: "Ese código no existe o ya no está activo." };
    }
    if (!found.active) {
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
      const productIds = itemIds.filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
      );
      const { data: prods, error: productsError } = productIds.length
        ? await supabaseAdmin.from("products").select("id, category_id").in("id", productIds)
        : { data: [], error: null };
      if (productsError) throw productsError;
      const eligibleIds = new Set(
        (prods ?? [])
          .filter((p) => p.category_id !== null && categoryIds.includes(p.category_id))
          .map((p) => p.id),
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
      isClubMemberCode: false,
      discountType: found.discount_type,
      value: Number(found.value),
      discountAmount,
      eligibleSubtotal,
    };
  });
