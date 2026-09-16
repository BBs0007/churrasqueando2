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
  Upload,
  Gift,
  Package,
  Search,
  X,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { getMyClub } from "@/lib/club.functions";
import {
  adminListPromoProducts,
  adminUpsertPromoProduct,
  adminDeletePromoProduct,
  adminUploadPromoImage,
  adminListPromotions,
  adminUpsertPromotion,
  adminDeletePromotion,
  adminSearchCatalogForPromo,
  type PromoProduct,
  type Promotion,
} from "@/lib/promotions.functions";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CURRENCY } from "@/data/products";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

export const Route = createFileRoute("/_authenticated/admin-promociones")({
  head: () => ({
    meta: [
      { title: "Promociones · Admin · Churrasqueando" },
      {
        name: "description",
        content: "Panel interno para administrar la tienda de promociones exclusiva de socios.",
      },
    ],
  }),
  component: AdminPromociones,
});

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AdminPromociones() {
  const fetchClub = useServerFn(getMyClub);
  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });

  if (me.isLoading || !me.data) {
    return (
      <ClubShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
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
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">
          Tienda de Promociones
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Exclusiva para socios del Club, visible en /promociones. Estos productos y paquetes{" "}
          <span className="font-semibold text-foreground">no aparecen</span> en la tienda
          principal de churrasqueando.shop.
        </p>
      </div>

      <Tabs defaultValue="promotions" className="mt-6">
        <TabsList>
          <TabsTrigger value="promotions" className="gap-1.5">
            <Gift className="h-3.5 w-3.5" /> Promociones (paquetes)
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5">
            <Package className="h-3.5 w-3.5" /> Productos de promoción
          </TabsTrigger>
        </TabsList>
        <TabsContent value="promotions" className="mt-5">
          <PromotionsSection />
        </TabsContent>
        <TabsContent value="products" className="mt-5">
          <PromoProductsSection />
        </TabsContent>
      </Tabs>
    </ClubShell>
  );
}

// ================= PRODUCTOS DE PROMOCIÓN =================

type ProductForm = {
  id?: string;
  name: string;
  price: string;
  unit: string;
  description: string;
  imageUrl: string;
  active: boolean;
  sortOrder: string;
};

const EMPTY_PRODUCT_FORM: ProductForm = {
  name: "",
  price: "0",
  unit: "unidad",
  description: "",
  imageUrl: "",
  active: true,
  sortOrder: "0",
};

function PromoProductsSection() {
  const fetchProducts = useServerFn(adminListPromoProducts);
  const upsert = useServerFn(adminUpsertPromoProduct);
  const remove = useServerFn(adminDeletePromoProduct);
  const uploadImage = useServerFn(adminUploadPromoImage);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const products = useQuery({ queryKey: ["admin", "promo-products"], queryFn: () => fetchProducts() });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY_PRODUCT_FORM);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromoProduct | null>(null);

  const upsertMutation = useMutation({
    mutationFn: (vars: ProductForm) =>
      upsert({
        data: {
          id: vars.id,
          name: vars.name,
          price: Number(vars.price) || 0,
          unit: vars.unit,
          description: vars.description,
          imageUrl: vars.imageUrl || null,
          active: vars.active,
          sortOrder: Number(vars.sortOrder) || 0,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Producto actualizado" : "Producto creado");
      queryClient.invalidateQueries({ queryKey: ["admin", "promo-products"] });
      queryClient.invalidateQueries({ queryKey: ["promo-store"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo guardar el producto"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Producto eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin", "promo-products"] });
      queryClient.invalidateQueries({ queryKey: ["promo-store"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo eliminar el producto"),
  });

  const openCreate = () => {
    setForm(EMPTY_PRODUCT_FORM);
    setDialogOpen(true);
  };
  const openEdit = (p: PromoProduct) => {
    setForm({
      id: p.id,
      name: p.name,
      price: String(p.price),
      unit: p.unit,
      description: p.description,
      imageUrl: p.image ?? "",
      active: p.active,
      sortOrder: String(p.sort_order),
    });
    setDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6_000_000) {
      toast.error("La imagen no debe superar 6 MB");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await uploadImage({ data: { fileName: file.name, dataUrl } });
      setForm((f) => ({ ...f, imageUrl: res.url }));
      toast.success("Imagen subida");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const list = products.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Artículos propios de la promo (gorras, poleras, tablas, etc). No pisan la tienda
          principal — solo se usan aquí y como piezas para armar paquetes.
        </p>
        <Button onClick={openCreate} className="font-cond uppercase tracking-wide">
          <Plus className="h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      {products.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {p.image ? (
                          <img src={p.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <ImageOff className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.unit}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.price} {CURRENCY}
                  </TableCell>
                  <TableCell>
                    {p.active ? (
                      <span className="font-cond rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        Activo
                      </span>
                    ) : (
                      <span className="font-cond rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Oculto
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Todavía no hay productos de promoción. Crea el primero.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar producto" : "Nuevo producto de promoción"}</DialogTitle>
            <DialogDescription>
              Solo visible en /promociones para socios. No aparece en /tienda.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              upsertMutation.mutate(form);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="pp-name">Nombre</Label>
              <Input
                id="pp-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Gorra Churrasqueando"
                required
                maxLength={120}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pp-price">Precio (Bs)</Label>
                <Input
                  id="pp-price"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pp-unit">Unidad</Label>
                <Input
                  id="pp-unit"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="unidad"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp-description">Descripción</Label>
              <Textarea
                id="pp-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Imagen</Label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageOff className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Subir imagen
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pp-sort">Orden</Label>
                <Input
                  id="pp-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                  id="pp-active"
                />
                <Label htmlFor="pp-active">Visible para socios</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={upsertMutation.isPending} className="font-cond uppercase tracking-wide">
                {upsertMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Si está usado en alguna promoción, se marcará como "producto eliminado" ahí. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ================= PROMOCIONES (PAQUETES) =================

type PickedItem = {
  source: "promo" | "catalog";
  productId: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
};

type PromotionForm = {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  price: string; // vacío = usar suma de ítems
  active: boolean;
  sortOrder: string;
  items: PickedItem[];
};

const EMPTY_PROMOTION_FORM: PromotionForm = {
  title: "",
  subtitle: "",
  description: "",
  imageUrl: "",
  price: "",
  active: true,
  sortOrder: "0",
  items: [],
};

function PromotionsSection() {
  const fetchPromotions = useServerFn(adminListPromotions);
  const upsert = useServerFn(adminUpsertPromotion);
  const remove = useServerFn(adminDeletePromotion);
  const uploadImage = useServerFn(adminUploadPromoImage);
  const fetchPromoProducts = useServerFn(adminListPromoProducts);
  const fetchCatalog = useServerFn(adminSearchCatalogForPromo);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const promotions = useQuery({ queryKey: ["admin", "promotions"], queryFn: () => fetchPromotions() });
  const promoProducts = useQuery({
    queryKey: ["admin", "promo-products"],
    queryFn: () => fetchPromoProducts(),
  });
  const catalog = useQuery({ queryKey: ["admin", "catalog-for-promo"], queryFn: () => fetchCatalog() });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<PromotionForm>(EMPTY_PROMOTION_FORM);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerTab, setPickerTab] = useState<"promo" | "catalog">("catalog");

  const upsertMutation = useMutation({
    mutationFn: (vars: PromotionForm) =>
      upsert({
        data: {
          id: vars.id,
          title: vars.title,
          subtitle: vars.subtitle,
          description: vars.description,
          imageUrl: vars.imageUrl || null,
          price: vars.price.trim() === "" ? null : Number(vars.price),
          active: vars.active,
          sortOrder: Number(vars.sortOrder) || 0,
          items: vars.items.map((it) => ({
            source: it.source,
            productId: it.productId,
            quantity: it.quantity,
          })),
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Promoción actualizada" : "Promoción creada");
      queryClient.invalidateQueries({ queryKey: ["admin", "promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promo-store"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo guardar la promoción"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Promoción eliminada");
      queryClient.invalidateQueries({ queryKey: ["admin", "promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promo-store"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo eliminar la promoción"),
  });

  const openCreate = () => {
    setForm(EMPTY_PROMOTION_FORM);
    setDialogOpen(true);
  };
  const openEdit = (p: Promotion) => {
    setForm({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle,
      description: p.description,
      imageUrl: p.image ?? "",
      price: p.price === null ? "" : String(p.price),
      active: p.active,
      sortOrder: String(p.sort_order),
      items: p.items.map((it) => ({
        source: it.source,
        productId: it.productId,
        name: it.name,
        price: it.price,
        unit: it.unit,
        quantity: it.quantity,
      })),
    });
    setDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6_000_000) {
      toast.error("La imagen no debe superar 6 MB");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await uploadImage({ data: { fileName: file.name, dataUrl } });
      setForm((f) => ({ ...f, imageUrl: res.url }));
      toast.success("Imagen subida");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addItem = (source: "promo" | "catalog", p: { id: string; name: string; price: number; unit: string }) => {
    setForm((f) => {
      const existing = f.items.find((it) => it.source === source && it.productId === p.id);
      if (existing) {
        return {
          ...f,
          items: f.items.map((it) =>
            it.source === source && it.productId === p.id ? { ...it, quantity: it.quantity + 1 } : it,
          ),
        };
      }
      return {
        ...f,
        items: [
          ...f.items,
          { source, productId: p.id, name: p.name, price: Number(p.price), unit: p.unit, quantity: 1 },
        ],
      };
    });
  };

  const changeQty = (source: "promo" | "catalog", productId: string, delta: number) => {
    setForm((f) => ({
      ...f,
      items: f.items
        .map((it) =>
          it.source === source && it.productId === productId
            ? { ...it, quantity: Math.max(1, it.quantity + delta) }
            : it,
        )
        .filter((it) => it.quantity > 0),
    }));
  };

  const removeItem = (source: "promo" | "catalog", productId: string) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((it) => !(it.source === source && it.productId === productId)),
    }));
  };

  const itemsTotal = form.items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const filteredPromoProducts = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const list = promoProducts.data ?? [];
    return q ? list.filter((p) => p.name.toLowerCase().includes(q)) : list;
  }, [promoProducts.data, pickerSearch]);

  const filteredCatalog = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const list = catalog.data ?? [];
    return q ? list.filter((p: any) => p.name.toLowerCase().includes(q)) : list;
  }, [catalog.data, pickerSearch]);

  const list = promotions.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Un paquete puede combinar productos de promoción y/o productos del catálogo principal
          (cortes, etc). El precio del paquete es editable; si lo dejas vacío, se usa la suma de
          sus productos.
        </p>
        <Button onClick={openCreate} className="font-cond uppercase tracking-wide">
          <Plus className="h-4 w-4" /> Nueva promoción
        </Button>
      </div>

      {promotions.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Promoción</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {p.image ? (
                          <img src={p.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Gift className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{p.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.subtitle}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.items.length === 0
                      ? "Sin productos"
                      : p.items.map((it) => `${it.quantity}× ${it.name}`).join(", ")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.price !== null ? `${p.price} ${CURRENCY}` : `${p.itemsTotal} ${CURRENCY} (suma)`}
                  </TableCell>
                  <TableCell>
                    {p.active ? (
                      <span className="font-cond rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        Activo
                      </span>
                    ) : (
                      <span className="font-cond rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Oculto
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    <Gift className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                    Todavía no hay promociones. Crea la primera.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar promoción" : "Nueva promoción"}</DialogTitle>
            <DialogDescription>
              Combina uno o más productos en un solo paquete. Solo visible en /promociones para
              socios.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              upsertMutation.mutate(form);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="pr-title">Título</Label>
              <Input
                id="pr-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Combo Parrillero Fundador"
                required
                maxLength={150}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pr-subtitle">Subtítulo</Label>
                <Input
                  id="pr-subtitle"
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  maxLength={150}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pr-price">
                  Precio del paquete (Bs) <span className="text-muted-foreground">— opcional</span>
                </Label>
                <Input
                  id="pr-price"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder={`Suma automática: ${itemsTotal} ${CURRENCY}`}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-description">Descripción</Label>
              <Textarea
                id="pr-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Imagen</Label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageOff className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Subir imagen
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Ítems del paquete */}
            <div className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4">
              <p className="font-cond text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Productos del paquete ({form.items.length})
              </p>

              {form.items.length > 0 && (
                <div className="space-y-1.5">
                  {form.items.map((it) => (
                    <div
                      key={`${it.source}-${it.productId}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-card px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{it.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {it.price} {CURRENCY} · {it.source === "promo" ? "Promo" : "Catálogo"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => changeQty(it.source, it.productId, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-5 text-center text-sm">{it.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => changeQty(it.source, it.productId, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeItem(it.source, it.productId)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <p className="text-right text-xs text-muted-foreground">
                    Suma de productos: {itemsTotal} {CURRENCY}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Buscar producto para agregar..."
                      className="h-8 pl-8 text-sm"
                    />
                  </div>
                </div>
                <Tabs value={pickerTab} onValueChange={(v) => setPickerTab(v as "promo" | "catalog")} className="mt-2">
                  <TabsList className="h-8">
                    <TabsTrigger value="catalog" className="text-xs">
                      Catálogo principal
                    </TabsTrigger>
                    <TabsTrigger value="promo" className="text-xs">
                      Productos de promoción
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="catalog" className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {catalog.isLoading ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin text-primary" />
                    ) : filteredCatalog.length === 0 ? (
                      <p className="py-2 text-center text-xs text-muted-foreground">Sin resultados</p>
                    ) : (
                      filteredCatalog.map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addItem("catalog", p)}
                          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-secondary"
                        >
                          <span className="truncate">{p.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {p.price} {CURRENCY}
                          </span>
                        </button>
                      ))
                    )}
                  </TabsContent>
                  <TabsContent value="promo" className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {promoProducts.isLoading ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin text-primary" />
                    ) : filteredPromoProducts.length === 0 ? (
                      <p className="py-2 text-center text-xs text-muted-foreground">Sin resultados</p>
                    ) : (
                      filteredPromoProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addItem("promo", p)}
                          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-secondary"
                        >
                          <span className="truncate">{p.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {p.price} {CURRENCY}
                          </span>
                        </button>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pr-sort">Orden</Label>
                <Input
                  id="pr-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                  id="pr-active"
                />
                <Label htmlFor="pr-active">Visible para socios</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={upsertMutation.isPending} className="font-cond uppercase tracking-wide">
                {upsertMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta promoción?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" se eliminará de /promociones. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
