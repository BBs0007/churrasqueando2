import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  CLUB_LANDING_COLLECTION_DEFAULTS,
  CLUB_LANDING_DEFAULTS,
  CLUB_LANDING_SECTIONS,
  validateClubBuilderLayout,
} from "@/lib/club-landing-content";
import { validateCoursePageSections } from "@/lib/course-page-content";

// El contenido editado de /club se almacena por clave; los valores iniciales
// y la organización de las secciones viven en club-landing-content.ts.
export const getClubContent = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("club_content").select("key, value");
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return map;
});

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("No autorizado");
}

export const adminSaveClubContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { entries: Record<string, string> }) => {
    const entries = input?.entries ?? {};
    const keys = Object.keys(entries);
    if (keys.length === 0) throw new Error("Nada para guardar");
    if (keys.length > 100) throw new Error("Demasiados campos");
    const collectionFields = new Map(
      CLUB_LANDING_SECTIONS.flatMap((section) =>
        (section.collections ?? []).map((collection) => [collection.key, collection.fields]),
      ),
    );
    for (const [key, value] of Object.entries(entries)) {
      if (!Object.hasOwn(CLUB_LANDING_DEFAULTS, key)) {
        throw new Error(`Campo de contenido no permitido: ${key}`);
      }
      const maxLength = ["club_builder", "courses_page_builder", "catering_page_builder"].includes(
        key,
      )
        ? 500_000
        : 30_000;
      if (typeof value !== "string" || value.length > maxLength) {
        throw new Error(`El campo ${key} no es válido o es demasiado largo`);
      }
      if (key === "club_builder") validateClubBuilderLayout(value);
      if (key === "courses_page_builder") validateCoursePageSections(value);
      if (key === "catering_page_builder") validateCoursePageSections(value);
      if (Object.hasOwn(CLUB_LANDING_COLLECTION_DEFAULTS, key)) {
        let collection: unknown;
        try {
          collection = JSON.parse(value);
        } catch {
          throw new Error(`La lista "${key}" tiene un formato inválido`);
        }
        if (!Array.isArray(collection) || collection.length > 50) {
          throw new Error(`La lista "${key}" no es válida o contiene demasiados elementos`);
        }
        const fields = collectionFields.get(key) ?? [];
        collection.forEach((item, index) => {
          if (typeof item !== "object" || item === null || Array.isArray(item)) {
            throw new Error(`El elemento ${index + 1} de "${key}" no es válido`);
          }
          for (const field of fields) {
            const fieldValue = (item as Record<string, unknown>)[field.key];
            if (field.optional && (fieldValue == null || fieldValue === "")) continue;
            if (typeof fieldValue !== "string" || !fieldValue.trim()) {
              throw new Error(`Completa "${field.label}" en el elemento ${index + 1} de "${key}"`);
            }
          }
        });
      }
    }
    for (const key of [
      "membership_annual_price",
      "membership_regular_price",
      "founders_total",
      "founders_remaining",
    ]) {
      if (
        key in entries &&
        (!/^\d+$/.test(entries[key]) ||
          Number(entries[key]) > 1_000_000 ||
          (key !== "founders_remaining" && Number(entries[key]) < 1))
      ) {
        throw new Error(`El campo ${key} debe ser un número entero válido`);
      }
    }
    if (
      "founders_total" in entries &&
      "founders_remaining" in entries &&
      Number(entries.founders_remaining) > Number(entries.founders_total)
    ) {
      throw new Error("Los cupos disponibles no pueden superar los cupos totales");
    }
    return { entries };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = Object.entries(data.entries).map(([key, value]) => ({
      key,
      value: value ?? "",
    }));
    const { error } = await supabaseAdmin.from("club_content").upsert(rows, { onConflict: "key" });
    if (error) throw error;
    return { ok: true };
  });

export const adminUploadClubImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileName: string; dataUrl: string }) => {
    if (!input?.dataUrl?.startsWith("data:image/")) throw new Error("Selecciona una imagen válida");
    if (input.dataUrl.length > 8_100_000) throw new Error("La imagen es demasiado grande");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const match = data.dataUrl.match(/^data:(.+);base64,(.*)$/);
    if (!match) throw new Error("Imagen inválida");
    const contentType = match[1];
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      throw new Error("Usa una imagen PNG, JPG o WebP");
    }
    const bytes = Buffer.from(match[2], "base64");

    const ext = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
    const path = `${context.userId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from("club-content")
      .upload(path, bytes, { contentType, upsert: false });
    if (error) throw error;

    const { data: pub } = supabaseAdmin.storage.from("club-content").getPublicUrl(path);
    return { ok: true, url: pub.publicUrl };
  });

export const adminCreateClubVideoUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { contentType: string }) => {
    const extensions: Record<string, string> = {
      "video/mp4": "mp4",
      "video/webm": "webm",
      "video/ogg": "ogv",
    };
    const extension = extensions[input?.contentType];
    if (!extension) throw new Error("Usa un video MP4, WebM u OGG");
    return { contentType: input.contentType, extension };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${context.userId}/${crypto.randomUUID()}.${data.extension}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("club-content")
      .createSignedUploadUrl(path);
    if (error) throw error;

    const { data: publicData } = supabaseAdmin.storage.from("club-content").getPublicUrl(path);
    return {
      path,
      token: signed.token,
      publicUrl: publicData.publicUrl,
      contentType: data.contentType,
    };
  });
