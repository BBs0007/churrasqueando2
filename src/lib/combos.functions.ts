import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("No autorizado");
}

export type StoreCombo = {
  id: string;
  name: string;
  price: number;
  unit: string;
  description: string;
  items: string[];
  image?: string;
  active: boolean;
  sort_order: number;
};

function mapCombo(row: any): StoreCombo {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    unit: row.unit,
    description: row.description,
    items: row.items ?? [],
    image: row.image_url ?? undefined,
    active: row.active,
    sort_order: row.sort_order,
  };
}

// Public: active combos only, for storefront-style sections (home, tienda,
// club, dashboard del cliente). No auth required.
export const getStoreCombos = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("combos")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return { combos: (data ?? []).map(mapCombo) };
});

export const adminListCombos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("combos")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return { combos: (data ?? []).map(mapCombo) };
  });

export const adminUpsertCombo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      price: number;
      unit: string;
      description: string;
      items: string[];
      imageUrl?: string | null;
      active: boolean;
    }) => {
      const name = input.name?.trim() ?? "";
      if (!name) throw new Error("El nombre es obligatorio");
      if (!(input.price >= 0)) throw new Error("Precio inválido");
      return {
        id: input.id,
        name,
        price: input.price,
        unit: input.unit?.trim() ?? "",
        description: input.description?.trim() ?? "",
        items: (input.items ?? []).map((i) => i.trim()).filter(Boolean),
        imageUrl: input.imageUrl ?? null,
        active: !!input.active,
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
      items: data.items,
      image_url: data.imageUrl,
      active: data.active,
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("combos").update(payload).eq("id", data.id);
      if (error) throw error;
      return { ok: true, id: data.id };
    }

    const slug =
      "combo-" +
      data.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const { data: maxRow } = await supabaseAdmin
      .from("combos")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextSort = (maxRow?.sort_order ?? 0) + 10;

    let id = slug || `combo-${Date.now()}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { error } = await supabaseAdmin
        .from("combos")
        .insert({ id, ...payload, sort_order: nextSort });
      if (!error) return { ok: true, id };
      if (error.code !== "23505") throw error;
      id = `${slug}-${attempt + 2}`;
    }
    throw new Error("No se pudo crear el combo, intenta con otro nombre");
  });

export const adminDeleteCombo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Falta el combo");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("combos").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminReorderCombos = createServerFn({ method: "POST" })
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
      .from("combos")
      .select("id, sort_order")
      .in("id", data.orderedIds);
    if (fetchErr) throw fetchErr;

    const slots = (rows ?? []).map((r) => r.sort_order).sort((a, b) => a - b);
    for (let i = 0; i < data.orderedIds.length; i++) {
      const { error } = await supabaseAdmin
        .from("combos")
        .update({ sort_order: slots[i] })
        .eq("id", data.orderedIds[i]);
      if (error) throw error;
    }
    return { ok: true };
  });
