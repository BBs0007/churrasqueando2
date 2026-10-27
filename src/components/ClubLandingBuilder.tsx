import { useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CLUB_BUILDER_SECTIONS,
  type ClubBuilderBlock,
  type ClubBuilderBlockType,
  type ClubBuilderContentBlockType,
  type ClubBuilderLayout,
  type ClubBuilderSection,
} from "@/lib/club-landing-content";

const CONTENT_BLOCK_TYPES: { value: ClubBuilderContentBlockType; label: string }[] = [
  { value: "heading", label: "Título" },
  { value: "subtitle", label: "Subtítulo" },
  { value: "paragraph", label: "Párrafo" },
  { value: "image", label: "Imagen" },
  { value: "video", label: "Video" },
  { value: "price", label: "Precio o tarifa" },
  { value: "button", label: "Botón con enlace" },
];

function createBlock(type: ClubBuilderBlockType): ClubBuilderBlock {
  return {
    id: `block-${crypto.randomUUID()}`,
    type,
    title: "",
    text: "",
    url: "",
    layout: "vertical",
    children: [],
  };
}

function updateSection(
  layout: ClubBuilderLayout,
  sectionId: string,
  updater: (section: ClubBuilderSection) => ClubBuilderSection,
): ClubBuilderLayout {
  return {
    ...layout,
    customSections: layout.customSections.map((section) =>
      section.id === sectionId ? updater(section) : section,
    ),
  };
}

export function ClubLandingBuilderEditor({
  layout,
  onChange,
  onMediaUpload,
}: {
  layout: ClubBuilderLayout;
  onChange: (layout: ClubBuilderLayout) => void;
  onMediaUpload: (file: File, type: "image" | "video") => Promise<string>;
}) {
  const moveSection = (id: string, offset: number) => {
    const index = layout.order.indexOf(id);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= layout.order.length) return;
    const order = [...layout.order];
    [order[index], order[target]] = [order[target], order[index]];
    onChange({ ...layout, order });
  };

  const addSection = () => {
    if (layout.customSections.length >= 30) return;
    const id = `custom-${crypto.randomUUID()}`;
    onChange({
      ...layout,
      order: [...layout.order, id],
      customSections: [
        ...layout.customSections,
        {
          id,
          title: "Nueva sección",
          enabled: true,
          background: "card",
          width: "contained",
          layout: "vertical",
          blocks: [],
        },
      ],
    });
  };

  const removeSection = (id: string) => {
    onChange({
      ...layout,
      order: layout.order.filter((sectionId) => sectionId !== id),
      customSections: layout.customSections.filter((section) => section.id !== id),
    });
  };

  return (
    <section className="rounded-2xl border border-primary/30 bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl uppercase tracking-wide text-foreground">
            Constructor de secciones
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Ordena o desactiva las secciones existentes, o crea otras con títulos, textos, imágenes,
            videos, precios y subsecciones. La oferta y el pago conservan sus funciones.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSection}
          disabled={layout.customSections.length >= 30}
          className="font-cond uppercase tracking-wide"
        >
          <Plus className="h-4 w-4" /> Agregar sección
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {layout.order.map((id, index) => {
          const custom = layout.customSections.find((section) => section.id === id);
          const builtIn = CLUB_BUILDER_SECTIONS.find((section) => section.id === id);
          if (!custom && !builtIn) return null;
          const enabled = custom ? custom.enabled : !layout.hiddenSectionIds.includes(id);

          return (
            <article
              key={id}
              className="rounded-xl border border-border bg-background/60 p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Mover ${custom?.title ?? builtIn?.title} hacia arriba`}
                    disabled={index === 0}
                    onClick={() => moveSection(id, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Mover ${custom?.title ?? builtIn?.title} hacia abajo`}
                    disabled={index === layout.order.length - 1}
                    onClick={() => moveSection(id, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
                <span className="font-cond min-w-8 text-xs uppercase tracking-wide text-muted-foreground">
                  {index + 1}.
                </span>
                {custom ? (
                  <>
                    <Input
                      aria-label="Nombre de la sección"
                      value={custom.title}
                      onChange={(event) =>
                        onChange(
                          updateSection(layout, id, (section) => ({
                            ...section,
                            title: event.target.value,
                          })),
                        )
                      }
                      className="min-w-48 flex-1 font-semibold"
                    />
                    <Label htmlFor={`section-enabled-${id}`} className="text-xs">
                      Visible
                    </Label>
                    <Switch
                      id={`section-enabled-${id}`}
                      checked={custom.enabled}
                      onCheckedChange={(enabled) =>
                        onChange(updateSection(layout, id, (section) => ({ ...section, enabled })))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Eliminar ${custom.title || "sección"}`}
                      onClick={() => removeSection(id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-cond text-sm font-semibold uppercase tracking-wide text-foreground">
                      {builtIn?.title}
                    </span>
                    <Label htmlFor={`section-enabled-${id}`} className="text-xs">
                      Visible
                    </Label>
                    <Switch
                      id={`section-enabled-${id}`}
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        onChange({
                          ...layout,
                          hiddenSectionIds: checked
                            ? layout.hiddenSectionIds.filter((sectionId) => sectionId !== id)
                            : [...layout.hiddenSectionIds, id],
                        })
                      }
                    />
                  </>
                )}
              </div>

              {custom && (
                <div className="mt-4 space-y-5 border-t border-border pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`section-background-${id}`}>Fondo</Label>
                      <select
                        id={`section-background-${id}`}
                        value={custom.background}
                        onChange={(event) =>
                          onChange(
                            updateSection(layout, id, (section) => ({
                              ...section,
                              background: event.target.value as ClubBuilderSection["background"],
                            })),
                          )
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
                      <Label htmlFor={`section-width-${id}`}>Ancho</Label>
                      <select
                        id={`section-width-${id}`}
                        value={custom.width}
                        onChange={(event) =>
                          onChange(
                            updateSection(layout, id, (section) => ({
                              ...section,
                              width: event.target.value as ClubBuilderSection["width"],
                            })),
                          )
                        }
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="contained">Contenido centrado</option>
                        <option value="full">Ancho de pantalla</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`section-layout-${id}`}>Distribución del contenido</Label>
                      <select
                        id={`section-layout-${id}`}
                        value={custom.layout}
                        onChange={(event) =>
                          onChange(
                            updateSection(layout, id, (section) => ({
                              ...section,
                              layout: event.target.value as ClubBuilderSection["layout"],
                            })),
                          )
                        }
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="vertical">Vertical</option>
                        <option value="horizontal">Horizontal</option>
                      </select>
                    </div>
                  </div>
                  <BuilderBlockList
                    blocks={custom.blocks}
                    onMediaUpload={onMediaUpload}
                    onChange={(blocks) =>
                      onChange(updateSection(layout, id, (section) => ({ ...section, blocks })))
                    }
                  />
                </div>
              )}
              {builtIn && (
                <BuiltInSectionEditor
                  sectionId={id}
                  layout={layout}
                  onChange={onChange}
                  onMediaUpload={onMediaUpload}
                />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BuiltInSectionEditor({
  sectionId,
  layout,
  onChange,
  onMediaUpload,
}: {
  sectionId: string;
  layout: ClubBuilderLayout;
  onChange: (layout: ClubBuilderLayout) => void;
  onMediaUpload: (file: File, type: "image" | "video") => Promise<string>;
}) {
  const options = layout.sectionOptions[sectionId];
  const updateOptions = (updates: Partial<typeof options>) =>
    onChange({
      ...layout,
      sectionOptions: {
        ...layout.sectionOptions,
        [sectionId]: { ...options, ...updates },
      },
    });

  return (
    <div className="mt-4 space-y-5 border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">
        Conserva el contenido funcional de esta sección y añade elementos o subsecciones
        personalizadas debajo. Los textos, imágenes y listas originales se editan en su formulario;
        la distribución elegida controla los elementos y subsecciones añadidos.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`existing-background-${sectionId}`}>Fondo de la sección</Label>
          <select
            id={`existing-background-${sectionId}`}
            value={options.background}
            onChange={(event) =>
              updateOptions({
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
          <Label htmlFor={`existing-width-${sectionId}`}>Ancho de la sección</Label>
          <select
            id={`existing-width-${sectionId}`}
            value={options.width}
            onChange={(event) =>
              updateOptions({ width: event.target.value as ClubBuilderSection["width"] })
            }
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="contained">Contenido centrado</option>
            <option value="full">Ancho de pantalla</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`existing-layout-${sectionId}`}>Distribución de elementos añadidos</Label>
          <select
            id={`existing-layout-${sectionId}`}
            value={options.layout}
            onChange={(event) =>
              updateOptions({ layout: event.target.value as ClubBuilderSection["layout"] })
            }
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
          </select>
        </div>
      </div>
      <BuilderBlockList
        blocks={options.blocks}
        onMediaUpload={onMediaUpload}
        onChange={(blocks) => updateOptions({ blocks })}
      />
    </div>
  );
}

export function BuilderBlockList({
  blocks,
  onChange,
  onMediaUpload,
  nested = false,
}: {
  blocks: ClubBuilderBlock[];
  onChange: (blocks: ClubBuilderBlock[]) => void;
  onMediaUpload: (file: File, type: "image" | "video") => Promise<string>;
  nested?: boolean;
}) {
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);

  const updateBlock = (index: number, updater: (block: ClubBuilderBlock) => ClubBuilderBlock) =>
    onChange(blocks.map((block, blockIndex) => (blockIndex === index ? updater(block) : block)));

  const moveBlock = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addBlock = (type: ClubBuilderBlockType) => {
    if (blocks.length >= (nested ? 20 : 40)) return;
    onChange([...blocks, createBlock(type)]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-cond text-sm font-semibold uppercase tracking-wide text-foreground">
          {nested ? "Elementos de la subsección" : "Elementos de la sección"}
        </h3>
        <div className="flex flex-wrap gap-2">
          {CONTENT_BLOCK_TYPES.map((type) => (
            <Button
              key={type.value}
              type="button"
              variant="outline"
              size="sm"
              disabled={blocks.length >= (nested ? 20 : 40)}
              onClick={() => addBlock(type.value)}
            >
              <Plus className="h-3.5 w-3.5" /> {type.label}
            </Button>
          ))}
          {!nested && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={blocks.length >= 40}
              onClick={() => addBlock("subsection")}
            >
              <Plus className="h-3.5 w-3.5" /> Subsección
            </Button>
          )}
        </div>
      </div>
      {blocks.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Agrega el primer elemento para construir el contenido de esta sección.
        </p>
      )}
      {blocks.map((block, index) => (
        <article key={block.id} className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-cond text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {block.type === "subsection"
                ? "Subsección"
                : CONTENT_BLOCK_TYPES.find((type) => type.value === block.type)?.label}
            </p>
            <div className="flex items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Mover elemento hacia arriba"
                disabled={index === 0}
                onClick={() => moveBlock(index, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Mover elemento hacia abajo"
                disabled={index === blocks.length - 1}
                onClick={() => moveBlock(index, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Eliminar elemento"
                onClick={() => onChange(blocks.filter((_, blockIndex) => blockIndex !== index))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          {block.type === "heading" || block.type === "subtitle" ? (
            <div className="space-y-1.5">
              <Label htmlFor={`block-title-${block.id}`}>Texto</Label>
              <Input
                id={`block-title-${block.id}`}
                value={block.title}
                onChange={(event) =>
                  updateBlock(index, (current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>
          ) : block.type === "paragraph" ? (
            <div className="space-y-1.5">
              <Label htmlFor={`block-text-${block.id}`}>Párrafo</Label>
              <Textarea
                id={`block-text-${block.id}`}
                rows={4}
                value={block.text}
                onChange={(event) =>
                  updateBlock(index, (current) => ({ ...current, text: event.target.value }))
                }
              />
            </div>
          ) : block.type === "image" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`block-url-${block.id}`}>URL de imagen</Label>
                <Input
                  id={`block-url-${block.id}`}
                  value={block.url}
                  onChange={(event) =>
                    updateBlock(index, (current) => ({ ...current, url: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`block-alt-${block.id}`}>Descripción de imagen</Label>
                <Input
                  id={`block-alt-${block.id}`}
                  value={block.title}
                  onChange={(event) =>
                    updateBlock(index, (current) => ({ ...current, title: event.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  id={`block-file-${block.id}`}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={async (event) => {
                    const input = event.currentTarget;
                    const file = input.files?.[0];
                    if (!file) return;
                    setUploadingImageId(block.id);
                    try {
                      const url = await onMediaUpload(file, "image");
                      updateBlock(index, (current) => ({ ...current, url }));
                      toast.success("Imagen subida. Guarda los cambios para publicarla.");
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "No se pudo subir la imagen",
                      );
                    } finally {
                      setUploadingImageId(null);
                      input.value = "";
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingImageId === block.id}
                  onClick={() => document.getElementById(`block-file-${block.id}`)?.click()}
                >
                  {uploadingImageId === block.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Subir imagen
                </Button>
              </div>
            </div>
          ) : block.type === "video" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`block-video-url-${block.id}`}>URL del video</Label>
                <Input
                  id={`block-video-url-${block.id}`}
                  value={block.url}
                  onChange={(event) =>
                    updateBlock(index, (current) => ({ ...current, url: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`block-video-title-${block.id}`}>Título accesible (opcional)</Label>
                <Input
                  id={`block-video-title-${block.id}`}
                  value={block.title}
                  onChange={(event) =>
                    updateBlock(index, (current) => ({ ...current, title: event.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  id={`block-video-file-${block.id}`}
                  type="file"
                  accept="video/mp4,video/webm,video/ogg"
                  className="sr-only"
                  onChange={async (event) => {
                    const input = event.currentTarget;
                    const file = input.files?.[0];
                    if (!file) return;
                    setUploadingImageId(block.id);
                    try {
                      const url = await onMediaUpload(file, "video");
                      updateBlock(index, (current) => ({ ...current, url }));
                      toast.success("Video subido. Guarda los cambios para publicarlo.");
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "No se pudo subir el video",
                      );
                    } finally {
                      setUploadingImageId(null);
                      input.value = "";
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingImageId === block.id}
                  onClick={() => document.getElementById(`block-video-file-${block.id}`)?.click()}
                >
                  {uploadingImageId === block.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Subir video (máx. 300 MB)
                </Button>
              </div>
              {block.url && (
                <video
                  src={block.url}
                  controls
                  controlsList="nodownload"
                  playsInline
                  preload="metadata"
                  onContextMenu={(event) => event.preventDefault()}
                  className="aspect-video w-full rounded-xl bg-black sm:col-span-2"
                />
              )}
            </div>
          ) : block.type === "price" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`block-label-${block.id}`}>Concepto o etiqueta</Label>
                <Input
                  id={`block-label-${block.id}`}
                  value={block.title}
                  onChange={(event) =>
                    updateBlock(index, (current) => ({ ...current, title: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`block-price-${block.id}`}>Precio y periodo</Label>
                <Input
                  id={`block-price-${block.id}`}
                  placeholder="Ej.: Bs 120 / año"
                  value={block.text}
                  onChange={(event) =>
                    updateBlock(index, (current) => ({ ...current, text: event.target.value }))
                  }
                />
              </div>
            </div>
          ) : block.type === "button" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`block-label-${block.id}`}>Texto del botón</Label>
                <Input
                  id={`block-label-${block.id}`}
                  value={block.title}
                  onChange={(event) =>
                    updateBlock(index, (current) => ({ ...current, title: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`block-url-${block.id}`}>Enlace (ruta /... o URL https)</Label>
                <Input
                  id={`block-url-${block.id}`}
                  value={block.url}
                  onChange={(event) =>
                    updateBlock(index, (current) => ({ ...current, url: event.target.value }))
                  }
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`block-layout-${block.id}`}>Distribución de la subsección</Label>
                <select
                  id={`block-layout-${block.id}`}
                  value={block.layout}
                  onChange={(event) =>
                    updateBlock(index, (current) => ({
                      ...current,
                      layout: event.target.value as ClubBuilderBlock["layout"],
                    }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="vertical">Vertical</option>
                  <option value="horizontal">Horizontal</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`block-title-${block.id}`}>Título de subsección</Label>
                <Input
                  id={`block-title-${block.id}`}
                  value={block.title}
                  onChange={(event) =>
                    updateBlock(index, (current) => ({ ...current, title: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`block-text-${block.id}`}>Texto introductorio (opcional)</Label>
                <Textarea
                  id={`block-text-${block.id}`}
                  rows={2}
                  value={block.text}
                  onChange={(event) =>
                    updateBlock(index, (current) => ({ ...current, text: event.target.value }))
                  }
                />
              </div>
              <div className="border-l-2 border-primary/30 pl-3">
                <BuilderBlockList
                  nested
                  blocks={block.children}
                  onMediaUpload={onMediaUpload}
                  onChange={(children) =>
                    updateBlock(index, (current) => ({ ...current, children }))
                  }
                />
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

export function RenderBuilderBlock({ block }: { block: ClubBuilderBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="font-display text-2xl uppercase tracking-wide text-foreground sm:text-3xl">
          {block.title}
        </h2>
      );
    case "subtitle":
      return (
        <h3 className="font-cond text-lg font-semibold uppercase tracking-wide text-primary">
          {block.title}
        </h3>
      );
    case "paragraph":
      return (
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {block.text}
        </p>
      );
    case "image":
      return block.url ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-secondary/40">
          <img
            src={block.url}
            alt={block.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      ) : null;
    case "video":
      return block.url ? (
        <video
          src={block.url}
          controls
          controlsList="nodownload"
          playsInline
          preload="metadata"
          aria-label={block.title || undefined}
          onContextMenu={(event) => event.preventDefault()}
          className="max-h-[560px] w-full rounded-2xl bg-black"
        />
      ) : null;
    case "price":
      return (
        <div className="rounded-xl border border-primary/30 bg-background/70 p-4 text-center">
          {block.title && (
            <p className="font-cond text-xs uppercase tracking-widest text-muted-foreground">
              {block.title}
            </p>
          )}
          <p className="font-display mt-1 text-3xl text-primary">{block.text}</p>
        </div>
      );
    case "button":
      return block.url ? (
        <Button asChild className="font-cond uppercase tracking-wide">
          <a
            href={block.url}
            target={block.url.startsWith("http") ? "_blank" : undefined}
            rel={block.url.startsWith("http") ? "noreferrer" : undefined}
          >
            {block.title}
          </a>
        </Button>
      ) : null;
    case "subsection":
      return (
        <div className="space-y-3 rounded-xl border border-border/70 bg-background/50 p-4">
          <h3 className="font-display text-lg uppercase tracking-wide text-foreground">
            {block.title}
          </h3>
          {block.text && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">{block.text}</p>
          )}
          <div
            className={block.layout === "horizontal" ? "grid gap-3 sm:grid-cols-2" : "space-y-3"}
          >
            {block.children.map((child) => (
              <RenderBuilderBlock key={child.id} block={child} />
            ))}
          </div>
        </div>
      );
  }
}

export function ClubLandingCustomSections({ layout }: { layout: ClubBuilderLayout }) {
  return (
    <>
      {layout.customSections.map((section) => {
        const order = layout.order.indexOf(section.id);
        if (!section.enabled || order < 0) return null;
        const background = {
          none: "",
          card: "border border-border bg-card",
          dark: "border border-border bg-secondary/60",
          fire: "border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card",
        }[section.background];
        const width =
          section.width === "full" ? "relative left-1/2 w-screen -translate-x-1/2" : "w-full";
        const layoutClass =
          section.layout === "horizontal" ? "grid gap-5 sm:grid-cols-2" : "space-y-5";

        return (
          <section
            key={section.id}
            style={{ order }}
            className={`mt-14 rounded-3xl px-6 py-10 sm:px-10 ${background} ${width}`}
          >
            <div className={section.width === "contained" ? "mx-auto max-w-4xl" : "w-full"}>
              <div className={layoutClass}>
                {section.blocks.map((block) => (
                  <RenderBuilderBlock key={block.id} block={block} />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}

export function ClubLandingBuiltInExtras({
  sectionId,
  layout,
}: {
  sectionId: string;
  layout: ClubBuilderLayout;
}) {
  const options = layout.sectionOptions[sectionId];
  if (!options?.blocks.length) return null;
  const background = {
    none: "",
    card: "border border-border bg-card",
    dark: "border border-border bg-secondary/60",
    fire: "border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card",
  }[options.background];
  const width = options.width === "full" ? "relative left-1/2 w-screen -translate-x-1/2" : "";
  const layoutClass = options.layout === "horizontal" ? "grid gap-5 sm:grid-cols-2" : "space-y-5";

  return (
    <div className={`mt-8 rounded-2xl p-5 sm:p-7 ${background} ${width}`}>
      <div className={layoutClass}>
        {options.blocks.map((block) => (
          <RenderBuilderBlock key={block.id} block={block} />
        ))}
      </div>
    </div>
  );
}
