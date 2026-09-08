import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  ImageOff,
  Star,
  GripVertical,
  FolderCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { getMyClub } from "@/lib/club.functions";
import {
  adminListProducts,
  adminUpsertProduct,
  adminDeleteProduct,
  adminUploadProductImage,
  adminUpsertCategory,
  adminDeleteCategory,
  adminReorderProducts,
  type CatalogProduct,
} from "@/lib/catalog.functions";
import {
  adminListCombos,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CURRENCY } from "@/data/products";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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

export const Route = createFileRoute("/_authenticated/admin-productos")({
  head: () => ({
    meta: [
      { title: "Productos · Admin · Churrasqueando" },
      {
        name: "description",
        content: "Panel interno para administrar el catálogo de productos de Churrasqueando.",
      },
    ],
  }),
  component: AdminProductos,
});

type FormState = {
  id?: string;
  categoryId: string;
  name: string;
  price: string;
  unit: string;
  description: string;
  imageUrl: string;
  isBestSeller: boolean;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  categoryId: "",
  name: "",
  price: "",
  unit: "",
  description: "",
  imageUrl: "",
  isBestSeller: false,
  active: true,
};

type ComboFormState = {
  id?: string;
  name: string;
  price: string;
  unit: string;
  description: string;
  items: string;
  imageUrl: string;
  active: boolean;
};

const EMPTY_COMBO_FORM: ComboFormState = {
  name: "",
  price: "",
  unit: "",
  description: "",
  items: "",
  imageUrl: "",
  active: true,
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AdminProductos() {
  const fetchClub = useServerFn(getMyClub);
  const fetchProducts = useServerFn(adminListProducts);
  const upsert = useServerFn(adminUpsertProduct);
  const remove = useServerFn(adminDeleteProduct);
  const uploadImage = useServerFn(adminUploadProductImage);
  const upsertCategory = useServerFn(adminUpsertCategory);
  const removeCategory = useServerFn(adminDeleteCategory);
  const reorderProducts = useServerFn(adminReorderProducts);
  const fetchCombos = useServerFn(adminListCombos);
  const upsertCombo = useServerFn(adminUpsertCombo);
  const removeCombo = useServerFn(adminDeleteCombo);
  const uploadComboImageFn = useServerFn(adminUploadProductImage);
  const reorderCombos = useServerFn(adminReorderCombos);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const comboFileInputRef = useRef<HTMLInputElement>(null);

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const catalog = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => fetchProducts(),
    enabled: !!me.data?.isAdmin,
  });
  const comboCatalog = useQuery({
    queryKey: ["admin", "combos"],
    queryFn: () => fetchCombos(),
    enabled: !!me.data?.isAdmin,
  });

  const [activeTab, setActiveTab] = useState("productos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CatalogProduct | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{
    id?: string;
    name: string;
    tagline: string;
  }>({ name: "", tagline: "" });
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const [comboDialogOpen, setComboDialogOpen] = useState(false);
  const [comboForm, setComboForm] = useState<ComboFormState>(EMPTY_COMBO_FORM);
  const [comboUploading, setComboUploading] = useState(false);
  const [comboDeleteTarget, setComboDeleteTarget] = useState<StoreCombo | null>(null);
  const [comboDragId, setComboDragId] = useState<string | null>(null);
  const [comboLocalOrder, setComboLocalOrder] = useState<string[] | null>(null);

  const categories = catalog.data?.categories ?? [];
  const products = catalog.data?.products ?? [];
  const categoryName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const filtered = useMemo(() => {
    const base = filter === "all" ? products : products.filter((p) => p.category_id === filter);
    if (!localOrder) return base;
    const byId = new Map(base.map((p) => [p.id, p]));
    return localOrder.map((id) => byId.get(id)).filter((p): p is CatalogProduct => !!p);
  }, [products, filter, localOrder]);

  const canReorder = filter !== "all";

  const combos = comboCatalog.data?.combos ?? [];
  const filteredCombos = useMemo(() => {
    if (!comboLocalOrder) return combos;
    const byId = new Map(combos.map((c) => [c.id, c]));
    return comboLocalOrder.map((id) => byId.get(id)).filter((c): c is StoreCombo => !!c);
  }, [combos, comboLocalOrder]);

  const saveMutation = useMutation({
    mutationFn: (vars: FormState) =>
      upsert({
        data: {
          id: vars.id,
          categoryId: vars.categoryId,
          name: vars.name,
          price: Number(vars.price.replace(",", ".")) || 0,
          unit: vars.unit,
          description: vars.description,
          imageUrl: vars.imageUrl || null,
          isBestSeller: vars.isBestSeller,
          active: vars.active,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Producto actualizado" : "Producto creado");
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo guardar el producto"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Producto eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo eliminar el producto"),
  });

  const saveCategoryMutation = useMutation({
    mutationFn: (vars: { id?: string; name: string; tagline: string }) =>
      upsertCategory({ data: vars }),
    onSuccess: () => {
      toast.success(categoryForm.id ? "Categoría actualizada" : "Categoría creada");
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setCategoryForm({ name: "", tagline: "" });
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo guardar la categoría"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => removeCategory({ data: { id } }),
    onSuccess: () => {
      toast.success("Categoría eliminada");
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setCategoryDeleteTarget(null);
      if (filter === categoryDeleteTarget?.id) setFilter("all");
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo eliminar la categoría"),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderProducts({ data: { orderedIds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setLocalOrder(null);
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "No se pudo guardar el nuevo orden");
      setLocalOrder(null);
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
          items: vars.items.split("\n").map((i) => i.trim()).filter(Boolean),
          imageUrl: vars.imageUrl || null,
          active: vars.active,
        },
      }),
    onSuccess: () => {
      toast.success(comboForm.id ? "Combo actualizado" : "Combo creado");
      queryClient.invalidateQueries({ queryKey: ["admin", "combos"] });
      setComboDialogOpen(false);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo guardar el combo"),
  });

  const deleteComboMutation = useMutation({
    mutationFn: (id: string) => removeCombo({ data: { id } }),
    onSuccess: () => {
      toast.success("Combo eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin", "combos"] });
      setComboDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo eliminar el combo"),
  });

  const reorderCombosMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderCombos({ data: { orderedIds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "combos"] });
      setComboLocalOrder(null);
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "No se pudo guardar el nuevo orden");
      setComboLocalOrder(null);
    },
  });

  const changeFilter = (v: string) => {
    setFilter(v);
    setLocalOrder(null);
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, categoryId: filter !== "all" ? filter : categories[0]?.id ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (p: CatalogProduct) => {
    setForm({
      id: p.id,
      categoryId: p.category_id ?? "",
      name: p.name,
      price: String(p.price),
      unit: p.unit,
      description: p.description,
      imageUrl: p.image ?? "",
      isBestSeller: p.is_best_seller,
      active: p.active,
    });
    setDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) {
      toast.error("La imagen no debe superar 5 MB");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const result = await uploadImage({ data: { fileName: file.name, dataUrl } });
      setForm((f) => ({ ...f, imageUrl: result.url }));
      toast.success("Imagen subida");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) {
      toast.error("Selecciona una categoría");
      return;
    }
    saveMutation.mutate(form);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    saveCategoryMutation.mutate(categoryForm);
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId || !canReorder) {
      setDragId(null);
      return;
    }
    const currentIds = filtered.map((p) => p.id);
    const from = currentIds.indexOf(dragId);
    const to = currentIds.indexOf(targetId);
    if (from === -1 || to === -1) {
      setDragId(null);
      return;
    }
    const next = [...currentIds];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    setLocalOrder(next);
    setDragId(null);
    reorderMutation.mutate(next);
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
      items: c.items.join("\n"),
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
      const result = await uploadComboImageFn({ data: { fileName: file.name, dataUrl } });
      setComboForm((f) => ({ ...f, imageUrl: result.url }));
      toast.success("Imagen subida");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo subir la imagen");
    } finally {
      setComboUploading(false);
      if (comboFileInputRef.current) comboFileInputRef.current.value = "";
    }
  };

  const handleComboSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comboForm.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    saveComboMutation.mutate(comboForm);
  };

  const handleComboDrop = (targetId: string) => {
    if (!comboDragId || comboDragId === targetId) {
      setComboDragId(null);
      return;
    }
    const currentIds = filteredCombos.map((c) => c.id);
    const from = currentIds.indexOf(comboDragId);
    const to = currentIds.indexOf(targetId);
    if (from === -1 || to === -1) {
      setComboDragId(null);
      return;
    }
    const next = [...currentIds];
    next.splice(from, 1);
    next.splice(to, 0, comboDragId);
    setComboLocalOrder(next);
    setComboDragId(null);
    reorderCombosMutation.mutate(next);
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
            Productos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agrega, edita o elimina productos y combos de la tienda. Los cambios se reflejan al
            instante en la página principal, la tienda, el Club y el dashboard del cliente.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="productos" className="font-cond uppercase tracking-wide">
            Productos
          </TabsTrigger>
          <TabsTrigger value="combos" className="font-cond uppercase tracking-wide">
            Combos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="productos" className="mt-6 space-y-0">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setCategoriesOpen(true)}
          className="font-cond uppercase tracking-wide"
        >
          <FolderCog className="h-4 w-4" /> Categorías
        </Button>
        <Button
          onClick={openCreate}
          disabled={categories.length === 0}
          className="font-cond uppercase tracking-wide"
        >
          <Plus className="h-4 w-4" /> Agregar producto
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select value={filter} onValueChange={changeFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} producto{filtered.length === 1 ? "" : "s"}
        </span>
        {canReorder ? (
          <span className="text-xs text-muted-foreground">
            · Arrastra <GripVertical className="inline h-3 w-3" /> para reordenar
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            · Elige una categoría para poder reordenar
          </span>
        )}
      </div>

      {catalog.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-14"></TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow
                  key={p.id}
                  draggable={canReorder}
                  onDragStart={() => setDragId(p.id)}
                  onDragOver={(e) => canReorder && e.preventDefault()}
                  onDrop={() => handleDrop(p.id)}
                  className={dragId === p.id ? "opacity-50" : undefined}
                >
                  <TableCell className="w-8 px-2">
                    {canReorder && (
                      <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-secondary/40">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      {p.name}
                      {p.is_best_seller && (
                        <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.unit}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {categoryName.get(p.category_id ?? "") ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.price} {CURRENCY}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-cond rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        p.active
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {p.active ? "Activo" : "Oculto"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No hay productos en esta categoría todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
        </TabsContent>

        <TabsContent value="combos" className="mt-6 space-y-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {filteredCombos.length} combo{filteredCombos.length === 1 ? "" : "s"} · Arrastra{" "}
              <GripVertical className="inline h-3 w-3" /> para reordenar · aparecen en la página
              principal, la tienda, el Club y el dashboard del cliente
            </span>
            <Button onClick={openCreateCombo} className="font-cond uppercase tracking-wide">
              <Plus className="h-4 w-4" /> Agregar combo
            </Button>
          </div>

          {comboCatalog.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-14"></TableHead>
                    <TableHead>Combo</TableHead>
                    <TableHead>Para</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCombos.map((c) => (
                    <TableRow
                      key={c.id}
                      draggable
                      onDragStart={() => setComboDragId(c.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleComboDrop(c.id)}
                      className={comboDragId === c.id ? "opacity-50" : undefined}
                    >
                      <TableCell className="w-8 px-2">
                        <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-secondary/40">
                          {c.image ? (
                            <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImageOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          {c.name}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {c.items.length} producto{c.items.length === 1 ? "" : "s"} incluidos
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {c.unit || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.price} {CURRENCY}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-cond rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                            c.active
                              ? "bg-primary/15 text-primary"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {c.active ? "Activo" : "Oculto"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditCombo(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setComboDeleteTarget(c)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCombos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        Todavía no hay combos. Crea el primero con "Agregar combo".
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            <DialogDescription>
              Completa la información del producto. Los campos con imagen aparecen en la tienda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/30">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageOff className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <Label>Imagen</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="font-cond block w-full text-xs text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-secondary-foreground"
                />
                {uploading && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Subiendo imagen…
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nombre</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Precio ({CURRENCY})</Label>
                <Input
                  id="p-price"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-unit">Unidad / peso</Label>
                <Input
                  id="p-unit"
                  placeholder="ej. 1 - 1,5 kg"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Descripción</Label>
              <Textarea
                id="p-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Best seller</p>
                <p className="text-xs text-muted-foreground">Se destaca en la tienda</p>
              </div>
              <Switch
                checked={form.isBestSeller}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isBestSeller: v }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Producto activo</p>
                <p className="text-xs text-muted-foreground">
                  Visible en la tienda para los clientes
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="font-cond uppercase tracking-wide"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending || uploading}
                className="font-cond uppercase tracking-wide"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto dejará de mostrarse en la tienda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Categorías</DialogTitle>
            <DialogDescription>
              Crea, renombra o elimina categorías del catálogo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  {c.tagline && (
                    <p className="truncate text-xs text-muted-foreground">{c.tagline}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setCategoryForm({ id: c.id, name: c.name, tagline: c.tagline ?? "" })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setCategoryDeleteTarget({ id: c.id, name: c.name })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Todavía no hay categorías.
              </p>
            )}
          </div>

          <form
            onSubmit={handleCategorySubmit}
            className="space-y-3 border-t border-border pt-4"
          >
            <p className="font-cond text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {categoryForm.id ? "Editar categoría" : "Nueva categoría"}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nombre</Label>
              <Input
                id="c-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-tagline">Descripción corta (opcional)</Label>
              <Input
                id="c-tagline"
                value={categoryForm.tagline}
                onChange={(e) => setCategoryForm((f) => ({ ...f, tagline: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              {categoryForm.id && (
                <Button
                  type="button"
                  variant="outline"
                  className="font-cond uppercase tracking-wide"
                  onClick={() => setCategoryForm({ name: "", tagline: "" })}
                >
                  Cancelar edición
                </Button>
              )}
              <Button
                type="submit"
                disabled={saveCategoryMutation.isPending}
                className="font-cond uppercase tracking-wide"
              >
                {saveCategoryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {categoryForm.id ? "Guardar cambios" : "Crear categoría"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!categoryDeleteTarget}
        onOpenChange={(open) => !open && setCategoryDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{categoryDeleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Solo se puede eliminar si no tiene productos asignados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                categoryDeleteTarget && deleteCategoryMutation.mutate(categoryDeleteTarget.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategoryMutation.isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={comboDialogOpen} onOpenChange={setComboDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{comboForm.id ? "Editar combo" : "Nuevo combo"}</DialogTitle>
            <DialogDescription>
              Los combos aparecen en la página principal, la tienda, el Club y el dashboard del
              cliente.
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
                  ref={comboFileInputRef}
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
              <Label htmlFor="c-combo-name">Nombre del combo</Label>
              <Input
                id="c-combo-name"
                value={comboForm.name}
                onChange={(e) => setComboForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-combo-price">Precio ({CURRENCY})</Label>
                <Input
                  id="c-combo-price"
                  inputMode="decimal"
                  value={comboForm.price}
                  onChange={(e) => setComboForm((f) => ({ ...f, price: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-combo-unit">Para cuántas personas</Label>
                <Input
                  id="c-combo-unit"
                  placeholder="ej. hasta 12 personas"
                  value={comboForm.unit}
                  onChange={(e) => setComboForm((f) => ({ ...f, unit: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-combo-desc">Descripción</Label>
              <Textarea
                id="c-combo-desc"
                rows={3}
                value={comboForm.description}
                onChange={(e) => setComboForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-combo-items">Productos incluidos (uno por línea)</Label>
              <Textarea
                id="c-combo-items"
                rows={5}
                placeholder={"1.5 kg Bananinha\n1 kg Picaña\n2 unid. Linguiças"}
                value={comboForm.items}
                onChange={(e) => setComboForm((f) => ({ ...f, items: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Combo activo</p>
                <p className="text-xs text-muted-foreground">
                  Visible en la tienda, el Club y el dashboard del cliente
                </p>
              </div>
              <Switch
                checked={comboForm.active}
                onCheckedChange={(v) => setComboForm((f) => ({ ...f, active: v }))}
              />
            </div>

            <DialogFooter>
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
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El combo dejará de mostrarse en la página
              principal, la tienda, el Club y el dashboard del cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => comboDeleteTarget && deleteComboMutation.mutate(comboDeleteTarget.id)}
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
