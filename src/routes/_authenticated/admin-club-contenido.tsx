import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Copy,
  Eye,
  Image as ImageIcon,
  Loader2,
  MoveDown,
  MoveUp,
  Plus,
  RotateCcw,
  Save,
  CopyPlus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { getMyClub } from "@/lib/club.functions";
import {
  adminCreateClubVideoUploadUrl,
  adminSaveClubContent,
  adminUploadClubImage,
  getClubContent,
} from "@/lib/club-content.functions";
import {
  CLUB_LANDING_COLLECTION_DEFAULTS,
  CLUB_LANDING_DEFAULTS,
  CLUB_LANDING_SECTIONS,
  CLUB_BUILDER_SECTIONS,
  getClubBuilderLayout,
  type ClubBuilderBlock,
  type ClubBuilderLayout,
  parseClubBuilderMembershipCard,
  type ClubLandingCollection,
  type ClubLandingField,
} from "@/lib/club-landing-content";
import { ClubLandingPage } from "@/routes/club";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import clubHero from "@/assets/club/club-hero.jpg";
import clubVideo from "@/assets/club/club-video-thumb.jpg";
import logo from "@/assets/logo-churrasqueando.png";

export const Route = createFileRoute("/_authenticated/admin-club-contenido")({
  head: () => ({
    meta: [
      { title: "Editor de la página del Club · Admin · Churrasqueando" },
      {
        name: "description",
        content: "Edita por secciones los textos, imágenes y listas de la página pública del Club.",
      },
    ],
  }),
  component: AdminClubContenido,
});

const DEFAULT_IMAGES: Record<string, string> = {
  hero_image: clubHero,
  video_image: clubVideo,
  footer_logo: logo,
};

type CollectionItem = Record<string, unknown>;

function parseCollection(value: string): CollectionItem[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error("La lista guardada tiene un formato inválido");
  return parsed.filter((item): item is CollectionItem => typeof item === "object" && item !== null);
}

function createCollectionItem(key: string, fields: ClubLandingCollection["fields"], index: number) {
  const item: CollectionItem = { id: `${key}-${Date.now()}-${index}` };
  if (key === "benefits") item.icon = "lock";
  if (key === "founder_perks") item.icon = "star";
  for (const field of fields) item[field.key] = "";
  return item;
}

function removeImageTwoMembershipBlocks(value: string) {
  const layout = getClubBuilderLayout(value);
  const membership = layout.sectionOptions.membership;
  const unwantedTitles = new Set([
    "sumate al club",
    "plan anual fundador",
    "plan anual fundador internacional",
  ]);
  let removed = 0;
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLocaleLowerCase();
  const filterBlocks = (blocks: ClubBuilderBlock[]): ClubBuilderBlock[] =>
    blocks.flatMap((block) => {
      const copiedItemTitles: string[] = [];
      if (block.type === "component") {
        try {
          const snapshot: unknown = JSON.parse(block.text);
          if (snapshot && typeof snapshot === "object" && "item" in snapshot) {
            const item = snapshot.item;
            if (item && typeof item === "object" && !Array.isArray(item)) {
              for (const key of ["title", "name", "label", "subtitle"]) {
                const candidate = (item as Record<string, unknown>)[key];
                if (typeof candidate === "string") copiedItemTitles.push(candidate);
              }
            }
          }
        } catch {
          copiedItemTitles.length = 0;
        }
      }
      if (
        [block.title, ...copiedItemTitles].some((title) => unwantedTitles.has(normalize(title)))
      ) {
        removed += 1;
        return [];
      }
      if (block.type !== "subsection") return [block];
      const children = filterBlocks(block.children);
      if (block.children.length > 0 && children.length === 0) {
        removed += 1;
        return [];
      }
      return [{ ...block, children }];
    });
  const blocks = filterBlocks(membership.blocks);
  return {
    removed,
    value:
      removed > 0
        ? JSON.stringify({
            ...layout,
            sectionOptions: {
              ...layout.sectionOptions,
              membership: { ...membership, blocks },
            },
          })
        : value,
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("No se pudo leer la imagen"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

async function uploadClubVideo(
  file: File,
  createUploadUrl: (options: { data: { contentType: string } }) => Promise<{
    path: string;
    token: string;
    publicUrl: string;
    contentType: string;
  }>,
) {
  if (!["video/mp4", "video/webm", "video/ogg"].includes(file.type)) {
    throw new Error("Usa un video MP4, WebM u OGG");
  }
  if (file.size > 300 * 1024 * 1024) throw new Error("El video no debe superar 300 MB");

  const { path, token, publicUrl, contentType } = await createUploadUrl({
    data: { contentType: file.type },
  });
  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase.storage
    .from("club-content")
    .uploadToSignedUrl(path, token, file, { contentType });
  if (error) throw error;

  return publicUrl;
}

function AdminClubContenido() {
  const fetchClub = useServerFn(getMyClub);
  const fetchContent = useServerFn(getClubContent);
  const save = useServerFn(adminSaveClubContent);
  const uploadImage = useServerFn(adminUploadClubImage);
  const createVideoUploadUrl = useServerFn(adminCreateClubVideoUploadUrl);
  const queryClient = useQueryClient();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const initialContentHandled = useRef(false);

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const content = useQuery({
    queryKey: ["club-content"],
    queryFn: () => fetchContent(),
    enabled: !!me.data?.isAdmin,
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [clipboardBlock, setClipboardBlock] = useState<ClubBuilderBlock | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState("hero");
  const [editorDialogOpen, setEditorDialogOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<
    | { kind: "field"; key: string }
    | { kind: "collection"; key: string; id: string }
    | { kind: "block"; sectionId: string; id: string }
    | { kind: "membership-card" }
    | null
  >(null);
  const builderLayout = getClubBuilderLayout(form.club_builder);

  const saveMutation = useMutation({
    mutationFn: (entries: Record<string, string>) => save({ data: { entries } }),
    onSuccess: async () => {
      toast.success("Página del Club actualizada");
      await queryClient.invalidateQueries({ queryKey: ["club-content"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo guardar"),
  });

  useEffect(() => {
    if (!content.data || initialContentHandled.current) return;
    initialContentHandled.current = true;
    const entries = { ...CLUB_LANDING_DEFAULTS, ...content.data };
    const cleanup = removeImageTwoMembershipBlocks(entries.club_builder);
    entries.club_builder = cleanup.value;
    setForm(entries);
    if (cleanup.removed > 0) saveMutation.mutate(entries);
  }, [content.data, saveMutation]);

  const handleImageChange = async (key: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Usa una imagen PNG, JPG o WebP");
      event.target.value = "";
      return;
    }
    if (file.size > 6_000_000) {
      toast.error("La imagen no debe superar 6 MB");
      event.target.value = "";
      return;
    }
    setUploadingKey(key);
    try {
      const dataUrl = await fileToDataUrl(file);
      const result = await uploadImage({ data: { fileName: file.name, dataUrl } });
      setForm((current) => ({ ...current, [key]: result.url }));
      toast.success("Imagen subida. Guarda los cambios para publicarla.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir la imagen");
    } finally {
      setUploadingKey(null);
      const input = fileInputs.current[key];
      if (input) input.value = "";
    }
  };

  const uploadBuilderImage = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("Usa una imagen PNG, JPG o WebP");
    }
    if (file.size > 6_000_000) throw new Error("La imagen no debe superar 6 MB");
    setUploadingKey("builder");
    try {
      const dataUrl = await fileToDataUrl(file);
      const result = await uploadImage({ data: { fileName: file.name, dataUrl } });
      return result.url;
    } finally {
      setUploadingKey(null);
    }
  };

  const uploadBuilderMedia = async (file: File, type: "image" | "video") => {
    if (type === "video") {
      setUploadingKey("builder");
      try {
        return await uploadClubVideo(file, createVideoUploadUrl);
      } finally {
        setUploadingKey(null);
      }
    }
    return uploadBuilderImage(file);
  };

  const copyBlock = (block: ClubBuilderBlock) => {
    setClipboardBlock(block);
    toast.success("Elemento copiado. Pégalo en cualquier sección o subsección.");
  };

  const copyCollectionItem = (item: CollectionItem, collectionKey: string) => {
    copyBlock({
      id: `block-${crypto.randomUUID()}`,
      type: "component",
      title: collectionKey,
      text: JSON.stringify({ collection: collectionKey, item }),
      url: "",
      layout: "vertical",
      children: [],
    });
  };

  const createMembershipCardBlockFromPreview = () => {
    const element = document.querySelector<HTMLElement>(
      ".club-visual-editor [data-club-edit-membership-card]",
    );
    if (!element) return null;
    const card = parseClubBuilderMembershipCard(element.dataset.clubMembershipCard ?? "");
    if (!card) return null;
    return {
      id: `block-${crypto.randomUUID()}`,
      type: "membership-card" as const,
      title: element.dataset.clubMembershipIntro ?? "",
      text: JSON.stringify(card),
      url: "",
      layout: "vertical" as const,
      children: [],
    };
  };

  const updateLayout = (update: (layout: ClubBuilderLayout) => ClubBuilderLayout) => {
    setForm((current) => {
      const layout = getClubBuilderLayout(current.club_builder);
      return { ...current, club_builder: JSON.stringify(update(layout)) };
    });
  };

  const addVisualSection = () => {
    if (builderLayout.customSections.length >= 30) {
      toast.error("Ya alcanzaste el máximo de 30 secciones personalizadas");
      return;
    }
    const id = `custom-${crypto.randomUUID()}`;
    updateLayout((layout) => ({
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
          blocks: [
            {
              id: `block-${crypto.randomUUID()}`,
              type: "heading",
              title: "Nueva sección",
              text: "",
              url: "",
              layout: "vertical",
              children: [],
            },
          ],
        },
      ],
    }));
    setSelectedSectionId(id);
  };

  const addVisualBlock = (type: ClubBuilderBlock["type"]) => {
    if (
      selectedTarget?.kind === "block" &&
      selectedBlock?.type === "subsection" &&
      type === "subsection"
    ) {
      toast.error("No se pueden anidar subsecciones dentro de otra subsección");
      return;
    }
    const block: ClubBuilderBlock = {
      id: `block-${crypto.randomUUID()}`,
      type,
      title: type === "subsection" ? "Nueva subsección" : "",
      text: "",
      url: "",
      layout: "vertical",
      children: [],
    };
    updateLayout((layout) => {
      if (selectedTarget?.kind === "block" && selectedBlock?.type === "subsection") {
        const appendToSubsection = (blocks: ClubBuilderBlock[]) =>
          updateBlockInTree(blocks, selectedTarget.id, (current) =>
            current.type === "subsection" && current.children.length < 20
              ? { ...current, children: [...current.children, block] }
              : current,
          );
        const custom = layout.customSections.find(
          (section) => section.id === selectedTarget.sectionId,
        );
        if (custom) {
          return {
            ...layout,
            customSections: layout.customSections.map((section) =>
              section.id === selectedTarget.sectionId
                ? { ...section, blocks: appendToSubsection(section.blocks) }
                : section,
            ),
          };
        }
        const options = layout.sectionOptions[selectedTarget.sectionId];
        if (options) {
          return {
            ...layout,
            sectionOptions: {
              ...layout.sectionOptions,
              [selectedTarget.sectionId]: {
                ...options,
                blocks: appendToSubsection(options.blocks),
              },
            },
          };
        }
      }
      const customSection = layout.customSections.find(
        (section) => section.id === selectedSectionId,
      );
      if (customSection) {
        if (customSection.blocks.length >= 40) {
          toast.error("Esta sección alcanzó el límite de elementos");
          return layout;
        }
        return {
          ...layout,
          customSections: layout.customSections.map((section) =>
            section.id === selectedSectionId
              ? { ...section, blocks: [...section.blocks, block] }
              : section,
          ),
        };
      }
      const options = layout.sectionOptions[selectedSectionId];
      if (!options || options.blocks.length >= 40) {
        toast.error("Esta sección alcanzó el límite de elementos");
        return layout;
      }
      return {
        ...layout,
        sectionOptions: {
          ...layout.sectionOptions,
          [selectedSectionId]: { ...options, blocks: [...options.blocks, block] },
        },
      };
    });
  };

  const cloneBlock = (block: ClubBuilderBlock): ClubBuilderBlock => ({
    ...block,
    id: `block-${crypto.randomUUID()}`,
    children: block.children.map(cloneBlock),
  });

  const updateBlockInTree = (
    blocks: ClubBuilderBlock[],
    id: string,
    updater: (block: ClubBuilderBlock) => ClubBuilderBlock,
  ): ClubBuilderBlock[] =>
    blocks.map((block) =>
      block.id === id
        ? updater(block)
        : { ...block, children: updateBlockInTree(block.children, id, updater) },
    );

  const removeBlockFromTree = (blocks: ClubBuilderBlock[], id: string): ClubBuilderBlock[] =>
    blocks.flatMap((block) =>
      block.id === id ? [] : [{ ...block, children: removeBlockFromTree(block.children, id) }],
    );

  const updateSelectedCollection = (field: string, value: string) => {
    if (selectedTarget?.kind !== "collection") return;
    setForm((current) => {
      const items = parseCollection(
        current[selectedTarget.key] ??
          CLUB_LANDING_DEFAULTS[selectedTarget.key] ??
          JSON.stringify(CLUB_LANDING_COLLECTION_DEFAULTS[selectedTarget.key] ?? []),
      );
      return {
        ...current,
        [selectedTarget.key]: JSON.stringify(
          items.map((item) =>
            String(item.id ?? "") === selectedTarget.id ? { ...item, [field]: value } : item,
          ),
        ),
      };
    });
  };

  const moveVisualSection = (offset: number) => {
    updateLayout((layout) => {
      const index = layout.order.indexOf(selectedSectionId);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= layout.order.length) return layout;
      const order = [...layout.order];
      [order[index], order[target]] = [order[target], order[index]];
      return { ...layout, order };
    });
  };

  const copySelectedComponent = () => {
    if (selectedTarget?.kind === "membership-card") {
      const block = createMembershipCardBlockFromPreview();
      if (!block) {
        toast.error("No se pudo copiar la tarjeta de membresía");
        return;
      }
      setClipboardBlock(block);
      toast.success("Tarjeta de membresía copiada. Pégala para crear una versión independiente.");
      return;
    }
    if (selectedTarget?.kind === "collection") {
      const items = parseCollection(
        form[selectedTarget.key] ??
          CLUB_LANDING_DEFAULTS[selectedTarget.key] ??
          JSON.stringify(CLUB_LANDING_COLLECTION_DEFAULTS[selectedTarget.key] ?? []),
      );
      const selectedItem = items.find((item) => String(item.id ?? "") === selectedTarget.id);
      if (selectedItem) copyCollectionItem(selectedItem, selectedTarget.key);
      return;
    }
    if (selectedTarget?.kind !== "block") return;
    const layout = getClubBuilderLayout(form.club_builder);
    const section = layout.customSections.find((item) => item.id === selectedTarget.sectionId);
    const blocks = section?.blocks ?? layout.sectionOptions[selectedTarget.sectionId]?.blocks ?? [];
    const findBlock = (items: ClubBuilderBlock[]): ClubBuilderBlock | undefined => {
      for (const block of items) {
        if (block.id === selectedTarget.id) return block;
        const child = findBlock(block.children);
        if (child) return child;
      }
    };
    const block = findBlock(blocks);
    if (block) {
      setClipboardBlock(block);
      toast.success("Componente copiado. Selecciona dónde pegarlo.");
    }
  };

  const duplicateSelectedMembershipCard = () => {
    if (selectedTarget?.kind !== "membership-card") return;
    const block = createMembershipCardBlockFromPreview();
    if (!block) {
      toast.error("No se pudo duplicar la tarjeta de membresía");
      return;
    }
    if (builderLayout.sectionOptions.membership.blocks.length >= 40) {
      toast.error("Esta sección alcanzó el límite de elementos");
      return;
    }
    updateLayout((layout) => {
      const options = layout.sectionOptions.membership;
      return {
        ...layout,
        sectionOptions: {
          ...layout.sectionOptions,
          membership: { ...options, blocks: [...options.blocks, block] },
        },
      };
    });
    setSelectedTarget({ kind: "block", sectionId: "membership", id: block.id });
    setEditorDialogOpen(true);
    toast.success("Tarjeta duplicada. Edita el contenido de la nueva versión.");
  };

  const pasteComponent = () => {
    if (!clipboardBlock) return;
    if (
      selectedTarget?.kind === "block" &&
      selectedBlock?.type === "subsection" &&
      clipboardBlock.type === "subsection"
    ) {
      toast.error("No se pueden anidar subsecciones dentro de otra subsección");
      return;
    }
    updateLayout((layout) => {
      const block = cloneBlock(clipboardBlock);
      if (selectedTarget?.kind === "block" && selectedBlock?.type === "subsection") {
        const appendToSubsection = (blocks: ClubBuilderBlock[]) =>
          updateBlockInTree(blocks, selectedTarget.id, (current) =>
            current.type === "subsection" && current.children.length < 20
              ? { ...current, children: [...current.children, block] }
              : current,
          );
        const custom = layout.customSections.find((item) => item.id === selectedTarget.sectionId);
        if (custom) {
          return {
            ...layout,
            customSections: layout.customSections.map((item) =>
              item.id === selectedTarget.sectionId
                ? { ...item, blocks: appendToSubsection(item.blocks) }
                : item,
            ),
          };
        }
        const options = layout.sectionOptions[selectedTarget.sectionId];
        if (options) {
          return {
            ...layout,
            sectionOptions: {
              ...layout.sectionOptions,
              [selectedTarget.sectionId]: {
                ...options,
                blocks: appendToSubsection(options.blocks),
              },
            },
          };
        }
      }
      const custom = layout.customSections.find((item) => item.id === selectedSectionId);
      if (custom) {
        if (custom.blocks.length >= 40) return layout;
        return {
          ...layout,
          customSections: layout.customSections.map((item) =>
            item.id === selectedSectionId ? { ...item, blocks: [...item.blocks, block] } : item,
          ),
        };
      }
      const options = layout.sectionOptions[selectedSectionId];
      if (!options || options.blocks.length >= 40) return layout;
      return {
        ...layout,
        sectionOptions: {
          ...layout.sectionOptions,
          [selectedSectionId]: { ...options, blocks: [...options.blocks, block] },
        },
      };
    });
    toast.success("Componente pegado en la sección seleccionada.");
  };

  const handlePreviewClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const block = target.closest<HTMLElement>("[data-club-edit-block]");
    if (block?.dataset.clubEditBlock && block.dataset.clubSectionId) {
      event.preventDefault();
      event.stopPropagation();
      setSelectedTarget({
        kind: "block",
        sectionId: block.dataset.clubSectionId,
        id: block.dataset.clubEditBlock,
      });
      setEditorDialogOpen(true);
      setSelectedSectionId(block.dataset.clubSectionId);
      return;
    }
    const field = target.closest<HTMLElement>("[data-club-edit-field]");
    if (field?.dataset.clubEditField) {
      event.preventDefault();
      event.stopPropagation();
      setSelectedTarget({ kind: "field", key: field.dataset.clubEditField });
      setEditorDialogOpen(true);
      return;
    }
    const collection = target.closest<HTMLElement>("[data-club-edit-collection]");
    if (collection?.dataset.clubEditCollection && collection.dataset.clubEditId) {
      event.preventDefault();
      event.stopPropagation();
      setSelectedTarget({
        kind: "collection",
        key: collection.dataset.clubEditCollection,
        id: collection.dataset.clubEditId,
      });
      setEditorDialogOpen(true);
      const sectionId =
        collection.closest<HTMLElement>("[data-club-section-id]")?.dataset.clubSectionId;
      if (sectionId) setSelectedSectionId(sectionId);
      return;
    }
    if (target.closest("[data-club-edit-membership-card]")) {
      event.preventDefault();
      event.stopPropagation();
      setSelectedTarget({ kind: "membership-card" });
      setSelectedSectionId("membership");
      setEditorDialogOpen(true);
      return;
    }
    if (target.closest("a, button")) return;
    const section = target.closest<HTMLElement>("[data-club-section-id]");
    if (section?.dataset.clubSectionId) {
      setSelectedSectionId(section.dataset.clubSectionId);
      setSelectedTarget(null);
    }
  };

  const handleSectionDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const dragged = document.querySelector<HTMLElement>("[data-club-section-dragging='true']");
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-club-section-id]");
    const draggedId = dragged?.dataset.clubSectionId;
    const targetId = target?.dataset.clubSectionId;
    if (!draggedId || !targetId || draggedId === targetId) return;
    updateLayout((layout) => {
      const order = [...layout.order];
      const from = order.indexOf(draggedId);
      const to = order.indexOf(targetId);
      if (from < 0 || to < 0) return layout;
      order.splice(to, 0, ...order.splice(from, 1));
      return { ...layout, order };
    });
  };

  const selectedField =
    selectedTarget?.kind === "field"
      ? CLUB_LANDING_SECTIONS.flatMap((section) => section.fields).find(
          (field) => field.key === selectedTarget.key,
        )
      : undefined;
  const selectedCollection =
    selectedTarget?.kind === "collection"
      ? CLUB_LANDING_SECTIONS.flatMap((section) => section.collections ?? []).find(
          (collection) => collection.key === selectedTarget.key,
        )
      : undefined;
  const selectedCollectionItem =
    selectedTarget?.kind === "collection"
      ? parseCollection(
          form[selectedTarget.key] ??
            CLUB_LANDING_DEFAULTS[selectedTarget.key] ??
            JSON.stringify(CLUB_LANDING_COLLECTION_DEFAULTS[selectedTarget.key] ?? []),
        ).find((item) => String(item.id ?? "") === selectedTarget.id)
      : undefined;
  const selectedBlock =
    selectedTarget?.kind === "block"
      ? (() => {
          const layout = getClubBuilderLayout(form.club_builder);
          const section = layout.customSections.find(
            (item) => item.id === selectedTarget.sectionId,
          );
          const blocks =
            section?.blocks ?? layout.sectionOptions[selectedTarget.sectionId]?.blocks ?? [];
          const findBlock = (items: ClubBuilderBlock[]): ClubBuilderBlock | undefined => {
            for (const block of items) {
              if (block.id === selectedTarget.id) return block;
              const child = findBlock(block.children);
              if (child) return child;
            }
          };
          return findBlock(blocks);
        })()
      : undefined;
  const selectedMembershipCard =
    selectedBlock?.type === "membership-card"
      ? parseClubBuilderMembershipCard(selectedBlock.text)
      : undefined;
  const copiedComponentData =
    selectedBlock?.type === "component"
      ? (() => {
          try {
            const parsed: unknown = JSON.parse(selectedBlock.text);
            if (!parsed || typeof parsed !== "object" || !("item" in parsed)) return undefined;
            const snapshot = parsed as { collection?: unknown; item?: unknown };
            const value = snapshot.item;
            if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
            return {
              collection: String(snapshot.collection ?? ""),
              item: value as CollectionItem,
            };
          } catch {
            return undefined;
          }
        })()
      : undefined;
  const copiedCollectionDefinition = copiedComponentData
    ? CLUB_LANDING_SECTIONS.flatMap((section) => section.collections ?? []).find(
        (collection) => collection.key === copiedComponentData.collection,
      )
    : undefined;

  const updateSelectedBlock = (updates: Partial<ClubBuilderBlock>) => {
    if (selectedTarget?.kind !== "block") return;
    updateLayout((layout) => {
      const updateSectionBlocks = (blocks: ClubBuilderBlock[]) =>
        updateBlockInTree(blocks, selectedTarget.id, (block) => ({ ...block, ...updates }));
      const customSection = layout.customSections.some(
        (section) => section.id === selectedTarget.sectionId,
      );
      if (customSection) {
        return {
          ...layout,
          customSections: layout.customSections.map((section) =>
            section.id === selectedTarget.sectionId
              ? { ...section, blocks: updateSectionBlocks(section.blocks) }
              : section,
          ),
        };
      }
      const options = layout.sectionOptions[selectedTarget.sectionId];
      if (!options) return layout;
      return {
        ...layout,
        sectionOptions: {
          ...layout.sectionOptions,
          [selectedTarget.sectionId]: {
            ...options,
            blocks: updateSectionBlocks(options.blocks),
          },
        },
      };
    });
  };

  const updateCopiedComponentField = (field: string, value: string) => {
    if (!selectedBlock || !copiedComponentData) return;
    updateSelectedBlock({
      text: JSON.stringify({
        ...copiedComponentData,
        item: { ...copiedComponentData.item, [field]: value },
      }),
    });
  };

  const updateMembershipBlockField = (field: string, value: string) => {
    if (!selectedBlock || !selectedMembershipCard) return;
    if (field === "intro") {
      updateSelectedBlock({ title: value });
      return;
    }
    const updated = {
      ...selectedMembershipCard,
      [field]:
        field === "perks"
          ? value
              .split("\n")
              .map((perk) => perk.trim())
              .filter(Boolean)
          : value,
    };
    updateSelectedBlock({ text: JSON.stringify(updated) });
  };

  const updateOriginalMembershipPerks = (value: string) => {
    const perks = value
      .split("\n")
      .map((perk) => perk.trim())
      .filter(Boolean)
      .map((text, index) => ({ id: `membership-perk-${index}`, text }));
    setForm((current) => ({ ...current, membership_perks: JSON.stringify(perks) }));
  };

  const selectedObjectHidden =
    (selectedTarget?.kind === "block" && selectedBlock?.hidden === true) ||
    (selectedTarget?.kind === "collection" && selectedCollectionItem?.hidden === true) ||
    (selectedTarget?.kind === "membership-card" &&
      builderLayout.sectionOptions.membership.membershipCardHidden === true);

  const toggleSelectedObjectVisibility = () => {
    if (selectedTarget?.kind === "block") {
      updateSelectedBlock({ hidden: selectedBlock?.hidden !== true });
      return;
    }
    if (selectedTarget?.kind === "collection") {
      setForm((current) => {
        const items = parseCollection(
          current[selectedTarget.key] ??
            CLUB_LANDING_DEFAULTS[selectedTarget.key] ??
            JSON.stringify(CLUB_LANDING_COLLECTION_DEFAULTS[selectedTarget.key] ?? []),
        );
        return {
          ...current,
          [selectedTarget.key]: JSON.stringify(
            items.map((item) =>
              String(item.id ?? "") === selectedTarget.id
                ? { ...item, hidden: selectedCollectionItem?.hidden !== true }
                : item,
            ),
          ),
        };
      });
      return;
    }
    if (selectedTarget?.kind === "membership-card") {
      updateLayout((layout) => {
        const options = layout.sectionOptions.membership;
        return {
          ...layout,
          sectionOptions: {
            ...layout.sectionOptions,
            membership: {
              ...options,
              membershipCardHidden: !options.membershipCardHidden,
            },
          },
        };
      });
    }
  };

  const deleteSelectedObject = () => {
    if (selectedTarget?.kind === "collection") {
      setForm((current) => {
        const items = parseCollection(
          current[selectedTarget.key] ??
            CLUB_LANDING_DEFAULTS[selectedTarget.key] ??
            JSON.stringify(CLUB_LANDING_COLLECTION_DEFAULTS[selectedTarget.key] ?? []),
        );
        return {
          ...current,
          [selectedTarget.key]: JSON.stringify(
            items.filter((item) => String(item.id ?? "") !== selectedTarget.id),
          ),
        };
      });
    } else if (selectedTarget?.kind === "block") {
      updateLayout((layout) => {
        const section = layout.customSections.find((item) => item.id === selectedTarget.sectionId);
        if (section) {
          return {
            ...layout,
            customSections: layout.customSections.map((item) =>
              item.id === section.id
                ? { ...item, blocks: removeBlockFromTree(item.blocks, selectedTarget.id) }
                : item,
            ),
          };
        }
        const options = layout.sectionOptions[selectedTarget.sectionId];
        if (!options) return layout;
        return {
          ...layout,
          sectionOptions: {
            ...layout.sectionOptions,
            [selectedTarget.sectionId]: {
              ...options,
              blocks: removeBlockFromTree(options.blocks, selectedTarget.id),
            },
          },
        };
      });
    } else if (selectedTarget?.kind === "membership-card") {
      updateLayout((layout) => ({
        ...layout,
        sectionOptions: {
          ...layout.sectionOptions,
          membership: {
            ...layout.sectionOptions.membership,
            membershipCardHidden: true,
          },
        },
      }));
    } else {
      return;
    }
    setSelectedTarget(null);
    setEditorDialogOpen(false);
    toast.success("Elemento eliminado de la página. Puedes guardar los cambios.");
  };

  const handleVideoChange = async (key: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setUploadingKey(key);
    try {
      const url = await uploadClubVideo(file, createVideoUploadUrl);
      setForm((current) => ({ ...current, [key]: url }));
      toast.success("Video subido. Guarda los cambios para publicarlo.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir el video");
    } finally {
      setUploadingKey(null);
      input.value = "";
    }
  };

  if (me.isLoading) {
    return (
      <ClubShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </ClubShell>
    );
  }

  if (me.isError || !me.data) {
    return (
      <ClubShell>
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo validar el acceso. Recarga la página o vuelve a iniciar sesión.
        </p>
      </ClubShell>
    );
  }

  if (!me.data.isAdmin) {
    return (
      <ClubShell points={me.data.profile.points} isMember={me.data.isMember}>
        <h1 className="font-display text-2xl uppercase tracking-wide text-foreground">
          Acceso restringido
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección es solo para el equipo de Churrasqueando.
        </p>
      </ClubShell>
    );
  }

  return (
    <ClubShell points={me.data.profile.points} isMember={me.data.isMember} isAdmin>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">
            Editor de la página del Club
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Edita directamente sobre el diseño de la página: selecciona textos, imágenes o tarjetas;
            agrega componentes y ordena las secciones.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="font-cond uppercase tracking-wide">
          <a href="/club" target="_blank" rel="noreferrer">
            <Eye className="h-3.5 w-3.5" /> Vista pública
          </a>
        </Button>
      </div>

      {content.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : content.isError ? (
        <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo cargar el contenido de la página.
        </p>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (uploadingKey) {
              toast.error("Espera a que termine la carga de los archivos");
              return;
            }
            saveMutation.mutate(form);
          }}
        >
          <div className="sticky top-2 z-20 space-y-3 rounded-2xl border border-primary/30 bg-background/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="club-visual-section" className="sr-only">
                Sección seleccionada
              </Label>
              <select
                id="club-visual-section"
                value={selectedSectionId}
                onChange={(event) => {
                  setSelectedSectionId(event.target.value);
                  setSelectedTarget(null);
                }}
                className="h-9 min-w-48 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                {builderLayout.order.map((id) => {
                  const custom = builderLayout.customSections.find((section) => section.id === id);
                  const fixed = CLUB_BUILDER_SECTIONS.find((section) => section.id === id);
                  return (
                    <option key={id} value={id}>
                      {custom?.title ?? fixed?.title ?? id}
                    </option>
                  );
                })}
              </select>
              <Button type="button" variant="outline" size="sm" onClick={addVisualSection}>
                <Plus className="h-4 w-4" /> Sección
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addVisualBlock("subsection")}
              >
                <Plus className="h-4 w-4" /> Subsección
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addVisualBlock("card")}
              >
                <Plus className="h-4 w-4" /> Tarjeta
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!clipboardBlock}
                onClick={pasteComponent}
              >
                Pegar componente
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => moveVisualSection(-1)}
                aria-label="Subir sección"
              >
                <MoveUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => moveVisualSection(1)}
                aria-label="Bajar sección"
              >
                <MoveDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateLayout((layout) => {
                    const custom = layout.customSections.find(
                      (section) => section.id === selectedSectionId,
                    );
                    if (custom) {
                      return {
                        ...layout,
                        customSections: layout.customSections.map((section) =>
                          section.id === selectedSectionId
                            ? { ...section, enabled: !section.enabled }
                            : section,
                        ),
                      };
                    }
                    return {
                      ...layout,
                      hiddenSectionIds: layout.hiddenSectionIds.includes(selectedSectionId)
                        ? layout.hiddenSectionIds.filter((id) => id !== selectedSectionId)
                        : [...layout.hiddenSectionIds, selectedSectionId],
                    };
                  })
                }
              >
                {(builderLayout.customSections.find((section) => section.id === selectedSectionId)
                  ?.enabled ?? !builderLayout.hiddenSectionIds.includes(selectedSectionId))
                  ? "Ocultar"
                  : "Mostrar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  selectedTarget?.kind !== "collection" &&
                  selectedTarget?.kind !== "block" &&
                  selectedTarget?.kind !== "membership-card"
                }
                onClick={copySelectedComponent}
              >
                <Copy className="h-4 w-4" /> Copiar seleccionado
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedTarget?.kind !== "membership-card"}
                onClick={duplicateSelectedMembershipCard}
              >
                <CopyPlus className="h-4 w-4" /> Duplicar tarjeta
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  selectedTarget?.kind !== "block" &&
                  selectedTarget?.kind !== "collection" &&
                  selectedTarget?.kind !== "membership-card"
                }
                onClick={toggleSelectedObjectVisibility}
              >
                {selectedObjectHidden ? "Mostrar elemento" : "Ocultar elemento"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={
                  selectedTarget?.kind !== "block" &&
                  selectedTarget?.kind !== "collection" &&
                  selectedTarget?.kind !== "membership-card"
                }
                onClick={deleteSelectedObject}
              >
                <Trash2 className="h-4 w-4" /> Eliminar elemento
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  updateLayout((layout) => {
                    const custom = layout.customSections.find(
                      (section) => section.id === selectedSectionId,
                    );
                    if (custom) {
                      return {
                        ...layout,
                        order: layout.order.filter((id) => id !== selectedSectionId),
                        customSections: layout.customSections.filter(
                          (section) => section.id !== selectedSectionId,
                        ),
                      };
                    }
                    return {
                      ...layout,
                      hiddenSectionIds: layout.hiddenSectionIds.includes(selectedSectionId)
                        ? layout.hiddenSectionIds
                        : [...layout.hiddenSectionIds, selectedSectionId],
                    };
                  });
                  setSelectedTarget(null);
                  if (
                    builderLayout.customSections.some((section) => section.id === selectedSectionId)
                  ) {
                    setSelectedSectionId("hero");
                  }
                  toast.success("Sección eliminada de la página. Puedes guardar los cambios.");
                }}
              >
                <Trash2 className="h-4 w-4" /> Eliminar sección
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveMutation.isPending || !!uploadingKey}
                className="ml-auto font-cond uppercase tracking-wide"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Haz clic sobre un texto, imagen o tarjeta para editarlo. Arrastra una sección por su
              superficie para cambiar el orden. Selecciona un componente y cópialo para pegarlo en
              otra sección.
            </p>
          </div>

          {builderLayout.customSections.some((section) => section.id === selectedSectionId) && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
              <Label htmlFor="club-custom-section-title">Nombre de la sección seleccionada</Label>
              <Input
                id="club-custom-section-title"
                value={
                  builderLayout.customSections.find((section) => section.id === selectedSectionId)
                    ?.title ?? ""
                }
                onChange={(event) =>
                  updateLayout((layout) => ({
                    ...layout,
                    customSections: layout.customSections.map((section) =>
                      section.id === selectedSectionId
                        ? {
                            ...section,
                            title: event.target.value,
                            blocks: section.blocks.map((block, index) =>
                              index === 0 &&
                              block.type === "heading" &&
                              block.title === section.title
                                ? { ...block, title: event.target.value }
                                : block,
                            ),
                          }
                        : section,
                    ),
                  }))
                }
                className="max-w-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateLayout((layout) => ({
                    ...layout,
                    customSections: layout.customSections.map((section) =>
                      section.id === selectedSectionId
                        ? { ...section, enabled: !section.enabled }
                        : section,
                    ),
                  }))
                }
              >
                {builderLayout.customSections.find((section) => section.id === selectedSectionId)
                  ?.enabled
                  ? "Ocultar sección"
                  : "Mostrar sección"}
              </Button>
            </div>
          )}

          <div
            className="club-visual-editor space-y-3 rounded-2xl border border-border bg-card p-3 sm:p-5"
            onClick={handlePreviewClick}
            onDragStart={(event) => {
              const section = (event.target as HTMLElement).closest<HTMLElement>(
                "[data-club-section-id]",
              );
              if (!section) return;
              section.dataset.clubSectionDragging = "true";
              setSelectedSectionId(section.dataset.clubSectionId ?? "hero");
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleSectionDrop}
            onDragEnd={() => {
              document
                .querySelectorAll("[data-club-section-dragging='true']")
                .forEach((section) => delete (section as HTMLElement).dataset.clubSectionDragging);
            }}
          >
            <ClubLandingPage initialContent={form} contentOverride={form} embedded editorMode />
          </div>
        </form>
      )}

      <Dialog
        open={editorDialogOpen}
        onOpenChange={(open) => {
          setEditorDialogOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {selectedField?.label ??
                selectedCollection?.label ??
                (selectedTarget?.kind === "block"
                  ? "Editar componente"
                  : selectedTarget?.kind === "membership-card"
                    ? "Editar tarjeta de membresía"
                    : "Editar elemento")}
            </DialogTitle>
          </DialogHeader>
          {selectedTarget?.kind === "field" && selectedField && (
            <LandingField
              field={selectedField}
              value={form[selectedField.key] ?? CLUB_LANDING_DEFAULTS[selectedField.key] ?? ""}
              onChange={(value) =>
                setForm((current) => ({ ...current, [selectedField.key]: value }))
              }
              imageFallback={DEFAULT_IMAGES[selectedField.key]}
              inputRef={(element) => {
                fileInputs.current[selectedField.key] = element;
              }}
              uploading={uploadingKey === selectedField.key}
              onImageChange={(event) => void handleImageChange(selectedField.key, event)}
              onVideoChange={(event) => void handleVideoChange(selectedField.key, event)}
              onRestore={() =>
                setForm((current) => ({
                  ...current,
                  [selectedField.key]: CLUB_LANDING_DEFAULTS[selectedField.key],
                }))
              }
            />
          )}
          {selectedTarget?.kind === "membership-card" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Edita el contenido de la tarjeta. El precio principal se toma del plan anual activo.
              </p>
              {[
                { key: "membership_course_intro", label: "Texto introductorio" },
                { key: "membership_price_caption", label: "Descripción del precio" },
                { key: "membership_regular_price", label: "Precio regular" },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`membership-card-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`membership-card-${field.key}`}
                    value={form[field.key] ?? CLUB_LANDING_DEFAULTS[field.key] ?? ""}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="membership-card-perks">Beneficios (uno por línea)</Label>
                <Textarea
                  id="membership-card-perks"
                  rows={5}
                  value={parseCollection(
                    form.membership_perks ??
                      CLUB_LANDING_DEFAULTS.membership_perks ??
                      JSON.stringify(CLUB_LANDING_COLLECTION_DEFAULTS.membership_perks ?? []),
                  )
                    .map((item) => (typeof item.text === "string" ? item.text : ""))
                    .join("\n")}
                  onChange={(event) => updateOriginalMembershipPerks(event.target.value)}
                />
              </div>
            </div>
          )}
          {selectedTarget?.kind === "collection" &&
            selectedCollection &&
            selectedCollectionItem && (
              <div className="space-y-4">
                {selectedCollection.fields.map((field) => {
                  const id = `selected-${selectedCollection.key}-${field.key}`;
                  const value =
                    typeof selectedCollectionItem[field.key] === "string"
                      ? String(selectedCollectionItem[field.key])
                      : "";
                  return (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={id}>{field.label}</Label>
                      {field.image ? (
                        <>
                          {value && (
                            <img
                              src={value}
                              alt="Vista previa"
                              className="aspect-video w-full rounded-lg object-cover"
                            />
                          )}
                          <Input
                            id={id}
                            value={value}
                            onChange={(event) =>
                              updateSelectedCollection(field.key, event.target.value)
                            }
                            placeholder="URL de la imagen"
                          />
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
                            <Upload className="h-4 w-4" /> Subir imagen
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="sr-only"
                              onChange={async (event) => {
                                const input = event.currentTarget;
                                const file = input.files?.[0];
                                if (!file) return;
                                try {
                                  const url = await uploadBuilderImage(file);
                                  updateSelectedCollection(field.key, url);
                                  toast.success("Imagen cargada. Guarda para publicar.");
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error ? error.message : "No se pudo subir",
                                  );
                                } finally {
                                  input.value = "";
                                }
                              }}
                            />
                          </label>
                        </>
                      ) : field.multiline ? (
                        <Textarea
                          id={id}
                          rows={4}
                          value={value}
                          onChange={(event) =>
                            updateSelectedCollection(field.key, event.target.value)
                          }
                        />
                      ) : (
                        <Input
                          id={id}
                          value={value}
                          onChange={(event) =>
                            updateSelectedCollection(field.key, event.target.value)
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          {selectedTarget?.kind === "block" && selectedMembershipCard && selectedBlock && (
            <div className="space-y-4">
              {[
                { key: "intro", label: "Texto introductorio", value: selectedBlock.title },
                { key: "price", label: "Precio", value: selectedMembershipCard.price },
                {
                  key: "currency",
                  label: "Moneda y período",
                  value: selectedMembershipCard.currency,
                },
                {
                  key: "caption",
                  label: "Descripción del precio",
                  value: selectedMembershipCard.caption,
                },
                {
                  key: "regularPrice",
                  label: "Precio regular",
                  value: selectedMembershipCard.regularPrice,
                },
                {
                  key: "buttonLabel",
                  label: "Texto del botón",
                  value: selectedMembershipCard.buttonLabel,
                },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`membership-copy-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`membership-copy-${field.key}`}
                    value={field.value}
                    onChange={(event) => updateMembershipBlockField(field.key, event.target.value)}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="membership-copy-perks">Beneficios (uno por línea)</Label>
                <Textarea
                  id="membership-copy-perks"
                  rows={5}
                  value={selectedMembershipCard.perks.join("\n")}
                  onChange={(event) => updateMembershipBlockField("perks", event.target.value)}
                />
              </div>
            </div>
          )}
          {selectedTarget?.kind === "block" &&
            selectedBlock?.type === "component" &&
            copiedComponentData &&
            copiedCollectionDefinition && (
              <div className="space-y-4">
                {copiedCollectionDefinition.fields.map((field) => {
                  const id = `copied-component-${field.key}`;
                  const value =
                    typeof copiedComponentData.item[field.key] === "string"
                      ? String(copiedComponentData.item[field.key])
                      : "";
                  return (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={id}>{field.label}</Label>
                      {field.image ? (
                        <>
                          {value && (
                            <img
                              src={value}
                              alt="Vista previa"
                              className="aspect-video w-full rounded-lg object-cover"
                            />
                          )}
                          <Input
                            id={id}
                            value={value}
                            onChange={(event) =>
                              updateCopiedComponentField(field.key, event.target.value)
                            }
                            placeholder="URL de la imagen"
                          />
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
                            <Upload className="h-4 w-4" /> Subir imagen
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="sr-only"
                              onChange={async (event) => {
                                const input = event.currentTarget;
                                const file = input.files?.[0];
                                if (!file) return;
                                try {
                                  const url = await uploadBuilderImage(file);
                                  updateCopiedComponentField(field.key, url);
                                  toast.success("Imagen cargada. Guarda para publicar.");
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error ? error.message : "No se pudo subir",
                                  );
                                } finally {
                                  input.value = "";
                                }
                              }}
                            />
                          </label>
                        </>
                      ) : field.multiline ? (
                        <Textarea
                          id={id}
                          rows={4}
                          value={value}
                          onChange={(event) =>
                            updateCopiedComponentField(field.key, event.target.value)
                          }
                        />
                      ) : (
                        <Input
                          id={id}
                          value={value}
                          onChange={(event) =>
                            updateCopiedComponentField(field.key, event.target.value)
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          {selectedTarget?.kind === "block" &&
            selectedBlock &&
            selectedBlock.type !== "component" &&
            selectedBlock.type !== "membership-card" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="selected-block-title">Título</Label>
                  <Input
                    id="selected-block-title"
                    value={selectedBlock.title}
                    onChange={(event) => updateSelectedBlock({ title: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selected-block-text">Texto o descripción</Label>
                  <Textarea
                    id="selected-block-text"
                    rows={4}
                    value={selectedBlock.text}
                    onChange={(event) => updateSelectedBlock({ text: event.target.value })}
                  />
                </div>
                {["image", "card", "video", "button"].includes(selectedBlock.type) && (
                  <div className="space-y-2">
                    <Label htmlFor="selected-block-url">Imagen, video o enlace</Label>
                    <Input
                      id="selected-block-url"
                      value={selectedBlock.url}
                      onChange={(event) => updateSelectedBlock({ url: event.target.value })}
                    />
                    {["image", "card", "video"].includes(selectedBlock.type) && (
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
                        <Upload className="h-4 w-4" />
                        Subir {selectedBlock.type === "video" ? "video" : "imagen"}
                        <input
                          type="file"
                          accept={
                            selectedBlock.type === "video"
                              ? "video/mp4,video/webm,video/ogg"
                              : "image/png,image/jpeg,image/webp"
                          }
                          className="sr-only"
                          onChange={async (event) => {
                            const input = event.currentTarget;
                            const file = input.files?.[0];
                            if (!file) return;
                            try {
                              const url = await uploadBuilderMedia(
                                file,
                                selectedBlock.type === "video" ? "video" : "image",
                              );
                              updateSelectedBlock({ url });
                              toast.success("Archivo cargado. Guarda para publicar.");
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "No se pudo subir el archivo",
                              );
                            } finally {
                              input.value = "";
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}
                {selectedBlock.type === "card" && selectedBlock.url && (
                  <img
                    src={selectedBlock.url}
                    alt={selectedBlock.title}
                    className="aspect-video w-full rounded-xl object-cover"
                  />
                )}
              </div>
            )}
          {(selectedTarget?.kind === "collection" ||
            selectedTarget?.kind === "block" ||
            selectedTarget?.kind === "membership-card") && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={toggleSelectedObjectVisibility}>
                {selectedObjectHidden ? "Mostrar elemento" : "Ocultar elemento"}
              </Button>
              <Button type="button" variant="destructive" onClick={deleteSelectedObject}>
                <Trash2 className="h-4 w-4" /> Eliminar elemento
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ClubShell>
  );
}

function LandingField({
  field,
  value,
  onChange,
  imageFallback,
  inputRef,
  uploading,
  onImageChange,
  onVideoChange,
  onRestore,
}: {
  field: ClubLandingField;
  value: string;
  onChange: (value: string) => void;
  imageFallback?: string;
  inputRef: (element: HTMLInputElement | null) => void;
  uploading: boolean;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVideoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRestore: () => void;
}) {
  const id = `club-content-${field.key}`;

  if (field.type === "image") {
    return (
      <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center">
        <div className="aspect-video overflow-hidden rounded-xl border border-border bg-secondary">
          <img
            src={value.trim() || imageFallback}
            alt={`Vista previa: ${field.label}`}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id}>{field.label}</Label>
          <p className="text-xs text-muted-foreground">
            Sube PNG, JPG o WebP de hasta 6 MB. Recomendado: imagen horizontal de al menos 1200 px.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              id={id}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onImageChange}
              className="sr-only"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => document.getElementById(id)?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Subir imagen
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={onRestore}>
                <RotateCcw className="h-4 w-4" /> Usar imagen original
              </Button>
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            La nueva imagen se publica al guardar todos los cambios.
          </p>
        </div>
      </div>
    );
  }

  if (field.type === "video") {
    return (
      <div className="space-y-3">
        <Label htmlFor={id}>{field.label}</Label>
        <Input
          id={id}
          value={value}
          placeholder="Pega una URL HTTPS o sube un archivo"
          onChange={(event) => onChange(event.target.value)}
        />
        {value && (
          <video
            src={value}
            controls
            controlsList="nodownload"
            playsInline
            preload="metadata"
            onContextMenu={(event) => event.preventDefault()}
            className="aspect-video w-full max-w-2xl rounded-xl bg-black"
          />
        )}
        {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
        <input
          ref={inputRef}
          id={`${id}-upload`}
          type="file"
          accept="video/mp4,video/webm,video/ogg"
          onChange={onVideoChange}
          className="sr-only"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => document.getElementById(`${id}-upload`)?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Subir video (máx. 100 MB)
        </Button>
        <p className="text-xs text-muted-foreground">
          El video se sube al almacenamiento público de medios del Club y se muestra después de
          guardar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{field.label}</Label>
        <button
          type="button"
          onClick={onRestore}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" /> Original
        </button>
      </div>
      {field.type === "textarea" ? (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
        />
      ) : (
        <Input
          id={id}
          type={field.type === "number" ? "number" : "text"}
          min={field.type === "number" ? 0 : undefined}
          step={field.type === "number" ? 1 : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
    </div>
  );
}

function LandingCollectionEditor({
  collection,
  value,
  onChange,
  onCopyItem,
  onUploadImage,
}: {
  collection: ClubLandingCollection;
  value: string;
  onChange: (value: string) => void;
  onCopyItem: (item: CollectionItem) => void;
  onUploadImage: (index: number, key: string, file: File) => Promise<void>;
}) {
  const items = parseCollection(value);

  const updateItem = (index: number, key: string, itemValue: string) => {
    const next = items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [key]: itemValue } : item,
    );
    onChange(JSON.stringify(next));
  };

  const moveItem = (index: number, offset: number) => {
    const next = [...items];
    const target = index + offset;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(JSON.stringify(next));
  };

  return (
    <section className="space-y-4 rounded-xl border border-border/70 bg-background/50 p-4">
      <div>
        <h3 className="font-cond text-sm font-semibold uppercase tracking-wide text-foreground">
          {collection.label}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{collection.help}</p>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => {
          const itemTitle = ["title", "question", "name", "label", "subtitle"]
            .map((key) => item[key])
            .find((value): value is string => typeof value === "string" && !!value.trim());
          const itemDescription = ["description", "quote", "answer", "text", "bullets"]
            .map((key) => item[key])
            .find((value): value is string => typeof value === "string" && !!value.trim());
          const imageField = collection.fields.find((field) => field.image);
          const itemImage = imageField ? item[imageField.key] : undefined;
          const itemBadge = ["tag", "badge", "role"]
            .map((key) => item[key])
            .find((value): value is string => typeof value === "string" && !!value.trim());

          return (
            <article
              key={String(item.id ?? `${collection.key}-${index}`)}
              className="rounded-xl border border-border bg-card p-3 sm:p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-cond text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Elemento {index + 1}
                </p>
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Mover elemento ${index + 1} hacia arriba`}
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                  >
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Mover elemento ${index + 1} hacia abajo`}
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Duplicar elemento ${index + 1}`}
                    title="Duplicar en esta lista"
                    disabled={items.length >= 50}
                    onClick={() => {
                      const duplicate = {
                        ...items[index],
                        id: `${collection.key}-${crypto.randomUUID()}`,
                      };
                      onChange(
                        JSON.stringify([
                          ...items.slice(0, index + 1),
                          duplicate,
                          ...items.slice(index + 1),
                        ]),
                      );
                    }}
                  >
                    <CopyPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Copiar elemento ${index + 1} al editor visual`}
                    title="Copiar diseño para pegarlo en otra sección"
                    onClick={() => onCopyItem(item)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar elemento ${index + 1}`}
                    onClick={() => onChange(JSON.stringify(items.filter((_, i) => i !== index)))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="mb-4 overflow-hidden rounded-xl border border-border/70 bg-background">
                {typeof itemImage === "string" && itemImage ? (
                  <img
                    src={itemImage}
                    alt={itemTitle ?? ""}
                    className="aspect-[16/7] w-full object-cover"
                  />
                ) : null}
                <div className="space-y-2 p-4">
                  {itemBadge && (
                    <span className="font-cond inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {itemBadge}
                    </span>
                  )}
                  <h4 className="font-display text-lg uppercase tracking-wide text-foreground">
                    {itemTitle || `Elemento ${index + 1}`}
                  </h4>
                  {itemDescription && (
                    <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                      {itemDescription}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {collection.fields.map((field) => {
                  const id = `${collection.key}-${index}-${field.key}`;
                  return (
                    <div
                      key={field.key}
                      className={field.multiline ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}
                    >
                      <Label htmlFor={id}>{field.label}</Label>
                      {field.image ? (
                        <div className="space-y-2">
                          <div className="aspect-video max-w-sm overflow-hidden rounded-lg border border-border bg-secondary">
                            {typeof item[field.key] === "string" && item[field.key] ? (
                              <img
                                src={String(item[field.key])}
                                alt={`Vista previa de ${String(item.title ?? collection.label)}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                Sin imagen
                              </div>
                            )}
                          </div>
                          <Input
                            id={id}
                            value={
                              typeof item[field.key] === "string" ? String(item[field.key]) : ""
                            }
                            onChange={(event) => updateItem(index, field.key, event.target.value)}
                            placeholder="URL de la imagen"
                          />
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
                            <Upload className="h-4 w-4" />
                            Subir imagen
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="sr-only"
                              onChange={(event) => {
                                const file = event.currentTarget.files?.[0];
                                if (file) void onUploadImage(index, field.key, file);
                                event.currentTarget.value = "";
                              }}
                            />
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Sube PNG, JPG o WebP de hasta 6 MB, o pega una URL.
                          </p>
                        </div>
                      ) : field.multiline ? (
                        <Textarea
                          id={id}
                          rows={3}
                          value={typeof item[field.key] === "string" ? String(item[field.key]) : ""}
                          onChange={(event) => updateItem(index, field.key, event.target.value)}
                        />
                      ) : (
                        <Input
                          id={id}
                          value={typeof item[field.key] === "string" ? String(item[field.key]) : ""}
                          onChange={(event) => updateItem(index, field.key, event.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={items.length >= 50}
        onClick={() =>
          onChange(
            JSON.stringify([
              ...items,
              createCollectionItem(collection.key, collection.fields, items.length),
            ]),
          )
        }
        className="font-cond uppercase tracking-wide"
      >
        <Plus className="h-4 w-4" /> Agregar elemento
      </Button>
    </section>
  );
}
