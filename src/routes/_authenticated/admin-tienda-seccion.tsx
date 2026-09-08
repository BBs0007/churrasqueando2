import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  GripVertical,
  ImageOff,
  Flame,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { getMyClub } from "@/lib/club.functions";
import {
  adminGetStoreLayout,
  adminReorderSections,
  adminReorderProducts,
  adminUploadProductImage,
  type CatalogProduct,
  type StoreSection,
} from "@/lib/catalog.functions";
import {
  adminUpsertCombo,
  adminDeleteCombo,
  adminReorderCombos,
  type StoreCombo,
} from "@/lib/combos.functions";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CURRENCY } from "@/data/products";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin-tienda-seccion")({
  head: () => ({
    meta: [
      { title: "Tienda Sección · Admin · Churrasqueando" },
      {
        name: "description",
        content: "Vista previa de la tienda: reordena secciones y productos con arrastrar y soltar.",
      },
    ],
  }),
  component: AdminTiendaSeccion,
});

function MiniCard({
  item,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  dragging,
  onClick,
}: {
  item: { id: string; name: string; price: number; image?: string };
  draggable: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  dragging: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      className={`flex w-[150px] shrink-0 cursor-grab flex-col overflow-hidden rounded-xl border border-border bg-card active:cursor-grabbing ${
        onClick ? "cursor-pointer" : ""
      } ${dragging ? "opacity-40" : ""}`}
    >
      <div className="relative flex h-20 w-full items-center justify-center bg-secondary/30">
        {item.image ? (
          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-5 w-5 text-muted-foreground" />
        )}
        <GripVertical className="absolute right-1 top-1 h-4 w-4 rounded bg-background/70 text-muted-foreground" />
      </div>
      <div className="p-2">
        <p className="font-cond truncate text-[11px] font-semibold uppercase tracking-wide text-foreground">
          {item.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.price} {CURRENCY}
        </p>
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type ComboFormState = {
  id?: string;
  name: string;
  price: string;
  unit: string;
  description: string;
  itemsText: string;
  imageUrl: string;
  active: boolean;
};

const EMPTY_COMBO_FORM: ComboFormState = {
  name: "",
  price: "",
  unit: "",
  description: "",
  itemsText: "",
  imageUrl: "",
  active: true,
};

function AdminTiendaSeccion() {
  const fetchClub = useServerFn(getMyClub);
  const fetchLayout = useServerFn(adminGetStoreLayout);
  const reorderSections = useServerFn(adminReorderSections);
  const reorderProducts = useServerFn(adminReorderProducts);
  const reorderCombos = useServerFn(adminReorderCombos);
  const upsertCombo = useServerFn(adminUpsertCombo);
  const deleteCombo = useServerFn(adminDeleteCombo);
  const uploadImage = useServerFn(adminUploadProductImage);
  const queryClient = useQueryClient();
  const comboFileRef = useRef<HTMLInputElement>(null);

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const layout = useQuery({
    queryKey: ["admin", "store-layout"],
    queryFn: () => fetchLayout(),
    enabled: !!me.data?.isAdmin,
  });

  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [dragProductId, setDragProductId] = useState<string | null>(null);
  const [localSectionOrder, setLocalSectionOrder] = useState<string[] | null>(null);
  const [localProductOrder, setLocalProductOrder] = useState<Record<string, string[]>>({});
  const [localComboOrder, setLocalComboOrder] = useState<string[] | null>(null);
  const [dragComboId, setDragComboId] = useState<string | null>(null);
  const [comboDialogOpen, setComboDialogOpen] = useState(false);
  const [comboForm, setComboForm] = useState<ComboFormState>(EMPTY_COMBO_FORM);
  const [comboUploading, setComboUploading] = useState(false);
  const [comboDeleteTarget, setComboDeleteTarget] = useState<StoreCombo | null>(null);

  const sections = layout.data?.sections ?? [];
  const categories = layout.data?.categories ?? [];
  const combos = layout.data?.combos ?? [];

  const orderedCombos = useMemo(() => {
    if (!localComboOrder) return combos;
    const byId = new Map(combos.map((c) => [c.id, c]));
    return localComboOrder.map((id) => byId.get(id)).filter((c): c is StoreCombo => !!c);
  }, [combos, localComboOrder]);

  const orderedSections = useMemo(() => {
    if (!localSectionOrder) return sections;
    const byId = new Map(sections.map((s) => [s.id, s]));
    return localSectionOrder.map((id) => byId.get(id)).filter((s): s is StoreSection => !!s);
  }, [sections, localSectionOrder]);

  const bestSellers = useMemo(
    () =>
      categories
        .flatMap((c) => c.products)
        .filter((p) => p.is_best_seller)
        .sort((a, b) => a.sort_order - b.sort_order),
    [categories],
  );

  const reorderSectionsMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderSections({ data: { orderedIds } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "store-layout"] }),
    onError: (err: any) => {
      toast.error(err?.message ?? "No se pudo guardar el orden de secciones");
      setLocalSectionOrder(null);
    },
  });

  const reorderProductsMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderProducts({ data: { orderedIds } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "store-layout"] }),
    onError: (err: any) => {
      toast.error(err?.message ?? "No se pudo guardar el orden de productos");
      setLocalProductOrder({});
    },
  });

  const reorderCombosMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderCombos({ data: { orderedIds } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "store-layout"] }),
    onError: (err: any) => {
      toast.error(err?.message ?? "No se pudo guardar el orden de combos");
      setLocalComboOrder(null);
    },
  });

  const saveComboMutation = useMutation({
    mutationFn: (vars: ComboFormState) =>
      upsertCombo({
        data: {
          id: vars.id,
          name: vars.name,
          price: Number(vars.price.replace(",", ".")) || 0,
          unit: vars.unit,
          description: vars.description,
          items: vars.itemsText.split("\n"),
          imageUrl: vars.imageUrl || null,
          active: vars.active,
        },
      }),
    onSuccess: () => {
      toast.success(comboForm.id ? "Combo actualizado" : "Combo creado");
      queryClient.invalidateQueries({ queryKey: ["admin", "store-layout"] });
      setComboDialogOpen(false);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo guardar el combo"),
  });

  const deleteComboMutation = useMutation({
    mutationFn: (id: string) => deleteCombo({ data: { id } }),
    onSuccess: () => {
      toast.success("Combo eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin", "store-layout"] });
      setComboDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo eliminar el combo"),
  });

  const handleSectionDrop = (targetId: string) => {
    if (!dragSectionId || dragSectionId === targetId) {
      setDragSectionId(null);
      return;
    }
    const ids = orderedSections.map((s) => s.id);
    const from = ids.indexOf(dragSectionId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) {
      setDragSectionId(null);
      return;
    }
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragSectionId);
    setLocalSectionOrder(next);
    setDragSectionId(null);
    reorderSectionsMutation.mutate(next);
  };

  const handleProductDrop = (groupKey: string, currentIds: string[], targetId: string) => {
    if (!dragProductId || dragProductId === targetId) {
      setDragProductId(null);
      return;
    }
    const from = currentIds.indexOf(dragProductId);
    const to = currentIds.indexOf(targetId);
    if (from === -1 || to === -1) {
      setDragProductId(null);
      return;
    }
    const next = [...currentIds];
    next.splice(from, 1);
    next.splice(to, 0, dragProductId);
    setLocalProductOrder((prev) => ({ ...prev, [groupKey]: next }));
    setDragProductId(null);
    reorderProductsMutation.mutate(next);
  };

  const handleComboDrop = (targetId: string) => {
    if (!dragComboId || dragComboId === targetId) {
      setDragComboId(null);
      return;
    }
    const ids = orderedCombos.map((c) => c.id);
    const from = ids.indexOf(dragComboId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) {
      setDragComboId(null);
      return;
    }
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragComboId);
    setLocalComboOrder(next);
    setDragComboId(null);
    reorderCombosMutation.mutate(next);
  };

  const openCreateCombo = () => {
    setComboForm(EMPTY_COMBO_FORM);
    setComboDialogOpen(true);
  };

  const openEditCombo = (c: StoreCombo) => {
    setComboForm({
      id: c.id,
      name: c.name,
      price: String(c.price),
      unit: c.unit,
      description: c.description,
      itemsText: c.items.join("\n"),
      imageUrl: c.image ?? "",
      active: c.active,
    });
    setComboDialogOpen(true);
  };

  const handleComboFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) {
      toast.error("La imagen no debe superar 5 MB");
      return;
    }
    setComboUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const result = await uploadImage({ data: { fileName: file.name, dataUrl } });
      setComboForm((f) => ({ ...f, imageUrl: result.url }));
      toast.success("Imagen subida");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo subir la imagen");
    } finally {
      setComboUploading(false);
      if (comboFileRef.current) comboFileRef.current.value = "";
    }
  };

  const handleComboSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveComboMutation.mutate(comboForm);
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

  if (!me.data?.isAdmin) {
    return (
      <ClubShell points={me.data?.profile.points} isMember={me.data?.isMember}>
        <h1 className="font-display text-2xl uppercase tracking-wide text-foreground">
          Acceso restringido
        </h1>
      </ClubShell>
    );
  }

  return (
    <ClubShell points={me.data.profile.points} isMember={me.data.isMember} isAdmin>
      <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">
        Tienda Sección
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Así se ve la tienda. Arrastra el ícono <GripVertical className="inline h-3.5 w-3.5" /> del
        título para mover una sección completa arriba o abajo, y arrastra cada producto para
        moverlo dentro de su categoría.
      </p>

      {layout.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {orderedSections.map((section) => {
            const sectionCategories = categories.filter((c) => c.section_id === section.id);
            return (
              <section
                key={section.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleSectionDrop(section.id)}
                className={`rounded-2xl border border-border bg-card/50 p-4 ${
                  dragSectionId === section.id ? "opacity-50" : ""
                }`}
              >
                <div
                  draggable
                  onDragStart={() => setDragSectionId(section.id)}
                  className="mb-3 flex cursor-grab items-center gap-2 active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-cond text-sm font-bold uppercase tracking-[0.2em] text-foreground">
                    {section.title}
                  </h2>
                  {section.kind !== "categories" && (
                    <span className="font-cond rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {section.kind === "best_sellers" ? "Automática" : "Fija"}
                    </span>
                  )}
                </div>

                {section.kind === "best_sellers" && (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {bestSellers.length === 0 ? (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Flame className="h-4 w-4" /> Marca productos como "best seller" en
                        Productos para que aparezcan aquí.
                      </p>
                    ) : (
                      bestSellers.map((p) => (
                        <MiniCard
                          key={p.id}
                          item={p}
                          draggable
                          dragging={dragProductId === p.id}
                          onDragStart={() => setDragProductId(p.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() =>
                            handleProductDrop(
                              "best-sellers",
                              localProductOrder["best-sellers"] ?? bestSellers.map((b) => b.id),
                              p.id,
                            )
                          }
                        />
                      ))
                    )}
                  </div>
                )}

                {section.kind === "combos" && (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {orderedCombos.map((c) => (
                      <MiniCard
                        key={c.id}
                        item={c}
                        draggable
                        dragging={dragComboId === c.id}
                        onDragStart={() => setDragComboId(c.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleComboDrop(c.id)}
                        onClick={() => openEditCombo(c)}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={openCreateCombo}
                      className="flex h-[124px] w-[150px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="font-cond text-[11px] font-semibold uppercase tracking-wide">
                        Nuevo combo
                      </span>
                    </button>
                  </div>
                )}

                {section.kind === "categories" && (
                  <div className="space-y-4">
                    {sectionCategories.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Ninguna categoría asignada a esta sección todavía.
                      </p>
                    )}
                    {sectionCategories.map((cat) => {
                      const baseIds = cat.products.map((p) => p.id);
                      const orderIds = localProductOrder[cat.id] ?? baseIds;
                      const byId = new Map(cat.products.map((p) => [p.id, p]));
                      const ordered = orderIds
                        .map((id) => byId.get(id))
                        .filter((p): p is CatalogProduct => !!p);
                      return (
                        <div key={cat.id}>
                          <p className="font-cond mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {cat.name}
                          </p>
                          {ordered.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sin productos activos.</p>
                          ) : (
                            <div className="flex gap-3 overflow-x-auto pb-1">
                              {ordered.map((p) => (
                                <MiniCard
                                  key={p.id}
                                  item={p}
                                  draggable
                                  dragging={dragProductId === p.id}
                                  onDragStart={() => setDragProductId(p.id)}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={() => handleProductDrop(cat.id, orderIds, p.id)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={comboDialogOpen} onOpenChange={setComboDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{comboForm.id ? "Editar combo" : "Nuevo combo"}</DialogTitle>
            <DialogDescription>
              Los combos aparecen en la sección "Combos" de la tienda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleComboSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/30">
                {comboForm.imageUrl ? (
                  <img src={comboForm.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageOff className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <Label>Imagen</Label>
                <input
                  ref={comboFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleComboFileChange}
                  disabled={comboUploading}
                  className="font-cond block w-full text-xs text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-secondary-foreground"
                />
                {comboUploading && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Subiendo imagen…
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nombre</Label>
              <Input
                id="c-name"
                value={comboForm.name}
                onChange={(e) => setComboForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-price">Precio ({CURRENCY})</Label>
                <Input
                  id="c-price"
                  inputMode="decimal"
                  value={comboForm.price}
                  onChange={(e) => setComboForm((f) => ({ ...f, price: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-unit">Para cuántas personas</Label>
                <Input
                  id="c-unit"
                  placeholder="hasta 12 personas"
                  value={comboForm.unit}
                  onChange={(e) => setComboForm((f) => ({ ...f, unit: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-desc">Descripción (opcional)</Label>
              <Textarea
                id="c-desc"
                rows={2}
                value={comboForm.description}
                onChange={(e) => setComboForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-items">Qué incluye (un producto por línea)</Label>
              <Textarea
                id="c-items"
                rows={5}
                value={comboForm.itemsText}
                onChange={(e) => setComboForm((f) => ({ ...f, itemsText: e.target.value }))}
                placeholder={"1.5 kg Bananinha\n1 kg Picaña\n2 unid. Linguiças"}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Combo activo</p>
                <p className="text-xs text-muted-foreground">Visible en la tienda</p>
              </div>
              <Switch
                checked={comboForm.active}
                onCheckedChange={(v) => setComboForm((f) => ({ ...f, active: v }))}
              />
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              {comboForm.id && (
                <Button
                  type="button"
                  variant="outline"
                  className="font-cond uppercase tracking-wide text-destructive"
                  onClick={() => {
                    const target = combos.find((c) => c.id === comboForm.id);
                    if (target) setComboDeleteTarget(target);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Eliminar
                </Button>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setComboDialogOpen(false)}
                  className="font-cond uppercase tracking-wide"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saveComboMutation.isPending || comboUploading}
                  className="font-cond uppercase tracking-wide"
                >
                  {saveComboMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!comboDeleteTarget}
        onOpenChange={(open) => !open && setComboDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{comboDeleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (comboDeleteTarget) deleteComboMutation.mutate(comboDeleteTarget.id);
                setComboDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteComboMutation.isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ClubShell>
  );
}
