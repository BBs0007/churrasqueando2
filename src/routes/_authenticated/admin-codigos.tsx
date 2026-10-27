import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import { getMyClub } from "@/lib/club.functions";
import { adminListProducts } from "@/lib/catalog.functions";
import {
  adminListDiscountCodes,
  adminUpsertDiscountCode,
  adminDeleteDiscountCode,
  adminListClubDiscountCampaigns,
  adminListClubDiscountRedemptions,
  adminUpsertClubDiscountCampaign,
  type ClubDiscountCampaign,
  type ClubDiscountRedemption,
  type DiscountCode,
} from "@/lib/discounts.functions";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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

export const Route = createFileRoute("/_authenticated/admin-codigos")({
  head: () => ({
    meta: [
      { title: "Códigos de descuento · Admin · Churrasqueando" },
      { name: "description", content: "Crea y administra códigos de descuento del catálogo." },
    ],
  }),
  component: AdminCodigos,
});

type FormState = {
  id?: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  value: string;
  scope: "all" | "products" | "categories";
  productIds: string[];
  categoryIds: string[];
  startsAt: string;
  endsAt: string;
  active: boolean;
};

type ClubCampaignFormState = {
  id?: string;
  title: string;
  description: string;
  discountType: "percentage" | "fixed";
  value: string;
  scope: "all" | "products" | "categories";
  productIds: string[];
  categoryIds: string[];
  startsAt: string;
  endsAt: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  code: "",
  description: "",
  discountType: "percentage",
  value: "",
  scope: "all",
  productIds: [],
  categoryIds: [],
  startsAt: "",
  endsAt: "",
  active: true,
};

const EMPTY_CLUB_CAMPAIGN: ClubCampaignFormState = {
  title: "",
  description: "",
  discountType: "percentage",
  value: "",
  scope: "all",
  productIds: [],
  categoryIds: [],
  startsAt: "",
  endsAt: "",
  active: true,
};

function statusOf(
  c: Pick<DiscountCode, "active" | "starts_at" | "ends_at">,
): "Activo" | "Programado" | "Vencido" | "Desactivado" {
  if (!c.active) return "Desactivado";
  const now = new Date();
  if (c.starts_at && new Date(c.starts_at) > now) return "Programado";
  if (c.ends_at && new Date(c.ends_at) < now) return "Vencido";
  return "Activo";
}

function AdminCodigos() {
  const fetchClub = useServerFn(getMyClub);
  const fetchCodes = useServerFn(adminListDiscountCodes);
  const fetchClubCampaigns = useServerFn(adminListClubDiscountCampaigns);
  const fetchClubRedemptions = useServerFn(adminListClubDiscountRedemptions);
  const fetchProducts = useServerFn(adminListProducts);
  const upsert = useServerFn(adminUpsertDiscountCode);
  const upsertClubCampaign = useServerFn(adminUpsertClubDiscountCampaign);
  const remove = useServerFn(adminDeleteDiscountCode);
  const queryClient = useQueryClient();

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const codes = useQuery({
    queryKey: ["admin", "discount-codes"],
    queryFn: () => fetchCodes(),
    enabled: !!me.data?.isAdmin,
  });
  const clubCampaigns = useQuery({
    queryKey: ["admin", "club-discount-campaigns"],
    queryFn: () => fetchClubCampaigns(),
    enabled: !!me.data?.isAdmin,
  });
  const clubRedemptions = useQuery({
    queryKey: ["admin", "club-discount-redemptions"],
    queryFn: () => fetchClubRedemptions(),
    enabled: !!me.data?.isAdmin,
  });
  const catalog = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => fetchProducts(),
    enabled: !!me.data?.isAdmin,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<DiscountCode | null>(null);
  const [clubCampaignDialogOpen, setClubCampaignDialogOpen] = useState(false);
  const [clubCampaignForm, setClubCampaignForm] =
    useState<ClubCampaignFormState>(EMPTY_CLUB_CAMPAIGN);

  const products = useMemo(() => catalog.data?.products ?? [], [catalog.data?.products]);
  const categories = useMemo(() => catalog.data?.categories ?? [], [catalog.data?.categories]);
  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const productName = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);

  const saveMutation = useMutation({
    mutationFn: (vars: FormState) =>
      upsert({
        data: {
          id: vars.id,
          code: vars.code,
          description: vars.description,
          discountType: vars.discountType,
          value: Number(vars.value.replace(",", ".")) || 0,
          scope: vars.scope,
          productIds: vars.productIds,
          categoryIds: vars.categoryIds,
          startsAt: vars.startsAt ? new Date(vars.startsAt).toISOString() : null,
          endsAt: vars.endsAt ? new Date(`${vars.endsAt}T23:59:59`).toISOString() : null,
          active: vars.active,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Código actualizado" : "Código creado");
      queryClient.invalidateQueries({ queryKey: ["admin", "discount-codes"] });
      setDialogOpen(false);
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el código"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Código eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin", "discount-codes"] });
      setDeleteTarget(null);
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el código"),
  });

  const saveClubCampaignMutation = useMutation({
    mutationFn: (vars: ClubCampaignFormState) =>
      upsertClubCampaign({
        data: {
          id: vars.id,
          title: vars.title,
          description: vars.description,
          discountType: vars.discountType,
          value: Number(vars.value.replace(",", ".")) || 0,
          scope: vars.scope,
          productIds: vars.productIds,
          categoryIds: vars.categoryIds,
          startsAt: vars.startsAt ? new Date(vars.startsAt).toISOString() : null,
          endsAt: vars.endsAt ? new Date(`${vars.endsAt}T23:59:59`).toISOString() : null,
          active: vars.active,
        },
      }),
    onSuccess: () => {
      toast.success(
        clubCampaignForm.id ? "Promoción del Club actualizada" : "Promoción y códigos creados",
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "club-discount-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "club-discount-redemptions"] });
      setClubCampaignDialogOpen(false);
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la promoción"),
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openClubCampaignCreate = () => {
    setClubCampaignForm(EMPTY_CLUB_CAMPAIGN);
    setClubCampaignDialogOpen(true);
  };

  const openClubCampaignEdit = (campaign: ClubDiscountCampaign) => {
    setClubCampaignForm({
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      discountType: campaign.discount_type,
      value: String(campaign.value),
      scope: campaign.scope,
      productIds: campaign.product_ids,
      categoryIds: campaign.category_ids,
      startsAt: campaign.starts_at ? campaign.starts_at.slice(0, 10) : "",
      endsAt: campaign.ends_at ? campaign.ends_at.slice(0, 10) : "",
      active: campaign.active,
    });
    setClubCampaignDialogOpen(true);
  };

  const openEdit = (c: DiscountCode) => {
    setForm({
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.discount_type,
      value: String(c.value),
      scope: c.scope,
      productIds: c.product_ids,
      categoryIds: c.category_ids,
      startsAt: c.starts_at ? c.starts_at.slice(0, 10) : "",
      endsAt: c.ends_at ? c.ends_at.slice(0, 10) : "",
      active: c.active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      toast.error("El código es obligatorio");
      return;
    }
    saveMutation.mutate(form);
  };

  const handleClubCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubCampaignForm.title.trim()) {
      toast.error("El título de la promoción es obligatorio");
      return;
    }
    saveClubCampaignMutation.mutate(clubCampaignForm);
  };

  const toggleProduct = (id: string) => {
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id)
        ? f.productIds.filter((x) => x !== id)
        : [...f.productIds, id],
    }));
  };

  const toggleCategory = (id: string) => {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((x) => x !== id)
        : [...f.categoryIds, id],
    }));
  };

  const toggleClubProduct = (id: string) => {
    setClubCampaignForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id)
        ? f.productIds.filter((x) => x !== id)
        : [...f.productIds, id],
    }));
  };

  const toggleClubCategory = (id: string) => {
    setClubCampaignForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((x) => x !== id)
        : [...f.categoryIds, id],
    }));
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

  const memberCampaignRows: ClubDiscountCampaign[] = clubCampaigns.data?.campaigns ?? [];
  const memberRedemptions: ClubDiscountRedemption[] = clubRedemptions.data?.redemptions ?? [];

  return (
    <ClubShell points={me.data.profile.points} isMember={me.data.isMember} isAdmin>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">
            Códigos de descuento
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea códigos con descuento por porcentaje o monto fijo, para todo el catálogo, para
            productos puntuales o por categoría.
          </p>
        </div>
        <Button onClick={openCreate} className="font-cond uppercase tracking-wide">
          <Plus className="h-4 w-4" /> Nuevo código
        </Button>
      </div>

      {codes.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descuento</TableHead>
                <TableHead>Alcance</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(codes.data?.codes ?? []).map((c) => {
                const status = statusOf(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-cond font-bold uppercase tracking-widest text-foreground">
                        <Tag className="h-3.5 w-3.5 text-primary" /> {c.code}
                      </div>
                      {c.description && (
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.discount_type === "percentage" ? `${c.value}%` : `${c.value} ${CURRENCY}`}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.scope === "all"
                        ? "Todo el catálogo"
                        : c.scope === "products"
                          ? `${c.product_ids.length} producto(s)`
                          : `${c.category_ids.length} categoría(s)`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.starts_at ? new Date(c.starts_at).toLocaleDateString("es-BO") : "—"}
                      {" – "}
                      {c.ends_at ? new Date(c.ends_at).toLocaleDateString("es-BO") : "Sin fin"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-cond rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                          status === "Activo"
                            ? "bg-primary/15 text-primary"
                            : status === "Programado"
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(c)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(codes.data?.codes ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Todavía no has creado ningún código.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl uppercase tracking-wide text-foreground">
              Promociones con código personal
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada socio activo recibe un código privado, distinto y de un solo uso.
            </p>
          </div>
          <Button onClick={openClubCampaignCreate} className="font-cond uppercase tracking-wide">
            <Plus className="h-4 w-4" /> Nueva promoción Club
          </Button>
        </div>

        {clubCampaigns.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : clubCampaigns.isError ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            No se pudieron cargar las promociones personales del Club.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promoción</TableHead>
                  <TableHead>Beneficio</TableHead>
                  <TableHead>Alcance</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Códigos</TableHead>
                  <TableHead>Canjes</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberCampaignRows.map((campaign) => {
                  const status = statusOf(campaign);
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">{campaign.title}</p>
                        {campaign.description && (
                          <p className="text-xs text-muted-foreground">{campaign.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {campaign.discount_type === "percentage"
                          ? `${campaign.value}%`
                          : `${campaign.value} ${CURRENCY}`}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {campaign.scope === "all"
                          ? "Todo el catálogo"
                          : campaign.scope === "products"
                            ? `${campaign.product_ids.length} producto(s)`
                            : `${campaign.category_ids.length} categoría(s)`}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {campaign.starts_at
                          ? new Date(campaign.starts_at).toLocaleDateString("es-BO")
                          : "—"}
                        {" – "}
                        {campaign.ends_at
                          ? new Date(campaign.ends_at).toLocaleDateString("es-BO")
                          : "Sin fin"}
                      </TableCell>
                      <TableCell>{campaign.code_count}</TableCell>
                      <TableCell>{campaign.redeemed_count}</TableCell>
                      <TableCell>
                        <span
                          className={`font-cond rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                            status === "Activo"
                              ? "bg-primary/15 text-primary"
                              : status === "Programado"
                                ? "bg-blue-500/15 text-blue-400"
                                : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Editar ${campaign.title}`}
                          onClick={() => openClubCampaignEdit(campaign)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {memberCampaignRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Todavía no hay promociones personales para socios.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl uppercase tracking-wide text-foreground">
          Historial de canjes del Club
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada fila identifica al socio, su código personal y el pedido asociado.
        </p>
        {clubRedemptions.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : clubRedemptions.isError ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            No se pudo cargar el historial de canjes.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Socio</TableHead>
                  <TableHead>Promoción</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Descuento aplicado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberRedemptions.map((redemption) => (
                  <TableRow key={redemption.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(redemption.redeemed_at).toLocaleString("es-BO")}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{redemption.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{redemption.customer_phone}</p>
                    </TableCell>
                    <TableCell>{redemption.campaign_title}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      {redemption.code}
                    </TableCell>
                    <TableCell>
                      {redemption.order_total === null
                        ? "Pedido no disponible"
                        : `${redemption.order_total.toFixed(2)} ${CURRENCY}`}
                    </TableCell>
                    <TableCell className="text-primary">
                      -{redemption.discount_amount.toFixed(2)} {CURRENCY}
                    </TableCell>
                  </TableRow>
                ))}
                {memberRedemptions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Aún no hay canjes registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar código" : "Nuevo código de descuento"}</DialogTitle>
            <DialogDescription>
              Define el código, el tipo de descuento y a qué aplica.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="VERANO20"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.discountType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, discountType: v as "percentage" | "fixed" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                    <SelectItem value="fixed">Monto fijo ({CURRENCY})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="value">
                Valor del descuento {form.discountType === "percentage" ? "(%)" : `(${CURRENCY})`}
              </Label>
              <Input
                id="value"
                inputMode="decimal"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">Descripción (opcional)</Label>
              <Input
                id="desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Aplica a</Label>
              <Select
                value={form.scope}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, scope: v as "all" | "products" | "categories" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el catálogo</SelectItem>
                  <SelectItem value="products">Productos específicos</SelectItem>
                  <SelectItem value="categories">Categorías específicas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.scope === "products" && (
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-border p-3">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.productIds.includes(p.id)}
                      onCheckedChange={() => toggleProduct(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            )}

            {form.scope === "categories" && (
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-border p-3">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.categoryIds.includes(c.id)}
                      onCheckedChange={() => toggleCategory(c.id)}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="starts">Fecha de inicio</Label>
                <Input
                  id="starts"
                  type="date"
                  value={form.startsAt}
                  onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ends">Fecha de fin</Label>
                <Input
                  id="ends"
                  type="date"
                  value={form.endsAt}
                  onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Código activo</p>
                <p className="text-xs text-muted-foreground">Desactívalo sin borrar el registro</p>
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
                disabled={saveMutation.isPending}
                className="font-cond uppercase tracking-wide"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={clubCampaignDialogOpen} onOpenChange={setClubCampaignDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {clubCampaignForm.id ? "Editar promoción del Club" : "Nueva promoción del Club"}
            </DialogTitle>
            <DialogDescription>
              Se asignará un código aleatorio y privado a cada socio activo. Cada código se puede
              canjear una sola vez por su titular.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleClubCampaignSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="club-campaign-title">Título de la promoción</Label>
              <Input
                id="club-campaign-title"
                value={clubCampaignForm.title}
                onChange={(e) => setClubCampaignForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Beneficio especial para socios"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={clubCampaignForm.discountType}
                  onValueChange={(v) =>
                    setClubCampaignForm((f) => ({
                      ...f,
                      discountType: v as "percentage" | "fixed",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                    <SelectItem value="fixed">Monto fijo ({CURRENCY})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="club-campaign-value">
                  Valor {clubCampaignForm.discountType === "percentage" ? "(%)" : `(${CURRENCY})`}
                </Label>
                <Input
                  id="club-campaign-value"
                  inputMode="decimal"
                  value={clubCampaignForm.value}
                  onChange={(e) => setClubCampaignForm((f) => ({ ...f, value: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="club-campaign-description">Descripción (opcional)</Label>
              <Input
                id="club-campaign-description"
                value={clubCampaignForm.description}
                onChange={(e) =>
                  setClubCampaignForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Aplica a</Label>
              <Select
                value={clubCampaignForm.scope}
                onValueChange={(v) =>
                  setClubCampaignForm((f) => ({
                    ...f,
                    scope: v as "all" | "products" | "categories",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el catálogo</SelectItem>
                  <SelectItem value="products">Productos específicos</SelectItem>
                  <SelectItem value="categories">Categorías específicas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {clubCampaignForm.scope === "products" && (
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-border p-3">
                {products.map((product) => (
                  <label key={product.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={clubCampaignForm.productIds.includes(product.id)}
                      onCheckedChange={() => toggleClubProduct(product.id)}
                    />
                    {product.name}
                  </label>
                ))}
              </div>
            )}

            {clubCampaignForm.scope === "categories" && (
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-border p-3">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={clubCampaignForm.categoryIds.includes(category.id)}
                      onCheckedChange={() => toggleClubCategory(category.id)}
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="club-campaign-starts">Fecha de inicio</Label>
                <Input
                  id="club-campaign-starts"
                  type="date"
                  value={clubCampaignForm.startsAt}
                  onChange={(e) => setClubCampaignForm((f) => ({ ...f, startsAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="club-campaign-ends">Fecha de fin</Label>
                <Input
                  id="club-campaign-ends"
                  type="date"
                  value={clubCampaignForm.endsAt}
                  onChange={(e) => setClubCampaignForm((f) => ({ ...f, endsAt: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Promoción activa</p>
                <p className="text-xs text-muted-foreground">
                  Puedes desactivarla sin eliminar los códigos ni su historial.
                </p>
              </div>
              <Switch
                checked={clubCampaignForm.active}
                onCheckedChange={(active) => setClubCampaignForm((f) => ({ ...f, active }))}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setClubCampaignDialogOpen(false)}
                className="font-cond uppercase tracking-wide"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saveClubCampaignMutation.isPending}
                className="font-cond uppercase tracking-wide"
              >
                {saveClubCampaignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {clubCampaignForm.id ? "Guardar cambios" : "Crear promoción y códigos"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el código "{deleteTarget?.code}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
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
    </ClubShell>
  );
}
