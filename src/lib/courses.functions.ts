import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type CourseServerContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

function throwIfCourseMigrationMissing(error: { code?: string }): never {
  if (["42P01", "PGRST204", "PGRST205"].includes(error.code ?? "")) {
    throw new Error(
      "La base de datos aún no tiene la estructura de subcursos. Aplica la migración 20261009150000_club_subcourses_comments.sql en Supabase.",
    );
  }
  throw error;
}

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

function mapCourse(row: Database["public"]["Tables"]["club_courses"]["Row"]): ClubCourse {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    tag: row.tag,
    description: row.description,
    bullets: Array.isArray(row.bullets)
      ? row.bullets.filter((bullet): bullet is string => typeof bullet === "string")
      : [],
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

async function assertAdmin(context: CourseServerContext) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("No autorizado");
}

async function requireCourseAccess(context: CourseServerContext) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [profileResult, roleResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("membership_status, membership_expires_at")
      .eq("id", context.userId)
      .maybeSingle(),
    context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    }),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (roleResult.error) throw roleResult.error;

  const profile = profileResult.data;
  const isAdmin = !!roleResult.data;
  const isMember =
    profile?.membership_status === "active" &&
    (!profile.membership_expires_at ||
      new Date(profile.membership_expires_at).getTime() > Date.now());

  if (!isAdmin && !isMember) throw new Error("Necesitas una membresía activa para ver los cursos");
  return { isAdmin, isMember };
}

async function assertSubcourseAvailable(subcourseId: string, isAdmin: boolean) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subcourse, error: subcourseError } = await supabaseAdmin
    .from("club_subcourses")
    .select("course_id, active")
    .eq("id", subcourseId)
    .maybeSingle();
  if (subcourseError) throw subcourseError;
  if (!subcourse) throw new Error("No se encontró el subcurso");

  const { data: course, error: courseError } = await supabaseAdmin
    .from("club_courses")
    .select("active")
    .eq("id", subcourse.course_id)
    .maybeSingle();
  if (courseError) throw courseError;
  if (!course) throw new Error("No se encontró el curso");
  if (!isAdmin && (!subcourse.active || !course.active)) {
    throw new Error("Este contenido no está disponible");
  }
}

async function assertLessonAvailable(lessonId: string, isAdmin: boolean) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: lesson, error: lessonError } = await supabaseAdmin
    .from("course_lessons")
    .select("id, subcourse_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (lessonError) throw lessonError;
  if (!lesson) throw new Error("No se encontró el video de esta lección");

  await assertSubcourseAvailable(lesson.subcourse_id, isAdmin);
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

// ---- Lecciones ("subtítulos") de cada curso ----

export type CourseLesson = {
  id: string;
  courseId: string;
  subcourseId: string;
  title: string;
  description: string;
  videoUrl: string | null;
  pdfUrl: string | null;
  completed: boolean;
  sortOrder: number;
};

function mapLesson(
  row: Database["public"]["Tables"]["course_lessons"]["Row"],
  completed = false,
): CourseLesson {
  return {
    id: row.id,
    courseId: row.course_id,
    subcourseId: row.subcourse_id,
    title: row.title,
    description: row.description,
    videoUrl: row.video_url ?? null,
    pdfUrl: row.pdf_url ?? null,
    completed,
    sortOrder: row.sort_order,
  };
}

export type CourseSubcourse = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  active: boolean;
  sortOrder: number;
};

function mapSubcourse(
  row: Database["public"]["Tables"]["club_subcourses"]["Row"],
): CourseSubcourse {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    active: row.active,
    sortOrder: row.sort_order,
  };
}

export const getPublicCourseSubcourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseId: string }) => {
    if (!input?.courseId) throw new Error("Falta el curso");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { isAdmin } = await requireCourseAccess(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: course, error: courseError } = await supabaseAdmin
      .from("club_courses")
      .select("active")
      .eq("id", data.courseId)
      .maybeSingle();
    if (courseError) throw courseError;
    if (!course || (!course.active && !isAdmin)) throw new Error("Este curso no está disponible");
    const { data: rows, error } = await supabaseAdmin
      .from("club_subcourses")
      .select("*")
      .eq("course_id", data.courseId)
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throwIfCourseMigrationMissing(error);
    return (rows ?? []).map(mapSubcourse);
  });

export const adminListSubcourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseId: string }) => {
    if (!input?.courseId) throw new Error("Falta el curso");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("club_subcourses")
      .select("*")
      .eq("course_id", data.courseId)
      .order("sort_order", { ascending: true });
    if (error) throwIfCourseMigrationMissing(error);
    return (rows ?? []).map(mapSubcourse);
  });

export const adminUpsertSubcourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      courseId: string;
      title: string;
      description: string;
      active: boolean;
      sortOrder: number;
    }) => {
      const title = input.title?.trim() ?? "";
      if (!input.courseId) throw new Error("Falta el curso");
      if (!title) throw new Error("El título del subcurso es obligatorio");
      if (title.length > 150) throw new Error("Título demasiado largo");
      return {
        id: input.id,
        courseId: input.courseId,
        title,
        description: input.description?.trim() ?? "",
        active: !!input.active,
        sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
      };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      course_id: data.courseId,
      title: data.title,
      description: data.description,
      active: data.active,
      sort_order: data.sortOrder,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("club_subcourses")
        .update(payload)
        .eq("id", data.id);
      if (error) throwIfCourseMigrationMissing(error);
      return { ok: true, id: data.id };
    }

    const { data: created, error } = await supabaseAdmin
      .from("club_subcourses")
      .insert(payload)
      .select("id")
      .single();
    if (error) throwIfCourseMigrationMissing(error);
    return { ok: true, id: created.id };
  });

export const adminDeleteSubcourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Falta el subcurso");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("club_subcourses").delete().eq("id", data.id);
    if (error) throwIfCourseMigrationMissing(error);
    return { ok: true };
  });

export const getPublicCourseLessons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subcourseId: string }) => {
    if (!input?.subcourseId) throw new Error("Falta el subcurso");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { isAdmin } = await requireCourseAccess(context);
    await assertSubcourseAvailable(data.subcourseId, isAdmin);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("course_lessons")
      .select("*")
      .eq("subcourse_id", data.subcourseId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    const lessonRows = rows ?? [];
    const { data: progress, error: progressError } = lessonRows.length
      ? await supabaseAdmin
          .from("course_lesson_progress")
          .select("lesson_id")
          .eq("user_id", context.userId)
          .in(
            "lesson_id",
            lessonRows.map((lesson) => lesson.id),
          )
      : { data: [], error: null };
    if (progressError) throw progressError;
    const completedLessons = new Set((progress ?? []).map((item) => item.lesson_id));
    return lessonRows.map((row) => mapLesson(row, completedLessons.has(row.id)));
  });

export const adminListLessons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subcourseId: string }) => {
    if (!input?.subcourseId) throw new Error("Falta el subcurso");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("course_lessons")
      .select("*")
      .eq("subcourse_id", data.subcourseId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (rows ?? []).map((row) => mapLesson(row));
  });

export const adminUpsertLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      courseId: string;
      subcourseId: string;
      title: string;
      description: string;
      videoUrl?: string | null;
      pdfUrl?: string | null;
      sortOrder: number;
    }) => {
      const title = input.title?.trim() ?? "";
      if (!title) throw new Error("El título de la lección es obligatorio");
      if (!input.courseId) throw new Error("Falta el curso");
      if (!input.subcourseId) throw new Error("Falta el subcurso");
      return {
        id: input.id,
        courseId: input.courseId,
        subcourseId: input.subcourseId,
        title,
        description: input.description?.trim() ?? "",
        videoUrl: input.videoUrl ?? null,
        pdfUrl: input.pdfUrl ?? null,
        sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
      };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      course_id: data.courseId,
      subcourse_id: data.subcourseId,
      title: data.title,
      description: data.description,
      video_url: data.videoUrl,
      pdf_url: data.pdfUrl,
      sort_order: data.sortOrder,
    };

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("course_lessons")
        .update(payload)
        .eq("id", data.id);
      if (error) throw error;
      return { ok: true, id: data.id };
    }

    const { data: created, error } = await supabaseAdmin
      .from("course_lessons")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, id: created.id };
  });

export const adminDeleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Falta la lección");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("course_lessons").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// El video se sube directo del navegador a Supabase Storage (no pasa por
// esta función de servidor) para evitar límites de tamaño de payload. Esta
// función solo genera una URL firmada de subida y valida que quien la pide
// sea admin.
export const adminCreateLessonVideoUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileName: string }) => {
    if (!input?.fileName) throw new Error("Falta el archivo");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ext = (data.fileName.split(".").pop() || "mp4").toLowerCase();
    const path = `${context.userId}/${crypto.randomUUID()}.${ext}`;

    const { data: signed, error } = await supabaseAdmin.storage
      .from("course-videos")
      .createSignedUploadUrl(path);
    if (error) throw error;

    const { data: pub } = supabaseAdmin.storage.from("course-videos").getPublicUrl(path);
    return { ok: true, path, token: signed.token, publicUrl: pub.publicUrl };
  });

export const completeCourseLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lessonId: string }) => {
    if (!input?.lessonId) throw new Error("Falta la lección");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { isMember } = await requireCourseAccess(context);
    if (!isMember) throw new Error("Necesitas una membresía activa para ganar Puntos de Brasa");
    const { data: result, error } = await context.supabase.rpc("complete_course_lesson", {
      p_lesson_id: data.lessonId,
    });
    if (error) throw error;
    const completion = result[0];
    if (!completion) throw new Error("No se pudo registrar el avance de la lección");
    return {
      lessonPoints: completion.lesson_points,
      courseBonus: completion.course_bonus,
      courseCompleted: completion.course_completed,
    };
  });

export const adminCreateLessonPdfUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileName: string }) => {
    if (!input?.fileName?.toLowerCase().endsWith(".pdf")) {
      throw new Error("Selecciona un archivo PDF");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const path = `${context.userId}/${crypto.randomUUID()}.pdf`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("course-materials")
      .createSignedUploadUrl(path);
    if (error) throw error;

    const { data: pub } = supabaseAdmin.storage.from("course-materials").getPublicUrl(path);
    return { ok: true, path, token: signed.token, publicUrl: pub.publicUrl };
  });

export type CourseLessonComment = {
  id: string;
  lessonId: string;
  userId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

const COMMENTS_PAGE_SIZE = 50;

export const getCourseLessonComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lessonId: string; page: number }) => {
    if (!input?.lessonId) throw new Error("Falta la lección");
    if (!Number.isInteger(input.page) || input.page < 0 || input.page > 1000) {
      throw new Error("Página de comentarios inválida");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { isAdmin } = await requireCourseAccess(context);
    await assertLessonAvailable(data.lessonId, isAdmin);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const start = data.page * COMMENTS_PAGE_SIZE;
    const { data: rows, error } = await supabaseAdmin
      .from("course_lesson_comments")
      .select("id, lesson_id, user_id, body, created_at")
      .eq("lesson_id", data.lessonId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(start, start + COMMENTS_PAGE_SIZE);
    if (error) throw error;

    const pageRows = rows ?? [];
    const userIds = [...new Set(pageRows.map((row) => row.user_id))];
    const { data: profiles, error: profilesError } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [], error: null };
    if (profilesError) throw profilesError;
    const profileNames = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile.full_name]),
    );

    return {
      comments: pageRows.slice(0, COMMENTS_PAGE_SIZE).map((row) => ({
        id: row.id,
        lessonId: row.lesson_id,
        userId: row.user_id,
        authorName: profileNames.get(row.user_id)?.trim() || "Socio del Club",
        body: row.body,
        createdAt: row.created_at,
      })),
      hasMore: pageRows.length > COMMENTS_PAGE_SIZE,
    };
  });

export const createCourseLessonComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lessonId: string; body: string }) => {
    const body = input.body?.trim() ?? "";
    if (!input?.lessonId) throw new Error("Falta la lección");
    if (!body) throw new Error("Escribe un comentario antes de publicarlo");
    if (body.length > 1000) throw new Error("El comentario no puede superar los 1000 caracteres");
    return { lessonId: input.lessonId, body };
  })
  .handler(async ({ data, context }) => {
    const { isMember } = await requireCourseAccess(context);
    if (!isMember) throw new Error("Solo los socios con membresía activa pueden comentar");

    await assertLessonAvailable(data.lessonId, false);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("course_lesson_comments")
      .insert({ lesson_id: data.lessonId, user_id: context.userId, body: data.body })
      .select("id, lesson_id, user_id, body, created_at")
      .single();
    if (error) throw error;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", context.userId)
      .maybeSingle();
    if (profileError) throw profileError;

    return {
      id: row.id,
      lessonId: row.lesson_id,
      userId: row.user_id,
      authorName: profile?.full_name?.trim() || "Socio del Club",
      body: row.body,
      createdAt: row.created_at,
    } satisfies CourseLessonComment;
  });
