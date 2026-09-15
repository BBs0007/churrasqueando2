import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Contenido editable de /club: cada "key" es un texto o una URL de imagen
// que el admin puede sobreescribir. Si una key no está en la base de datos,
// el frontend usa el valor por defecto que ya tenía escrito (ver
// DEFAULT_CLUB_CONTENT en club.tsx), así que esta tabla solo guarda las
// diferencias que el admin haya editado.
export const getClubContent = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("club_content").select("key, value");
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return map;
});

async function assertAdmin(context: { supabase: any; userId: string }) {
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
    if (keys.length > 60) throw new Error("Demasiados campos");
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
      .from("club-content")
      .upload(path, bytes, { contentType, upsert: false });
    if (error) throw error;

    const { data: pub } = supabaseAdmin.storage.from("club-content").getPublicUrl(path);
    return { ok: true, url: pub.publicUrl };
  });
