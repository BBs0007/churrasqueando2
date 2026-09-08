import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CatalogProduct = {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  unit: string;
  description: string;
  image?: string;
  is_best_seller: boolean;
  active: boolean;
  sort_order: number;
};

export type CatalogCategory = {
  id: string;
  name: string;
  tagline: string;
  sort_order: number;
  section_id: string | null;
  products: CatalogProduct[];
};

export type StoreSection = {
  id: string;
  kind: "best_sellers" | "combos" | "categories";
  title: string;
  sort_order: number;
};

function mapProduct(row: any): CatalogProduct {
  return {
    id: row.id,
    category_id: row.category_id,
    name: row.name,
    price: Number(row.price),
    unit: row.unit,
    description: row.description,
    image: row.image_url ?? undefined,
    is_best_seller: row.is_best_seller,
    active: row.active,
    sort_order: row.sort_order,
  };
}

// Public: storefront catalog (only active products) + section layout/order
export const getStoreCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [
    { data: cats, error: catErr },
    { data: prods, error: prodErr },
    { data: layoutRows, error: layoutErr },
    { data: comboRows, error: comboErr },
  ] = await Promise.all([
    supabaseAdmin.from("product_categories").select("*").order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("products")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabaseAdmin.from("store_sections").select("*").order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("combos")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ]);
  if (catErr) throw catErr;
  if (prodErr) throw prodErr;
  if (layoutErr) throw layoutErr;
  if (comboErr) throw comboErr;

  const products = (prods ?? []).map(mapProduct);
  const categories: CatalogCategory[] = (cats ?? [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      tagline: c.tagline,
      sort_order: c.sort_order,
      section_id: c.section_id,
      products: products.filter((p) => p.category_id === c.id),
    }))
    .filter((c) => c.products.length > 0);

  const layout = (layoutRows ?? []) as StoreSection[];

  const bestSellers = products.filter((p) => p.is_best_seller);

  const combos = (comboRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    unit: row.unit,
    description: row.description,
    items: row.items ?? [],
    image: row.image_url ?? undefined,
    active: row.active,
    sort_order: row.sort_order,
  }));

  return { categories, bestSellers, layout, combos };
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("No autorizado");
}

// Admin: full product list (including inactive) + categories
export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: prods, error: prodErr }, { data: cats, error: catErr }] = await Promise.all([
      supabaseAdmin.from("products").select("*").order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("product_categories")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);
    if (prodErr) throw prodErr;
    if (catErr) throw catErr;

    return {
      products: (prods ?? []).map(mapProduct),
      categories: (cats ?? []) as {
        id: string;
        name: string;
        tagline: string;
        sort_order: number;
      }[],
    };
  });

export const adminUpsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; name: string; tagline: string }) => {
    const name = input.name?.trim() ?? "";
    if (!name) throw new Error("El nombre es obligatorio");
    if (name.length > 80) throw new Error("Nombre demasiado largo");
    return { id: input.id, name, tagline: input.tagline?.trim() ?? "" };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("product_categories")
        .update({ name: data.name, tagline: data.tagline })
        .eq("id", data.id);
      if (error) throw error;
      return { ok: true, id: data.id };
    }

    const slugBase = data.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (!slugBase) throw new Error("Nombre inválido para generar la categoría");

    const { data: maxRow } = await supabaseAdmin
      .from("product_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextSort = (maxRow?.sort_order ?? 0) + 10;

    let id = slugBase;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { error } = await supabaseAdmin
        .from("product_categories")
        .insert({ id, name: data.name, tagline: data.tagline, sort_order: nextSort });
      if (!error) return { ok: true, id };
      if (error.code !== "23505") throw error; // not a unique-violation, bail out
      id = `${slugBase}-${attempt + 2}`;
    }
    throw new Error("No se pudo crear la categoría, intenta con otro nombre");
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Falta la categoría");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countErr } = await supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", data.id);
    if (countErr) throw countErr;
    if ((count ?? 0) > 0) {
      throw new Error(
        "No puedes eliminar una categoría con productos. Mueve o elimina esos productos primero.",
      );
    }

    const { error } = await supabaseAdmin.from("product_categories").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Persist a new drag-and-drop order for the products of a single category.
export const adminReorderProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderedIds: string[] }) => {
    if (!Array.isArray(input?.orderedIds) || input.orderedIds.length === 0) {
      throw new Error("Nada que reordenar");
    }
    return { orderedIds: input.orderedIds };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Reuse the existing sort_order values of these exact rows so the new
    // order slots into the same range as before, without touching other
    // categories' ordering.
    const { data: rows, error: fetchErr } = await supabaseAdmin
      .from("products")
      .select("id, sort_order")
      .in("id", data.orderedIds);
    if (fetchErr) throw fetchErr;

    const slots = (rows ?? []).map((r) => r.sort_order).sort((a, b) => a - b);
    const updates = data.orderedIds.map((id, i) => ({ id, sort_order: slots[i] }));

    for (const u of updates) {
      const { error } = await supabaseAdmin
        .from("products")
        .update({ sort_order: u.sort_order })
        .eq("id", u.id);
      if (error) throw error;
    }
    return { ok: true };
  });

// Admin: full store layout (all categories incl. empty, section list) for the visual editor.
export const adminGetStoreLayout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: sections, error: secErr }, { data: cats, error: catErr }, { data: prods, error: prodErr }, { data: comboRows, error: comboErr }] =
      await Promise.all([
        supabaseAdmin.from("store_sections").select("*").order("sort_order", { ascending: true }),
        supabaseAdmin
          .from("product_categories")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabaseAdmin
          .from("products")
          .select("*")
          .eq("active", true)
          .order("sort_order", { ascending: true }),
        supabaseAdmin.from("combos").select("*").order("sort_order", { ascending: true }),
      ]);
    if (secErr) throw secErr;
    if (catErr) throw catErr;
    if (prodErr) throw prodErr;
    if (comboErr) throw comboErr;

    const products = (prods ?? []).map(mapProduct);
    const categories: CatalogCategory[] = (cats ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      tagline: c.tagline,
      sort_order: c.sort_order,
      section_id: c.section_id,
      products: products.filter((p) => p.category_id === c.id),
    }));

    const combos = (comboRows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      price: Number(row.price),
      unit: row.unit,
      description: row.description,
      items: row.items ?? [],
      image: row.image_url ?? undefined,
      active: row.active,
      sort_order: row.sort_order,
    }));

    return { sections: (sections ?? []) as StoreSection[], categories, combos };
  });

// Persist a new order for the top-level store blocks (best sellers, combos,
// category sections) shown on the storefront.
export const adminReorderSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderedIds: string[] }) => {
    if (!Array.isArray(input?.orderedIds) || input.orderedIds.length === 0) {
      throw new Error("Nada que reordenar");
    }
    return { orderedIds: input.orderedIds };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error: fetchErr } = await supabaseAdmin
      .from("store_sections")
      .select("id, sort_order")
      .in("id", data.orderedIds);
    if (fetchErr) throw fetchErr;

    const slots = (rows ?? []).map((r) => r.sort_order).sort((a, b) => a - b);
    for (let i = 0; i < data.orderedIds.length; i++) {
      const { error } = await supabaseAdmin
        .from("store_sections")
        .update({ sort_order: slots[i] })
        .eq("id", data.orderedIds[i]);
      if (error) throw error;
    }
    return { ok: true };
  });

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      categoryId: string;
      name: string;
      price: number;
      unit: string;
      description: string;
      imageUrl?: string | null;
      isBestSeller: boolean;
      active: boolean;
    }) => {
      const name = input.name?.trim() ?? "";
      const unit = input.unit?.trim() ?? "";
      if (!name) throw new Error("El nombre es obligatorio");
      if (!input.categoryId) throw new Error("Selecciona una categoría");
      if (!(input.price >= 0)) throw new Error("Precio inválido");
      if (name.length > 150) throw new Error("Nombre demasiado largo");
      return {
        id: input.id,
        categoryId: input.categoryId,
        name,
        price: input.price,
        unit,
        description: input.description?.trim() ?? "",
        imageUrl: input.imageUrl ?? null,
        isBestSeller: !!input.isBestSeller,
        active: !!input.active,
      };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      category_id: data.categoryId,
      name: data.name,
      price: data.price,
      unit: data.unit,
      description: data.description,
      image_url: data.imageUrl,
      is_best_seller: data.isBestSeller,
      active: data.active,
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("products").update(payload).eq("id", data.id);
      if (error) throw error;
      return { ok: true, id: data.id };
    }

    const { data: created, error } = await supabaseAdmin
      .from("products")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, id: created.id };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Falta el producto");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Accepts a data: URL (base64) from a file input and stores it in the
// product-images bucket, returning a public URL to save on the product.
export const adminUploadProductImage = createServerFn({ method: "POST" })
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
      .from("product-images")
      .upload(path, bytes, { contentType, upsert: false });
    if (error) throw error;

    const { data: pub } = supabaseAdmin.storage.from("product-images").getPublicUrl(path);
    return { ok: true, url: pub.publicUrl };
  });
