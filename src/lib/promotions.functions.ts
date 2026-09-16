import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PromoProduct = {
  id: string;
  name: string;
  price: number;
  unit: string;
  description: string;
  image: string | null;
  active: boolean;
  sort_order: number;
};

function mapPromoProduct(row: any): PromoProduct {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    unit: row.unit,
    description: row.description,
    image: row.image_url ?? null,
    active: row.active,
    sort_order: row.sort_order,
  };
}

export type PromotionItem = {
  id: string;
  source: "promo" | "catalog";
  productId: string;
  quantity: number;
  // Datos ya resueltos del producto (de promo_products o del catálogo
  // principal, según "source"), para no tener que volver a buscarlos.
  name: string;
  price: number;
  unit: string;
  image: string | null;
};

export type Promotion = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string | null;
  price: number | null;
  active: boolean;
  sort_order: number;
  items: PromotionItem[];
  itemsTotal: number;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("No autorizado");
}

async function resolveItems(supabaseAdmin: any, promoIds: string[]): Promise<Map<string, PromotionItem[]>> {
  const map = new Map<string, PromotionItem[]>();
  if (promoIds.length === 0) return map;

  const { data: rows, error } = await supabaseAdmin
    .from("promotion_items")
    .select("*")
    .in("promotion_id", promoIds)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  if (!rows || rows.length === 0) return map;

  const promoProductIds = rows.filter((r: any) => r.source === "promo").map((r: any) => r.product_id);
  const catalogProductIds = rows.filter((r: any) => r.source === "catalog").map((r: any) => r.product_id);

  const [{ data: promoProds }, { data: catalogProds }] = await Promise.all([
    promoProductIds.length
      ? supabaseAdmin.from("promo_products").select("id, name, price, unit, image_url").in("id", promoProductIds)
      : Promise.resolve({ data: [] as any[] }),
    catalogProductIds.length
      ? supabaseAdmin.from("products").select("id, name, price, unit, image_url").in("id", catalogProductIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const promoById = new Map((promoProds ?? []).map((p: any) => [p.id, p]));
  const catalogById = new Map((catalogProds ?? []).map((p: any) => [p.id, p]));

  for (const row of rows) {
    const src = row.source === "promo" ? promoById.get(row.product_id) : catalogById.get(row.product_id);
    const item: PromotionItem = {
      id: row.id,
      source: row.source,
      productId: row.product_id,
      quantity: row.quantity,
      name: src?.name ?? "Producto eliminado",
      price: Number(src?.price ?? 0),
      unit: src?.unit ?? "",
      image: src?.image_url ?? null,
    };
    const list = map.get(row.promotion_id) ?? [];
    list.push(item);
    map.set(row.promotion_id, list);
  }
  return map;
}

function mapPromotion(row: any, items: PromotionItem[]): Promotion {
  const itemsTotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    image: row.image_url ?? null,
    price: row.price === null || row.price === undefined ? null : Number(row.price),
    active: row.active,
    sort_order: row.sort_order,
    items,
    itemsTotal,
  };
}

// ---- Público (solo autenticados; la página ya exige sesión y socio) ----

export const getPromoStore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: products, error: prodErr }, { data: promos, error: promoErr }] = await Promise.all([
      supabaseAdmin.from("promo_products").select("*").eq("active", true).order("sort_order", { ascending: true }),
      supabaseAdmin.from("promotions").select("*").eq("active", true).order("sort_order", { ascending: true }),
    ]);
    if (prodErr) throw prodErr;
    if (promoErr) throw promoErr;

    const itemsByPromo = await resolveItems(supabaseAdmin, (promos ?? []).map((p: any) => p.id));

    return {
      products: (products ?? []).map(mapPromoProduct),
      promotions: (promos ?? []).map((p: any) => mapPromotion(p, itemsByPromo.get(p.id) ?? [])),
    };
  });

// ---- Admin: productos de promoción ----

export const adminListPromoProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("promo_products")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapPromoProduct);
  });

export const adminUpsertPromoProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      price: number;
      unit: string;
      description: string;
      imageUrl?: string | null;
      active: boolean;
      sortOrder: number;
    }) => {
      const name = input.name?.trim() ?? "";
      if (!name) throw new Error("El nombre es obligatorio");
      if (name.length > 120) throw new Error("Nombre demasiado largo");
      if (!(input.price >= 0)) throw new Error("Precio inválido");
      return {
        id: input.id,
        name,
        price: input.price,
        unit: input.unit?.trim() || "unidad",
        description: input.description?.trim() ?? "",
        imageUrl: input.imageUrl ?? null,
        active: !!input.active,
        sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
      };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      name: data.name,
      price: data.price,
      unit: data.unit,
      description: data.description,
      image_url: data.imageUrl,
      active: data.active,
      sort_order: data.sortOrder,
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("promo_products").update(payload).eq("id", data.id);
      if (error) throw error;
      return { ok: true, id: data.id };
    }
    const { data: created, error } = await supabaseAdmin
      .from("promo_products")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, id: created.id };
  });

export const adminDeletePromoProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Falta el producto");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("promo_products").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminUploadPromoImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileName: string; dataUrl: string }) => {
    if (!input?.dataUrl?.startsWith("data:")) throw new Error("Imagen inválida");
    if (input.dataUrl.length > 8_000_000) throw new Error("La imagen es demasiado grande");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const match = data.dataUrl.match(/^data:(.+);base64,(.*)$/);
    if (!match) throw new Error("Imagen inválida");
    const contentType = match[1];
    const bytes = Buffer.from(match[2], "base64");

    const ext = (data.fileName.split(".").pop() || "jpg").toLowerCase();
    const path = `${context.userId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from("promo-images")
      .upload(path, bytes, { contentType, upsert: false });
    if (error) throw error;

    const { data: pub } = supabaseAdmin.storage.from("promo-images").getPublicUrl(path);
    return { ok: true, url: pub.publicUrl };
  });

// ---- Admin: catálogo principal, para elegir productos al armar una promo ----

export const adminSearchCatalogForPromo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, name, price, unit, image_url")
      .eq("active", true)
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

// ---- Admin: promociones (paquetes) ----

export const adminListPromotions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("promotions")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    const itemsByPromo = await resolveItems(supabaseAdmin, (data ?? []).map((p: any) => p.id));
    return (data ?? []).map((p: any) => mapPromotion(p, itemsByPromo.get(p.id) ?? []));
  });

export const adminUpsertPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      title: string;
      subtitle: string;
      description: string;
      imageUrl?: string | null;
      price?: number | null;
      active: boolean;
      sortOrder: number;
      items: { source: "promo" | "catalog"; productId: string; quantity: number }[];
    }) => {
      const title = input.title?.trim() ?? "";
      if (!title) throw new Error("El título es obligatorio");
      if (title.length > 150) throw new Error("Título demasiado largo");
      const items = (input.items ?? []).filter((it) => it.productId);
      return {
        id: input.id,
        title,
        subtitle: input.subtitle?.trim() ?? "",
        description: input.description?.trim() ?? "",
        imageUrl: input.imageUrl ?? null,
        price:
          input.price === null || input.price === undefined || Number.isNaN(input.price)
            ? null
            : Number(input.price),
        active: !!input.active,
        sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
        items: items.map((it, idx) => ({
          source: it.source,
          productId: it.productId,
          quantity: Math.max(1, Math.floor(it.quantity) || 1),
          sortOrder: idx,
        })),
      };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      title: data.title,
      subtitle: data.subtitle,
      description: data.description,
      image_url: data.imageUrl,
      price: data.price,
      active: data.active,
      sort_order: data.sortOrder,
    };

    let promotionId = data.id;
    if (promotionId) {
      const { error } = await supabaseAdmin.from("promotions").update(payload).eq("id", promotionId);
      if (error) throw error;
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("promotions")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      promotionId = created.id;
    }

    // Reemplaza todos los ítems de la promoción por la lista enviada.
    const { error: delErr } = await supabaseAdmin
      .from("promotion_items")
      .delete()
      .eq("promotion_id", promotionId);
    if (delErr) throw delErr;

    if (data.items.length > 0) {
      const { error: insErr } = await supabaseAdmin.from("promotion_items").insert(
        data.items.map((it) => ({
          promotion_id: promotionId,
          source: it.source,
          product_id: it.productId,
          quantity: it.quantity,
          sort_order: it.sortOrder,
        })),
      );
      if (insErr) throw insErr;
    }

    return { ok: true, id: promotionId };
  });

export const adminDeletePromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Falta la promoción");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("promotions").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
