import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PublicBranch = {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  active: boolean;
  sort_order: number;
};

function mapBranch(row: any): PublicBranch {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    lat: Number(row.lat),
    lng: Number(row.lng),
    active: row.active,
    sort_order: row.sort_order,
  };
}

// Public: active branches shown on the homepage "Puntos de venta" section
export const getPublicBranches = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("branches")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapBranch);
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("No autorizado");
}

export const adminListBranches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("branches")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapBranch);
  });

export const adminUpsertBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      address: string;
      city: string;
      lat: number;
      lng: number;
      active: boolean;
      sortOrder: number;
    }) => {
      const name = input.name?.trim() ?? "";
      if (!name) throw new Error("El nombre es obligatorio");
      if (name.length > 150) throw new Error("Nombre demasiado largo");
      if (!(input.lat >= -90 && input.lat <= 90)) throw new Error("Latitud inválida");
      if (!(input.lng >= -180 && input.lng <= 180)) throw new Error("Longitud inválida");
      return {
        id: input.id,
        name,
        address: input.address?.trim() ?? "",
        city: input.city?.trim() ?? "",
        lat: input.lat,
        lng: input.lng,
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
      address: data.address,
      city: data.city,
      lat: data.lat,
      lng: data.lng,
      active: data.active,
      sort_order: data.sortOrder,
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("branches").update(payload).eq("id", data.id);
      if (error) throw error;
      return { ok: true, id: data.id };
    }

    const { data: created, error } = await supabaseAdmin
      .from("branches")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, id: created.id };
  });

export const adminDeleteBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Falta el punto de venta");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("branches").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
