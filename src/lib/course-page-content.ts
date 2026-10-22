import type { ClubBuilderBlock, ClubBuilderSection } from "@/lib/club-landing-content";

export type CoursePageSection = ClubBuilderSection;

const BLOCK_TYPES = [
  "heading",
  "subtitle",
  "paragraph",
  "image",
  "video",
  "price",
  "button",
  "subsection",
] as const;

function isSafeUrl(value: string) {
  return (
    !value || (value.startsWith("/") && !value.startsWith("//")) || /^https?:\/\//i.test(value)
  );
}

function validateBlocks(blocks: unknown, sectionTitle: string) {
  if (!Array.isArray(blocks) || blocks.length > 40) {
    throw new Error(`La sección "${sectionTitle}" supera el límite de elementos`);
  }
  const ids = new Set<string>();
  const validateBlock = (block: unknown, nested: boolean) => {
    if (!block || typeof block !== "object" || Array.isArray(block)) {
      throw new Error(`Un elemento de "${sectionTitle}" no es válido`);
    }
    const item = block as Partial<ClubBuilderBlock>;
    if (
      typeof item.id !== "string" ||
      !/^[\w-]{1,80}$/.test(item.id) ||
      ids.has(item.id) ||
      !BLOCK_TYPES.includes(item.type as (typeof BLOCK_TYPES)[number]) ||
      (nested && item.type === "subsection") ||
      typeof item.title !== "string" ||
      item.title.length > 500 ||
      typeof item.text !== "string" ||
      item.text.length > 5_000 ||
      typeof item.url !== "string" ||
      item.url.length > 2_000 ||
      !isSafeUrl(item.url) ||
      !["vertical", "horizontal"].includes(item.layout ?? "") ||
      !Array.isArray(item.children) ||
      item.children.length > 20 ||
      (item.type !== "subsection" && item.children.length > 0)
    ) {
      throw new Error(`Un elemento de "${sectionTitle}" tiene datos inválidos`);
    }
    ids.add(item.id);
    item.children.forEach((child) => validateBlock(child, true));
  };
  blocks.forEach((block) => validateBlock(block, false));
}

export function validateCoursePageSections(value: string): CoursePageSection[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("La estructura de secciones de cursos tiene un formato inválido");
  }
  if (!Array.isArray(parsed) || parsed.length > 30) {
    throw new Error("Puedes crear hasta 30 secciones en la página de cursos");
  }

  const ids = new Set<string>();
  for (const section of parsed) {
    if (
      !section ||
      typeof section !== "object" ||
      Array.isArray(section) ||
      typeof section.id !== "string" ||
      !/^custom-[\w-]{1,70}$/.test(section.id) ||
      ids.has(section.id) ||
      typeof section.title !== "string" ||
      !section.title.trim() ||
      section.title.length > 120 ||
      typeof section.enabled !== "boolean" ||
      !["none", "card", "dark", "fire"].includes(section.background) ||
      !["contained", "full"].includes(section.width) ||
      !["vertical", "horizontal"].includes(section.layout)
    ) {
      throw new Error("Una sección de la página de cursos tiene datos inválidos");
    }
    ids.add(section.id);
    validateBlocks(section.blocks, section.title);
  }
  return parsed as CoursePageSection[];
}

export function getCoursePageSections(value: string | undefined): CoursePageSection[] {
  try {
    return validateCoursePageSections(value ?? "[]");
  } catch {
    return [];
  }
}
