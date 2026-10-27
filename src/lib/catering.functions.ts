import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type CateringPackage = {
  id: string;
  image_url: string;
  name: string;
  highlight: string;
  price: number;
  portion: string;
  includesNote: string;
  picada: string;
  cortes: string[];
  guarniciones: string[];
  utencilios: string[];
  active: boolean;
  sort_order: number;
};

type CateringPackageRow = Database["public"]["Tables"]["catering_packages"]["Row"];

function mapPackage(row: CateringPackageRow): CateringPackage {
  return {
    id: row.id,
    image_url: row.image_url ?? "",
    name: row.name,
    highlight: row.highlight ?? "",
    price: Number(row.price),
    portion: row.portion ?? "",
    includesNote: row.includes_note ?? "",
    picada: row.picada ?? "",
    cortes: stringList(row.cortes),
    guarniciones: stringList(row.guarniciones),
    utencilios: stringList(row.utencilios),
    active: row.active,
    sort_order: row.sort_order,
  };
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function throwCateringPackageError(error: { code?: string; message: string }) {
  if (error.code === "42703" || error.code === "PGRST204" || error.message.includes("image_url")) {
    throw new Error(
      "La base de datos aún no tiene el campo de imagen de Catering. Aplica la migración 20261026220000_catering_package_images.sql en Supabase.",
    );
  }
  throw error;
}

export const getPublicCateringPackages = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("catering_packages")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapPackage);
});

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("No autorizado");
}

export const adminListCateringPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("catering_packages")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapPackage);
  });

export const adminUpsertCateringPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      imageUrl: string;
      name: string;
      highlight: string;
      price: number;
      portion: string;
      includesNote: string;
      picada: string;
      cortes: string[];
      guarniciones: string[];
      utencilios: string[];
      active: boolean;
      sortOrder: number;
    }) => {
      const name = input.name?.trim() ?? "";
      if (!name) throw new Error("El nombre es obligatorio");
      if (name.length > 100) throw new Error("Nombre demasiado largo");
      if (!(input.price >= 0)) throw new Error("Precio inválido");
      const imageUrl = input.imageUrl?.trim() ?? "";
      if (
        imageUrl.length > 2_000 ||
        (imageUrl &&
          !(
            (imageUrl.startsWith("/") && !imageUrl.startsWith("//")) ||
            /^https?:\/\//i.test(imageUrl)
          ))
      ) {
        throw new Error("La URL de imagen no es válida");
      }
      return {
        id: input.id,
        imageUrl,
        name,
        highlight: input.highlight?.trim() ?? "",
        price: input.price,
        portion: input.portion?.trim() ?? "",
        includesNote: input.includesNote?.trim() ?? "",
        picada: input.picada?.trim() ?? "",
        cortes: (input.cortes ?? []).map((c) => c.trim()).filter(Boolean),
        guarniciones: (input.guarniciones ?? []).map((c) => c.trim()).filter(Boolean),
        utencilios: (input.utencilios ?? []).map((c) => c.trim()).filter(Boolean),
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
      image_url: data.imageUrl,
      highlight: data.highlight,
      price: data.price,
      portion: data.portion,
      includes_note: data.includesNote,
      picada: data.picada,
      cortes: data.cortes,
      guarniciones: data.guarniciones,
      utencilios: data.utencilios,
      active: data.active,
      sort_order: data.sortOrder,
    };

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("catering_packages")
        .update(payload)
        .eq("id", data.id);
      if (error) throwCateringPackageError(error);
      return { ok: true, id: data.id };
    }

    const { data: created, error } = await supabaseAdmin
      .from("catering_packages")
      .insert(payload)
      .select("id")
      .single();
    if (error) throwCateringPackageError(error);
    return { ok: true, id: created.id };
  });

export const adminDeleteCateringPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Falta el paquete");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("catering_packages").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
