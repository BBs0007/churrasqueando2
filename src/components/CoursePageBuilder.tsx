import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BuilderBlockList, RenderBuilderBlock } from "@/components/ClubLandingBuilder";
import type { ClubBuilderBlock, ClubBuilderSection } from "@/lib/club-landing-content";
import type { CoursePageSection } from "@/lib/course-page-content";

function createSection(): CoursePageSection {
  return {
    id: `custom-${crypto.randomUUID()}`,
    title: "Nueva sección",
    enabled: true,
    background: "card",
    width: "contained",
    layout: "vertical",
    blocks: [],
  };
}

export function CoursePageBuilderEditor({
  sections,
  onChange,
  onMediaUpload,
}: {
  sections: CoursePageSection[];
  onChange: (sections: CoursePageSection[]) => void;
  onMediaUpload: (file: File, type: "image" | "video") => Promise<string>;
}) {
  const updateSection = (index: number, updates: Partial<CoursePageSection>) =>
    onChange(sections.map((section, i) => (i === index ? { ...section, ...updates } : section)));

  const moveSection = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <section className="mt-8 rounded-2xl border border-primary/30 bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl uppercase tracking-wide text-foreground">
            Contenido adicional de la página de cursos
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Crea secciones de recetas o cualquier otro contenido, agrega bloques y subsecciones,
            elige su presentación y publícalas debajo de los cursos.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={sections.length >= 30}
          onClick={() => onChange([...sections, createSection()])}
          className="font-cond uppercase tracking-wide"
        >
          <Plus className="h-4 w-4" /> Agregar sección
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {sections.map((section, index) => (
          <article
            key={section.id}
            className="rounded-xl border border-border bg-background/60 p-3 sm:p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Mover sección hacia arriba"
                  disabled={index === 0}
                  onClick={() => moveSection(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Mover sección hacia abajo"
                  disabled={index === sections.length - 1}
                  onClick={() => moveSection(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
              <Input
                aria-label="Título de la sección"
                value={section.title}
                onChange={(event) => updateSection(index, { title: event.target.value })}
                className="min-w-48 flex-1 font-semibold"
              />
              <Label htmlFor={`course-section-enabled-${section.id}`} className="text-xs">
                Visible
              </Label>
              <Switch
                id={`course-section-enabled-${section.id}`}
                checked={section.enabled}
                onCheckedChange={(enabled) => updateSection(index, { enabled })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Eliminar ${section.title || "sección"}`}
                onClick={() => onChange(sections.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="mt-4 space-y-5 border-t border-border pt-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`course-section-background-${section.id}`}>Fondo</Label>
                  <select
                    id={`course-section-background-${section.id}`}
                    value={section.background}
                    onChange={(event) =>
                      updateSection(index, {
                        background: event.target.value as ClubBuilderSection["background"],
                      })
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="none">Sin fondo</option>
                    <option value="card">Tarjeta</option>
                    <option value="dark">Oscuro</option>
                    <option value="fire">Degradado fuego</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`course-section-width-${section.id}`}>Ancho</Label>
                  <select
                    id={`course-section-width-${section.id}`}
                    value={section.width}
                    onChange={(event) =>
                      updateSection(index, {
                        width: event.target.value as ClubBuilderSection["width"],
                      })
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="contained">Contenido centrado</option>
                    <option value="full">Ancho de pantalla</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`course-section-layout-${section.id}`}>Distribución</Label>
                  <select
                    id={`course-section-layout-${section.id}`}
                    value={section.layout}
                    onChange={(event) =>
                      updateSection(index, {
                        layout: event.target.value as ClubBuilderSection["layout"],
                      })
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="vertical">Vertical</option>
                    <option value="horizontal">Horizontal</option>
                  </select>
                </div>
              </div>
              <BuilderBlockList
                blocks={section.blocks}
                onMediaUpload={onMediaUpload}
                onChange={(blocks: ClubBuilderBlock[]) => updateSection(index, { blocks })}
              />
            </div>
          </article>
        ))}
        {sections.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
            Aún no hay secciones extra. Puedes agregar recetas, guías o cualquier contenido para
            socios.
          </p>
        )}
      </div>
    </section>
  );
}

export function CoursePageBuilderContent({ sections }: { sections: CoursePageSection[] }) {
  return (
    <div className="space-y-8">
      {sections
        .filter((section) => section.enabled)
        .map((section) => {
          const background = {
            none: "",
            card: "border border-white/10 bg-white/5",
            dark: "border border-white/10 bg-black/30",
            fire: "border border-primary/40 bg-gradient-to-br from-primary/15 via-white/5 to-white/5",
          }[section.background];
          const width =
            section.width === "full" ? "relative left-1/2 w-screen -translate-x-1/2" : "";
          const layout =
            section.layout === "horizontal" ? "grid gap-5 sm:grid-cols-2" : "space-y-5";

          return (
            <section key={section.id} className={`rounded-2xl p-5 sm:p-7 ${background} ${width}`}>
              <div className={section.width === "contained" ? "mx-auto max-w-5xl" : "w-full"}>
                {section.title && (
                  <h2 className="font-display mb-5 text-2xl uppercase tracking-wide text-white sm:text-3xl">
                    {section.title}
                  </h2>
                )}
                <div className={layout}>
                  {section.blocks.map((block) => (
                    <RenderBuilderBlock key={block.id} block={block} />
                  ))}
                </div>
              </div>
            </section>
          );
        })}
    </div>
  );
}
