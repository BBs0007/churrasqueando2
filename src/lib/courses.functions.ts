import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ClubCourse = {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  description: string;
  bullets: string[];
  image: string | null;
  active: boolean;
  sort_order: number;
};

function mapCourse(row: any): ClubCourse {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    tag: row.tag,
    description: row.description,
    bullets: Array.isArray(row.bullets) ? row.bullets : [],
    image: row.image_url ?? null,
    active: row.active,
    sort_order: row.sort_order,
  };
}

// Public: active courses shown on /club (marketing) and /cursos (members only)
export const getPublicCourses = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("club_courses")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapCourse);
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("No autorizado");
}

export const adminListCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("club_courses")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapCourse);
  });

export const adminUpsertCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      title: string;
      subtitle: string;
      tag: string;
      description: string;
      bullets: string[];
      imageUrl?: string | null;
      active: boolean;
      sortOrder: number;
    }) => {
      const title = input.title?.trim() ?? "";
      if (!title) throw new Error("El título es obligatorio");
      if (title.length > 150) throw new Error("Título demasiado largo");
      return {
        id: input.id,
        title,
        subtitle: input.subtitle?.trim() ?? "",
        tag: input.tag?.trim() ?? "",
        description: input.description?.trim() ?? "",
        bullets: (input.bullets ?? []).map((b) => b.trim()).filter(Boolean),
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
      title: data.title,
      subtitle: data.subtitle,
      tag: data.tag,
      description: data.description,
      bullets: data.bullets,
      image_url: data.imageUrl,
      active: data.active,
      sort_order: data.sortOrder,
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("club_courses").update(payload).eq("id", data.id);
      if (error) throw error;
      return { ok: true, id: data.id };
    }

    const { data: created, error } = await supabaseAdmin
      .from("club_courses")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, id: created.id };
  });

export const adminDeleteCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Falta el curso");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("club_courses").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminUploadCourseImage = createServerFn({ method: "POST" })
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
      .from("course-images")
      .upload(path, bytes, { contentType, upsert: false });
    if (error) throw error;

    const { data: pub } = supabaseAdmin.storage.from("course-images").getPublicUrl(path);
    return { ok: true, url: pub.publicUrl };
  });
