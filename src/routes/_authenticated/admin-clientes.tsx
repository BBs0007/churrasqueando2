import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, Pencil, Search, ShieldCheck, Star, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { getMyClub } from "@/lib/club.functions";
import {
  adminCreateCustomer,
  adminListCustomers,
  adminSetCustomerMembership,
  adminUpdateCustomer,
  type AdminCustomer,
} from "@/lib/customers.functions";
import { adminListMembershipPlans } from "@/lib/membership-plans.functions";
import type { MembershipPlan } from "@/lib/membership-plans.functions";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin-clientes")({
  head: () => ({
    meta: [
      { title: "Clientes · Admin · Churrasqueando" },
      { name: "description", content: "Listado de clientes y su estado de membresía del Club." },
    ],
  }),
  component: AdminClientes,
});

function AdminClientes() {
  const fetchClub = useServerFn(getMyClub);
  const fetchCustomers = useServerFn(adminListCustomers);
  const fetchPlans = useServerFn(adminListMembershipPlans);
  const createCustomer = useServerFn(adminCreateCustomer);
  const updateCustomer = useServerFn(adminUpdateCustomer);
  const setCustomerMembership = useServerFn(adminSetCustomerMembership);
  const queryClient = useQueryClient();

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const customers = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: () => fetchCustomers(),
    enabled: !!me.data?.isAdmin,
  });
  const plans = useQuery({
    queryKey: ["club", "admin-membership-plans"],
    queryFn: () => fetchPlans(),
    enabled: !!me.data?.isAdmin,
  });

  const [search, setSearch] = useState("");
  const [onlyMembers, setOnlyMembers] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<AdminCustomer | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    birthDate: "",
  });
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [planId, setPlanId] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentCountry, setPaymentCountry] = useState<"BO" | "INT">("BO");
  const [paymentReference, setPaymentReference] = useState("");

  const invalidateCustomers = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
  const createMutation = useMutation({
    mutationFn: () => createCustomer({ data: form }),
    onSuccess: async (result) => {
      setTemporaryPassword(result.temporaryPassword);
      toast.success("Cliente creado. La cuenta ya está confirmada.");
      await invalidateCustomers();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo crear el cliente"),
  });
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingCustomer) throw new Error("Selecciona un cliente");
      return updateCustomer({ data: { ...form, id: editingCustomer.id } });
    },
    onSuccess: async () => {
      toast.success("Datos del cliente actualizados");
      await invalidateCustomers();
      setDialogOpen(false);
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el cliente"),
  });
  const membershipMutation = useMutation({
    mutationFn: (active: boolean) => {
      if (!editingCustomer) throw new Error("Selecciona un cliente");
      return setCustomerMembership({
        data: {
          customerId: editingCustomer.id,
          active,
          planId: active ? planId : null,
          paymentConfirmed: active && paymentConfirmed,
          paymentMethod: paymentCountry === "BO" ? "bolivia_qr" : "binance",
          countryCode: paymentCountry,
          reference: paymentReference,
        },
      });
    },
    onSuccess: async (_result, active) => {
      toast.success(active ? "Membresía activada/renovada" : "Membresía desactivada");
      setPaymentConfirmed(false);
      setPaymentCountry("BO");
      setPaymentReference("");
      await Promise.all([
        invalidateCustomers(),
        queryClient.invalidateQueries({ queryKey: ["club"] }),
      ]);
      if (editingCustomer) {
        const updated = queryClient
          .getQueryData<{ customers: AdminCustomer[] }>(["admin", "customers"])
          ?.customers.find((customer) => customer.id === editingCustomer.id);
        if (updated) {
          setEditingCustomer({
            ...updated,
            membership_status: active ? "active" : "inactive",
            membership_plan_id: active ? planId : null,
            membership_plan_name: plans.data?.find((plan) => plan.id === planId)?.name ?? null,
          });
        }
      }
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar la membresía"),
  });

  const filtered = useMemo(() => {
    let list = customers.data?.customers ?? [];
    if (onlyMembers) list = list.filter((c) => c.is_member);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q),
      );
    }
    return list;
  }, [customers.data, search, onlyMembers]);

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

  const memberCount = (customers.data?.customers ?? []).filter((c) => c.is_member).length;
  const openCreateDialog = () => {
    setEditingCustomer(null);
    setForm({ fullName: "", email: "", phone: "", address: "", birthDate: "" });
    setTemporaryPassword("");
    setPlanId(plans.data?.find((plan) => plan.active)?.id ?? "");
    setPaymentConfirmed(false);
    setPaymentCountry("BO");
    setPaymentReference("");
    setDialogOpen(true);
  };
  const openEditDialog = (customer: AdminCustomer) => {
    setEditingCustomer(customer);
    setForm({
      fullName: customer.full_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      birthDate: customer.birth_date ?? "",
    });
    setPlanId(
      plans.data?.find((plan) => plan.id === customer.membership_plan_id && plan.active)?.id ??
        plans.data?.find((plan) => plan.active)?.id ??
        "",
    );
    setPaymentConfirmed(false);
    setPaymentCountry("BO");
    setPaymentReference("");
    setTemporaryPassword("");
    setDialogOpen(true);
  };
  const formatPrice = (plan: MembershipPlan) =>
    `${plan.price} ${plan.currency}${plan.interval === "annual" ? "/año" : plan.interval === "quarterly" ? "/trimestre" : "/mes"}`;

  return (
    <ClubShell points={me.data.profile.points} isMember={me.data.isMember} isAdmin>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {customers.data?.customers.length ?? 0} clientes registrados · {memberCount} con
            membresía activa
          </p>
        </div>
        <Button onClick={openCreateDialog} className="font-cond uppercase tracking-wide">
          <UserRoundPlus className="h-4 w-4" /> Crear cliente
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono"
            className="pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setOnlyMembers((v) => !v)}
          className={`font-cond inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
            onlyMembers
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Solo socios del club
        </button>
      </div>

      {customers.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Puntos</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Membresía</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">{c.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      Desde {new Date(c.created_at).toLocaleDateString("es-BO")}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <p>{c.email}</p>
                    <p>{c.phone || "—"}</p>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                    {c.address || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-primary" /> {c.points}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{c.orders_count}</TableCell>
                  <TableCell>
                    {c.is_member ? (
                      <div>
                        <span className="font-cond rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                          Socio activo
                        </span>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {c.membership_plan_name ?? "Plan"} · vence{" "}
                          {c.membership_expires_at
                            ? new Date(c.membership_expires_at).toLocaleDateString("es-BO")
                            : "sin fecha"}
                        </p>
                      </div>
                    ) : (
                      <span className="font-cond rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Sin membresía
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(c)}
                      className="font-cond uppercase tracking-wide"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No se encontraron clientes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setTemporaryPassword("");
            setPaymentConfirmed(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">
              {editingCustomer ? "Editar cliente" : "Crear cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? "Actualiza los datos de la cuenta del cliente."
                : "La cuenta se creará confirmada, sin enviar correo de verificación."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-full-name">Nombre completo</Label>
              <Input
                id="customer-full-name"
                autoComplete="name"
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-email">Correo</Label>
              <Input
                id="customer-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-phone">Teléfono</Label>
              <Input
                id="customer-phone"
                autoComplete="tel"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-birth-date">Fecha de nacimiento</Label>
              <Input
                id="customer-birth-date"
                type="date"
                value={form.birthDate}
                onChange={(event) => setForm({ ...form, birthDate: event.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="customer-address">Dirección</Label>
              <Input
                id="customer-address"
                autoComplete="street-address"
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </div>
          </div>

          {temporaryPassword && (
            <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/10 p-3">
              <p className="text-sm font-semibold text-foreground">
                Contraseña temporal (se muestra una sola vez)
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 break-all text-sm">{temporaryPassword}</code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(temporaryPassword).then(
                      () => toast.success("Contraseña copiada"),
                      () => toast.error("No se pudo copiar la contraseña"),
                    );
                  }}
                >
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Compártela de forma segura y recomienda al cliente cambiarla desde “Olvidé mi
                contraseña”.
              </p>
            </div>
          )}

          {editingCustomer && (
            <section className="space-y-3 rounded-xl border border-border bg-background/50 p-3">
              <div>
                <h3 className="font-display text-base uppercase text-foreground">Membresía Club</h3>
                <p className="text-xs text-muted-foreground">
                  Elige un plan para activar o renovar solo después de verificar el pago.
                </p>
              </div>
              {plans.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : plans.isError ? (
                <p role="alert" className="text-sm text-destructive">
                  No se pudieron cargar los planes.
                </p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-membership-plan">Plan</Label>
                    <select
                      id="customer-membership-plan"
                      value={planId}
                      onChange={(event) => {
                        const nextPlan = plans.data?.find((plan) => plan.id === event.target.value);
                        setPlanId(event.target.value);
                        setPaymentCountry(nextPlan?.currency === "USD" ? "INT" : "BO");
                      }}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Seleccionar plan</option>
                      {plans.data
                        ?.filter((plan) => plan.active)
                        .map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} · {formatPrice(plan)}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex items-start gap-2">
                    <Switch
                      id="customer-payment-confirmed"
                      checked={paymentConfirmed}
                      onCheckedChange={setPaymentConfirmed}
                    />
                    <Label htmlFor="customer-payment-confirmed" className="text-sm leading-5">
                      Confirmo que revisé y recibí el pago de este plan.
                    </Label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="customer-payment-country">País de pago</Label>
                      <select
                        id="customer-payment-country"
                        value={paymentCountry}
                        onChange={(event) => setPaymentCountry(event.target.value as "BO" | "INT")}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option
                          value="BO"
                          disabled={
                            plans.data?.find((plan) => plan.id === planId)?.currency === "USD"
                          }
                        >
                          Bolivia · QR
                        </option>
                        <option value="INT">Internacional</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="customer-payment-reference">Referencia (opcional)</Label>
                      <Input
                        id="customer-payment-reference"
                        maxLength={120}
                        value={paymentReference}
                        onChange={(event) => setPaymentReference(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={!planId || !paymentConfirmed || membershipMutation.isPending}
                      onClick={() => membershipMutation.mutate(true)}
                      className="font-cond uppercase tracking-wide"
                    >
                      {membershipMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Activar / renovar
                    </Button>
                    {editingCustomer.is_member && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={membershipMutation.isPending}
                        onClick={() => membershipMutation.mutate(false)}
                        className="font-cond uppercase tracking-wide"
                      >
                        Desactivar membresía
                      </Button>
                    )}
                  </div>
                </>
              )}
            </section>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cerrar
            </Button>
            {!temporaryPassword && (
              <Button
                type="button"
                disabled={createMutation.isPending || updateMutation.isPending}
                onClick={() =>
                  editingCustomer ? updateMutation.mutate() : createMutation.mutate()
                }
                className="font-cond uppercase tracking-wide"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {editingCustomer ? "Guardar datos" : "Crear cuenta"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClubShell>
  );
}
