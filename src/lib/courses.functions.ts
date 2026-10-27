import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

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
  examQuestions?: CourseExamQuestion[];
  practicalTask?: string;
};

export type CourseExamQuestion = {
  id: string;
  type?: "multiple_choice" | "true_false";
  question: string;
  options: string[];
  correctAnswerIndex: number;
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
    practicalTask: row.practical_task,
  };
}

type PublicExamQuestion = Omit<CourseExamQuestion, "correctAnswerIndex">;

function validatePublicExamQuestions(input: unknown): PublicExamQuestion[] {
  if (!Array.isArray(input) || input.length > 50) {
    throw new Error("El examen debe tener como máximo 50 preguntas");
  }
  const ids = new Set<string>();
  return input.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`Pregunta ${index + 1} inválida`);
    const question = item as Partial<PublicExamQuestion>;
    const prompt = typeof question.question === "string" ? question.question.trim() : "";
    const options = Array.isArray(question.options)
      ? question.options.filter((option): option is string => typeof option === "string")
      : [];
    if (!question.id || typeof question.id !== "string" || question.id.length > 80) {
      throw new Error(`El identificador de la pregunta ${index + 1} no es válido`);
    }
    if (ids.has(question.id)) throw new Error("Cada pregunta debe tener un identificador único");
    ids.add(question.id);
    if (!prompt || prompt.length > 500)
      throw new Error(`Revisa el texto de la pregunta ${index + 1}`);
    if (
      options.length < 2 ||
      options.length > 6 ||
      options.some((option) => !option.trim() || option.length > 200)
    ) {
      throw new Error(`La pregunta ${index + 1} debe tener entre 2 y 6 opciones válidas`);
    }
    const type = question.type === "true_false" ? "true_false" : "multiple_choice";
    if (type === "true_false" && options.length !== 2) {
      throw new Error(`La pregunta ${index + 1} de verdadero o falso debe tener dos opciones`);
    }
    return {
      id: question.id,
      type,
      question: prompt,
      options: options.map((option) => option.trim()),
    };
  });
}

function validateExamQuestions(input: unknown): CourseExamQuestion[] {
  const publicQuestions = validatePublicExamQuestions(input);
  return publicQuestions.map((question, index) => {
    const item = (input as CourseExamQuestion[])[index];
    if (
      !Number.isInteger(item.correctAnswerIndex) ||
      item.correctAnswerIndex < 0 ||
      item.correctAnswerIndex >= question.options.length
    ) {
      throw new Error(`Selecciona la respuesta correcta de la pregunta ${index + 1}`);
    }
    return {
      ...question,
      type: item.type === "true_false" ? "true_false" : "multiple_choice",
      correctAnswerIndex: item.correctAnswerIndex,
    };
  });
}

async function assertSubcourseLessonsCompleted(subcourseId: string, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: lessons, error: lessonsError } = await supabaseAdmin
    .from("course_lessons")
    .select("id")
    .eq("subcourse_id", subcourseId);
  if (lessonsError) throw lessonsError;
  if (!lessons?.length) throw new Error("Este subcurso todavía no tiene lecciones para evaluar");

  const lessonIds = lessons.map((lesson) => lesson.id);
  const { data: progress, error: progressError } = await supabaseAdmin
    .from("course_lesson_progress")
    .select("lesson_id")
    .eq("user_id", userId)
    .in("lesson_id", lessonIds);
  if (progressError) throw progressError;
  if (new Set((progress ?? []).map((item) => item.lesson_id)).size !== lessonIds.length) {
    throw new Error(
      "Completa todas las lecciones de este subcurso para desbloquear el examen final",
    );
  }
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
    const subcourseRows = rows ?? [];
    const ids = subcourseRows.map((row) => row.id);
    const { data: keys, error: keysError } = ids.length
      ? await supabaseAdmin
          .from("course_subcourse_exam_keys")
          .select("subcourse_id, answer_key")
          .in("subcourse_id", ids)
      : { data: [], error: null };
    if (keysError) throw keysError;
    const keyBySubcourse = new Map((keys ?? []).map((key) => [key.subcourse_id, key.answer_key]));
    return subcourseRows.map((row) => {
      const questions = validatePublicExamQuestions(row.exam_questions);
      const answerKey = keyBySubcourse.get(row.id);
      const answers =
        answerKey && typeof answerKey === "object" && !Array.isArray(answerKey)
          ? (answerKey as Record<string, number>)
          : {};
      return {
        ...mapSubcourse(row),
        examQuestions: questions.map((question) => ({
          ...question,
          correctAnswerIndex: answers[question.id] ?? -1,
        })),
      };
    });
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
      examQuestions?: CourseExamQuestion[];
      practicalTask?: string;
    }) => {
      const title = input.title?.trim() ?? "";
      if (!input.courseId) throw new Error("Falta el curso");
      if (!title) throw new Error("El título del subcurso es obligatorio");
      if (title.length > 150) throw new Error("Título demasiado largo");
      const examQuestions = validateExamQuestions(input.examQuestions ?? []);
      const practicalTask = input.practicalTask?.trim() ?? "";
      if (practicalTask.length > 5000) throw new Error("La consigna práctica es demasiado larga");
      return {
        id: input.id,
        courseId: input.courseId,
        title,
        description: input.description?.trim() ?? "",
        active: !!input.active,
        sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
        examQuestions,
        practicalTask,
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
      exam_questions: data.examQuestions.map(({ id, type, question, options }) => ({
        id,
        type,
        question,
        options,
      })) as unknown as Json,
      practical_task: data.practicalTask,
    };
    const answerKey = Object.fromEntries(
      data.examQuestions.map((question) => [question.id, question.correctAnswerIndex]),
    ) as Json;
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("club_subcourses")
        .update(payload)
        .eq("id", data.id);
      if (error) throwIfCourseMigrationMissing(error);
      const { error: keyError } = await supabaseAdmin
        .from("course_subcourse_exam_keys")
        .upsert({ subcourse_id: data.id, answer_key: answerKey });
      if (keyError) throw keyError;
      return { ok: true, id: data.id };
    }

    const { data: created, error } = await supabaseAdmin
      .from("club_subcourses")
      .insert(payload)
      .select("id")
      .single();
    if (error) throwIfCourseMigrationMissing(error);
    const { error: keyError } = await supabaseAdmin
      .from("course_subcourse_exam_keys")
      .upsert({ subcourse_id: created.id, answer_key: answerKey });
    if (keyError) throw keyError;
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

export const startCourseLessonWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lessonId: string }) => {
    if (!input?.lessonId) throw new Error("Falta la lección");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { isMember } = await requireCourseAccess(context);
    if (!isMember) throw new Error("Necesitas una membresía activa para ganar Puntos de Brasa");
    const { data: sessionId, error } = await context.supabase.rpc("start_course_lesson_watch", {
      p_lesson_id: data.lessonId,
    });
    if (error) throw error;
    if (!sessionId) throw new Error("No se pudo iniciar el seguimiento del video");
    return { sessionId };
  });

export const recordCourseLessonWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      sessionId: string;
      positionSeconds: number;
      durationSeconds: number;
      isPlaying: boolean;
      ended?: boolean;
    }) => {
      if (!input?.sessionId) throw new Error("Falta la sesión del video");
      if (
        !Number.isFinite(input.positionSeconds) ||
        !Number.isFinite(input.durationSeconds) ||
        input.positionSeconds < 0 ||
        input.durationSeconds <= 0 ||
        input.positionSeconds > input.durationSeconds + 2
      ) {
        throw new Error("El avance del video no es válido");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { isMember } = await requireCourseAccess(context);
    if (!isMember) throw new Error("Necesitas una membresía activa para ganar Puntos de Brasa");
    const { data: accepted, error } = await context.supabase.rpc("record_course_lesson_watch", {
      p_session_id: data.sessionId,
      p_position_seconds: data.positionSeconds,
      p_duration_seconds: data.durationSeconds,
      p_is_playing: data.isPlaying,
      p_ended: !!data.ended,
    });
    if (error) throw error;
    return { ended: accepted };
  });

export const completeCourseLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lessonId: string; sessionId: string }) => {
    if (!input?.lessonId || !input.sessionId)
      throw new Error("Termina el video antes de continuar");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { isMember } = await requireCourseAccess(context);
    if (!isMember) throw new Error("Necesitas una membresía activa para ganar Puntos de Brasa");
    const { data: result, error } = await context.supabase.rpc(
      "complete_course_lesson_after_watch",
      {
        p_lesson_id: data.lessonId,
        p_session_id: data.sessionId,
      },
    );
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

export const getCourseSubcourseAssessment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subcourseId: string }) => {
    if (!input?.subcourseId) throw new Error("Falta el subcurso");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { isMember } = await requireCourseAccess(context);
    if (!isMember) throw new Error("Solo los socios activos pueden realizar las evaluaciones");
    await assertSubcourseAvailable(data.subcourseId, false);
    await assertSubcourseLessonsCompleted(data.subcourseId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("club_subcourses")
      .select("title, exam_questions, practical_task")
      .eq("id", data.subcourseId)
      .single();
    if (error) throw error;
    const questions = validatePublicExamQuestions(row.exam_questions);
    return {
      subcourseTitle: row.title,
      questions,
      practicalTask: row.practical_task,
    };
  });

export const submitCourseSubcourseExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subcourseId: string; answers: Record<string, number> }) => {
    if (!input?.subcourseId || !input.answers || typeof input.answers !== "object") {
      throw new Error("Responde el examen antes de enviarlo");
    }
    return { subcourseId: input.subcourseId, answers: input.answers };
  })
  .handler(async ({ data, context }) => {
    const { isMember } = await requireCourseAccess(context);
    if (!isMember) throw new Error("Solo los socios activos pueden realizar las evaluaciones");
    await assertSubcourseAvailable(data.subcourseId, false);
    await assertSubcourseLessonsCompleted(data.subcourseId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("club_subcourses")
      .select("exam_questions")
      .eq("id", data.subcourseId)
      .single();
    if (error) throw error;
    const questions = validatePublicExamQuestions(row.exam_questions);
    if (!questions.length) throw new Error("Este subcurso todavía no tiene un examen configurado");
    if (Object.keys(data.answers).length !== questions.length) {
      throw new Error("Responde todas las preguntas antes de enviar el examen");
    }
    if (Object.keys(data.answers).some((id) => !questions.some((question) => question.id === id))) {
      throw new Error("El examen enviado no coincide con la evaluación actual");
    }
    for (const [id, answer] of Object.entries(data.answers)) {
      const question = questions.find((item) => item.id === id);
      if (
        !question ||
        !Number.isInteger(answer) ||
        answer < 0 ||
        answer >= question.options.length
      ) {
        throw new Error("Una de las respuestas enviadas no es válida");
      }
    }
    const { data: keyRow, error: keyError } = await supabaseAdmin
      .from("course_subcourse_exam_keys")
      .select("answer_key")
      .eq("subcourse_id", data.subcourseId)
      .maybeSingle();
    if (keyError) throw keyError;
    if (!keyRow) throw new Error("El examen todavía no está configurado correctamente");
    const answerKey =
      keyRow.answer_key &&
      typeof keyRow.answer_key === "object" &&
      !Array.isArray(keyRow.answer_key)
        ? (keyRow.answer_key as Record<string, number>)
        : {};
    const score = questions.reduce(
      (total, question) => total + (data.answers[question.id] === answerKey[question.id] ? 1 : 0),
      0,
    );
    const { error: saveError } = await supabaseAdmin.from("course_assessment_attempts").insert({
      subcourse_id: data.subcourseId,
      user_id: context.userId,
      answers: data.answers as unknown as Json,
      score,
      question_count: questions.length,
    });
    if (saveError) throw saveError;
    return { score, total: questions.length };
  });

const PRACTICAL_FILE_LIMITS: Record<string, number> = {
  "image/jpeg": 10 * 1024 * 1024,
  "image/png": 10 * 1024 * 1024,
  "image/webp": 10 * 1024 * 1024,
  "video/mp4": 300 * 1024 * 1024,
  "video/webm": 300 * 1024 * 1024,
  "video/ogg": 300 * 1024 * 1024,
};

export const createCoursePracticalEvidenceUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { subcourseId: string; fileName: string; contentType: string; size: number }) => {
      if (!input?.subcourseId || !input.fileName) throw new Error("Falta el archivo");
      const limit = PRACTICAL_FILE_LIMITS[input.contentType];
      if (!limit) throw new Error("Usa una imagen JPG, PNG, WebP o un video MP4, WebM u OGG");
      if (!Number.isInteger(input.size) || input.size <= 0 || input.size > limit) {
        throw new Error(
          input.contentType.startsWith("image/")
            ? "La imagen no debe superar 10 MB"
            : "El video no debe superar 300 MB",
        );
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { isMember } = await requireCourseAccess(context);
    if (!isMember) throw new Error("Solo los socios activos pueden enviar evidencias");
    await assertSubcourseAvailable(data.subcourseId, false);
    await assertSubcourseLessonsCompleted(data.subcourseId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subcourse, error: subcourseError } = await supabaseAdmin
      .from("club_subcourses")
      .select("practical_task")
      .eq("id", data.subcourseId)
      .single();
    if (subcourseError) throw subcourseError;
    if (!subcourse.practical_task.trim()) throw new Error("Este subcurso no tiene tarea práctica");
    const ext = data.contentType.split("/")[1].replace("jpeg", "jpg");
    const path = `${context.userId}/${data.subcourseId}/${crypto.randomUUID()}.${ext}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("course-practical-evidence")
      .createSignedUploadUrl(path);
    if (error) throw error;
    const { error: ticketError } = await supabaseAdmin
      .from("course_practical_upload_tickets")
      .insert({
        path,
        user_id: context.userId,
        subcourse_id: data.subcourseId,
        content_type: data.contentType,
        max_size: PRACTICAL_FILE_LIMITS[data.contentType],
      });
    if (ticketError) throw ticketError;
    return { path, token: signed.token };
  });

export const submitCoursePracticalEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subcourseId: string; evidencePath: string; note: string }) => {
    const note = input.note?.trim() ?? "";
    if (!input?.subcourseId || !input.evidencePath) throw new Error("Falta la evidencia práctica");
    if (note.length > 2000) throw new Error("La descripción no puede superar los 2000 caracteres");
    return { subcourseId: input.subcourseId, evidencePath: input.evidencePath, note };
  })
  .handler(async ({ data, context }) => {
    const { isMember } = await requireCourseAccess(context);
    if (!isMember) throw new Error("Solo los socios activos pueden enviar evidencias");
    await assertSubcourseAvailable(data.subcourseId, false);
    await assertSubcourseLessonsCompleted(data.subcourseId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subcourse, error: subcourseError } = await supabaseAdmin
      .from("club_subcourses")
      .select("practical_task")
      .eq("id", data.subcourseId)
      .single();
    if (subcourseError) throw subcourseError;
    if (!subcourse.practical_task.trim()) throw new Error("Este subcurso no tiene tarea práctica");
    const expectedPrefix = `${context.userId}/${data.subcourseId}/`;
    if (!data.evidencePath.startsWith(expectedPrefix)) throw new Error("La evidencia no es válida");
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("course_practical_upload_tickets")
      .select("created_at, consumed_at, content_type, max_size")
      .eq("path", data.evidencePath)
      .eq("user_id", context.userId)
      .eq("subcourse_id", data.subcourseId)
      .maybeSingle();
    if (ticketError) throw ticketError;
    if (
      !ticket ||
      ticket.consumed_at ||
      Date.now() - new Date(ticket.created_at).getTime() > 24 * 60 * 60 * 1000
    ) {
      throw new Error("La carga de evidencia expiró; vuelve a seleccionar el archivo");
    }
    const folder = expectedPrefix.slice(0, -1);
    const fileName = data.evidencePath.slice(expectedPrefix.length);
    const { data: files, error: storageError } = await supabaseAdmin.storage
      .from("course-practical-evidence")
      .list(folder, { search: fileName, limit: 1 });
    if (storageError) throw storageError;
    const storedFile = files?.find((file) => file.name === fileName);
    if (!storedFile) {
      throw new Error("No se encontró el archivo cargado");
    }
    const metadata = storedFile.metadata as { size?: number; mimetype?: string } | null;
    if (
      !metadata ||
      typeof metadata.size !== "number" ||
      metadata.size <= 0 ||
      metadata.size > ticket.max_size ||
      metadata.mimetype !== ticket.content_type
    ) {
      throw new Error("El archivo cargado no coincide con el tipo o tamaño permitido");
    }
    const { error: saveError } = await supabaseAdmin.from("course_practical_submissions").insert({
      subcourse_id: data.subcourseId,
      user_id: context.userId,
      evidence_path: data.evidencePath,
      note: data.note,
    });
    if (saveError) throw saveError;
    const { error: consumeError } = await supabaseAdmin
      .from("course_practical_upload_tickets")
      .update({ consumed_at: new Date().toISOString() })
      .eq("path", data.evidencePath)
      .is("consumed_at", null);
    if (consumeError) throw consumeError;
    return { ok: true };
  });

export const adminListCoursePracticalSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subcourseId: string }) => {
    if (!input?.subcourseId) throw new Error("Falta el subcurso");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("course_practical_submissions")
      .select("id, user_id, evidence_path, note, status, admin_feedback, created_at")
      .eq("subcourse_id", data.subcourseId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const users = [...new Set((rows ?? []).map((row) => row.user_id))];
    const { data: profiles, error: profilesError } = users.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", users)
      : { data: [], error: null };
    if (profilesError) throw profilesError;
    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    return Promise.all(
      (rows ?? []).map(async (row) => {
        const { data: signed, error: signedError } = await supabaseAdmin.storage
          .from("course-practical-evidence")
          .createSignedUrl(row.evidence_path, 60 * 10);
        if (signedError) throw signedError;
        const profile = names.get(row.user_id);
        return {
          id: row.id,
          authorName: profile?.full_name?.trim() || profile?.email || "Socio del Club",
          note: row.note,
          status: row.status,
          adminFeedback: row.admin_feedback,
          createdAt: row.created_at,
          downloadUrl: signed.signedUrl,
        };
      }),
    );
  });

export const adminReviewCoursePracticalSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { submissionId: string; feedback: string }) => {
    const feedback = input.feedback?.trim() ?? "";
    if (!input?.submissionId) throw new Error("Falta la entrega");
    if (feedback.length > 2000)
      throw new Error("La devolución no puede superar los 2000 caracteres");
    return { submissionId: input.submissionId, feedback };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("course_practical_submissions")
      .update({
        status: "reviewed",
        admin_feedback: data.feedback,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.submissionId);
    if (error) throw error;
    return { ok: true };
  });

export type CourseLessonComment = {
  id: string;
  lessonId: string;
  userId: string;
  authorName: string;
  body: string;
  createdAt: string;
  parentCommentId: string | null;
  likeCount: number;
  likedByMe: boolean;
  replies: CourseLessonComment[];
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
      .select("id, lesson_id, user_id, body, created_at, parent_comment_id")
      .eq("lesson_id", data.lessonId)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(start, start + COMMENTS_PAGE_SIZE);
    if (error) throw error;

    const rootRows = rows ?? [];
    const rootIds = rootRows.map((row) => row.id);
    const { data: replyRows, error: repliesError } = rootIds.length
      ? await supabaseAdmin
          .from("course_lesson_comments")
          .select("id, lesson_id, user_id, body, created_at, parent_comment_id")
          .in("parent_comment_id", rootIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };
    if (repliesError) throw repliesError;
    const pageRows = [...rootRows.slice(0, COMMENTS_PAGE_SIZE), ...(replyRows ?? [])];
    const userIds = [...new Set(pageRows.map((row) => row.user_id))];
    const commentIds = pageRows.map((row) => row.id);
    const [profilesResult, likesResult] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds)
        : Promise.resolve({ data: [], error: null }),
      commentIds.length
        ? supabaseAdmin
            .from("course_lesson_comment_likes")
            .select("comment_id, user_id")
            .in("comment_id", commentIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const { data: profiles, error: profilesError } = profilesResult;
    if (profilesError) throw profilesError;
    const { data: likes, error: likesError } = likesResult;
    if (likesError) throw likesError;
    const profileNames = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile.full_name]),
    );
    const likeCounts = new Map<string, number>();
    const likedByMe = new Set<string>();
    for (const like of likes ?? []) {
      likeCounts.set(like.comment_id, (likeCounts.get(like.comment_id) ?? 0) + 1);
      if (like.user_id === context.userId) likedByMe.add(like.comment_id);
    }
    const mapComment = (row: (typeof pageRows)[number]): CourseLessonComment => ({
      id: row.id,
      lessonId: row.lesson_id,
      userId: row.user_id,
      authorName: profileNames.get(row.user_id)?.trim() || "Socio del Club",
      body: row.body,
      createdAt: row.created_at,
      parentCommentId: row.parent_comment_id,
      likeCount: likeCounts.get(row.id) ?? 0,
      likedByMe: likedByMe.has(row.id),
      replies: [],
    });
    const repliesByParent = new Map<string, CourseLessonComment[]>();
    for (const reply of replyRows ?? []) {
      if (!reply.parent_comment_id) continue;
      const current = repliesByParent.get(reply.parent_comment_id) ?? [];
      current.push(mapComment(reply));
      repliesByParent.set(reply.parent_comment_id, current);
    }
    return {
      comments: rootRows.slice(0, COMMENTS_PAGE_SIZE).map((row) => ({
        ...mapComment(row),
        replies: repliesByParent.get(row.id) ?? [],
      })),
      hasMore: rootRows.length > COMMENTS_PAGE_SIZE,
    };
  });

export const createCourseLessonComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lessonId: string; body: string; parentCommentId?: string | null }) => {
    const body = input.body?.trim() ?? "";
    if (!input?.lessonId) throw new Error("Falta la lección");
    if (!body) throw new Error("Escribe un comentario antes de publicarlo");
    if (body.length > 1000) throw new Error("El comentario no puede superar los 1000 caracteres");
    return { lessonId: input.lessonId, body, parentCommentId: input.parentCommentId ?? null };
  })
  .handler(async ({ data, context }) => {
    const { isMember } = await requireCourseAccess(context);
    if (!isMember) throw new Error("Solo los socios con membresía activa pueden comentar");

    await assertLessonAvailable(data.lessonId, false);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.parentCommentId) {
      const { data: parent, error: parentError } = await supabaseAdmin
        .from("course_lesson_comments")
        .select("id, lesson_id, parent_comment_id")
        .eq("id", data.parentCommentId)
        .maybeSingle();
      if (parentError) throw parentError;
      if (!parent || parent.lesson_id !== data.lessonId || parent.parent_comment_id) {
        throw new Error("No se encontró el comentario al que intentas responder");
      }
    }

    const { data: row, error } = await supabaseAdmin
      .from("course_lesson_comments")
      .insert({
        lesson_id: data.lessonId,
        user_id: context.userId,
        body: data.body,
        parent_comment_id: data.parentCommentId,
      })
      .select("id, lesson_id, user_id, body, created_at, parent_comment_id")
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
      parentCommentId: row.parent_comment_id,
      likeCount: 0,
      likedByMe: false,
      replies: [],
    } satisfies CourseLessonComment;
  });

export const setCourseLessonCommentLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { commentId: string; liked: boolean }) => {
    if (!input?.commentId) throw new Error("Falta el comentario");
    return { commentId: input.commentId, liked: !!input.liked };
  })
  .handler(async ({ data, context }) => {
    const { isMember } = await requireCourseAccess(context);
    if (!isMember) throw new Error("Solo los socios activos pueden indicar que les gusta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: comment, error: commentError } = await supabaseAdmin
      .from("course_lesson_comments")
      .select("lesson_id")
      .eq("id", data.commentId)
      .maybeSingle();
    if (commentError) throw commentError;
    if (!comment) throw new Error("No se encontró el comentario");
    await assertLessonAvailable(comment.lesson_id, false);
    const result = data.liked
      ? await supabaseAdmin
          .from("course_lesson_comment_likes")
          .upsert(
            { comment_id: data.commentId, user_id: context.userId },
            { onConflict: "comment_id,user_id", ignoreDuplicates: true },
          )
      : await supabaseAdmin
          .from("course_lesson_comment_likes")
          .delete()
          .eq("comment_id", data.commentId)
          .eq("user_id", context.userId);
    if (result.error) throw result.error;
    return { ok: true };
  });
