import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Loader2, Check, X, Save, Upload, QrCode, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminCreateMembershipQrUploadUrl,
  adminListRequests,
  adminReviewRequest,
  adminSaveMembershipPaymentSettings,
  getMembershipPaymentSettings,
  getMyClub,
} from "@/lib/club.functions";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  adminDeleteMembershipPlan,
  adminListMembershipPlans,
  adminSaveMembershipPlan,
  type MembershipPlan,
} from "@/lib/membership-plans.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import internationalQrDefault from "@/assets/club/international-payment-qr.jpeg";

export const Route = createFileRoute("/_authenticated/admin-club")({
  head: () => ({
    meta: [
      { title: "Solicitudes del Club · Churrasqueando" },
      {
        name: "description",
        content: "Panel interno para aprobar pagos y activar membresías del Club Churrasqueando.",
      },
      { property: "og:title", content: "Solicitudes del Club · Churrasqueando" },
      { property: "og:description", content: "Aprobación manual de membresías del Club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminClub,
});

function AdminClub() {
  const fetchClub = useServerFn(getMyClub);
  const fetchRequests = useServerFn(adminListRequests);
  const review = useServerFn(adminReviewRequest);
  const fetchPaymentSettings = useServerFn(getMembershipPaymentSettings);
  const createQrUploadUrl = useServerFn(adminCreateMembershipQrUploadUrl);
  const savePaymentSettings = useServerFn(adminSaveMembershipPaymentSettings);
  const fetchPlans = useServerFn(adminListMembershipPlans);
  const savePlan = useServerFn(adminSaveMembershipPlan);
  const deletePlan = useServerFn(adminDeleteMembershipPlan);
  const queryClient = useQueryClient();
  const qrInputRef = useRef<HTMLInputElement>(null);
  const internationalQrInputRef = useRef<HTMLInputElement>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [internationalQrUrl, setInternationalQrUrl] = useState("");
  const [internationalInstructions, setInternationalInstructions] = useState("");
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    interval: "annual" as MembershipPlan["interval"],
    durationDays: "365",
    price: "",
    currency: "Bs" as MembershipPlan["currency"],
    active: true,
    sortOrder: "0",
  });

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const requests = useQuery({
    queryKey: ["club", "admin-requests"],
    queryFn: () => fetchRequests(),
    enabled: !!me.data?.isAdmin,
  });
  const paymentSettings = useQuery({
    queryKey: ["club", "payment-settings"],
    queryFn: () => fetchPaymentSettings(),
    enabled: !!me.data?.isAdmin,
  });
  const plans = useQuery({
    queryKey: ["club", "admin-membership-plans"],
    queryFn: () => fetchPlans(),
    enabled: !!me.data?.isAdmin,
  });

  const savePlanMutation = useMutation({
    mutationFn: () =>
      savePlan({
        data: {
          id: editingPlan?.id,
          name: planForm.name,
          interval: planForm.interval,
          durationDays: Number(planForm.durationDays),
          price: Number(planForm.price),
          currency: planForm.currency,
          active: planForm.active,
          sortOrder: Number(planForm.sortOrder),
        },
      }),
    onSuccess: async () => {
      toast.success(editingPlan ? "Plan actualizado" : "Plan creado");
      setPlanDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["club", "admin-membership-plans"] });
      await queryClient.invalidateQueries({ queryKey: ["club", "membership-plans"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el plan"),
  });
  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => deletePlan({ data: { id } }),
    onSuccess: async () => {
      toast.success("Plan eliminado");
      await queryClient.invalidateQueries({ queryKey: ["club", "admin-membership-plans"] });
      await queryClient.invalidateQueries({ queryKey: ["club", "membership-plans"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el plan"),
  });

  useEffect(() => {
    if (paymentSettings.data) {
      setQrUrl(paymentSettings.data.boliviaQrUrl ?? "");
      setInternationalQrUrl(paymentSettings.data.internationalQrUrl ?? "");
      setInternationalInstructions(paymentSettings.data.internationalInstructions);
    }
  }, [paymentSettings.data]);

  const mutation = useMutation({
    mutationFn: (vars: { id: string; approve: boolean }) => review({ data: vars }),
    onSuccess: () => {
      toast.success("Solicitud actualizada");
      queryClient.invalidateQueries({ queryKey: ["club"] });
    },
    onError: () => toast.error("No se pudo actualizar la solicitud"),
  });

  const uploadQrMutation = useMutation({
    mutationFn: async (input: { file: File; country: "bolivia" | "international" }) => {
      const { file } = input;
      const { path, token, publicUrl } = await createQrUploadUrl({
        data: { fileName: file.name, contentType: file.type },
      });
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.storage
        .from("membership-payments")
        .uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw error;
      return { publicUrl, country: input.country };
    },
    onSuccess: ({ publicUrl, country }) => {
      if (country === "bolivia") setQrUrl(publicUrl);
      else setInternationalQrUrl(publicUrl);
      toast.success("QR subido. Guarda la configuración para publicarlo.");
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo subir el QR"),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      savePaymentSettings({
        data: {
          boliviaQrUrl: qrUrl.trim() || null,
          internationalQrUrl: internationalQrUrl.trim() || null,
          internationalInstructions,
        },
      }),
    onSuccess: async () => {
      toast.success("Configuración de pagos guardada");
      await queryClient.invalidateQueries({ queryKey: ["club", "payment-settings"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la configuración"),
  });

  const handleQrChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    country: "bolivia" | "international",
  ) => {
    const file = event.target.files?.[0];
    if (file) uploadQrMutation.mutate({ file, country });
    event.target.value = "";
  };

  const openNewPlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: "",
      interval: "annual",
      durationDays: "365",
      price: "",
      currency: "Bs",
      active: true,
      sortOrder: String(plans.data?.length ?? 0),
    });
    setPlanDialogOpen(true);
  };
  const openEditPlan = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      interval: plan.interval,
      durationDays: String(plan.duration_days),
      price: String(plan.price),
      currency: plan.currency,
      active: plan.active,
      sortOrder: String(plan.sort_order),
    });
    setPlanDialogOpen(true);
  };
  const planPeriod = (plan: MembershipPlan) =>
    plan.interval === "annual" ? "Anual" : plan.interval === "quarterly" ? "Trimestral" : "Mensual";

  if (me.isLoading) {
    return (
      <ClubShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </ClubShell>
    );
  }

  if (me.isError) {
    return (
      <ClubShell>
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo validar el acceso al panel. Recarga la página o vuelve a iniciar sesión.
        </p>
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
      <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">
        Solicitudes de membresía
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Administra planes y verifica los pagos antes de activar una membresía.
      </p>

      <section className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide text-foreground">
              Planes de suscripción
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea y edita planes mensuales, trimestrales o anuales. Los planes en uso pueden
              desactivarse, pero no eliminarse.
            </p>
          </div>
          <Button type="button" onClick={openNewPlan} className="font-cond uppercase tracking-wide">
            <Plus className="h-4 w-4" /> Nuevo plan
          </Button>
        </div>
        {plans.isLoading ? (
          <Loader2 className="mt-5 h-5 w-5 animate-spin text-primary" />
        ) : plans.isError ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            No se pudieron cargar los planes.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.data?.map((plan) => (
              <article key={plan.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {planPeriod(plan)} · {plan.duration_days} días
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      plan.active
                        ? "bg-primary/15 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {plan.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="font-display mt-3 text-2xl text-primary">
                  {Number(plan.price).toLocaleString("es-BO")} {plan.currency}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEditPlan(plan)}
                    className="font-cond uppercase tracking-wide"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Eliminar plan ${plan.name}`}
                    disabled={deletePlanMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`¿Eliminar el plan "${plan.name}"?`)) {
                        deletePlanMutation.mutate(plan.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </article>
            ))}
            {!plans.data?.length && (
              <p className="text-sm text-muted-foreground">No hay planes creados.</p>
            )}
          </div>
        )}
      </section>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">
              {editingPlan ? "Editar plan" : "Crear plan"}
            </DialogTitle>
            <DialogDescription>
              Define nombre, periodo, duración y precio que verá el cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="plan-name">Nombre</Label>
              <Input
                id="plan-name"
                value={planForm.name}
                maxLength={80}
                onChange={(event) => setPlanForm({ ...planForm, name: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-interval">Periodo</Label>
              <select
                id="plan-interval"
                value={planForm.interval}
                onChange={(event) =>
                  setPlanForm({
                    ...planForm,
                    interval: event.target.value as MembershipPlan["interval"],
                  })
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="annual">Anual</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-duration">Duración (días)</Label>
              <Input
                id="plan-duration"
                type="number"
                min="1"
                max="3660"
                value={planForm.durationDays}
                onChange={(event) => setPlanForm({ ...planForm, durationDays: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-price">Precio</Label>
              <Input
                id="plan-price"
                type="number"
                min="0.01"
                step="0.01"
                value={planForm.price}
                onChange={(event) => setPlanForm({ ...planForm, price: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-currency">Moneda</Label>
              <select
                id="plan-currency"
                value={planForm.currency}
                onChange={(event) =>
                  setPlanForm({
                    ...planForm,
                    currency: event.target.value as MembershipPlan["currency"],
                  })
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="Bs">Bolivianos (Bs)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-order">Orden</Label>
              <Input
                id="plan-order"
                type="number"
                value={planForm.sortOrder}
                onChange={(event) => setPlanForm({ ...planForm, sortOrder: event.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={planForm.active}
                onChange={(event) => setPlanForm({ ...planForm, active: event.target.checked })}
                className="accent-primary"
              />
              Visible para clientes
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPlanDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={savePlanMutation.isPending}
              onClick={() => savePlanMutation.mutate()}
              className="font-cond uppercase tracking-wide"
            >
              {savePlanMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl uppercase tracking-wide text-foreground">
            Métodos de pago
          </h2>
        </div>
        {paymentSettings.isLoading ? (
          <Loader2 className="mt-5 h-5 w-5 animate-spin text-primary" />
        ) : paymentSettings.isError ? (
          <p className="mt-4 text-sm text-destructive">
            No se pudo cargar la configuración de pagos.
          </p>
        ) : (
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-foreground">QR de Bolivia</p>
              {qrUrl && (
                <img
                  src={qrUrl}
                  alt="QR actual para pagos de membresía"
                  className="mt-3 max-h-64 w-full rounded-xl bg-white object-contain p-2"
                />
              )}
              <p className="mt-2 break-all text-xs text-muted-foreground">
                {qrUrl ? "QR configurado" : "Se muestra el QR incluido en la aplicación."}
              </p>
              <input
                ref={qrInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => handleQrChange(event, "bolivia")}
              />
              <Button
                type="button"
                variant="outline"
                className="mt-3 font-cond uppercase tracking-wide"
                disabled={uploadQrMutation.isPending}
                onClick={() => qrInputRef.current?.click()}
              >
                {uploadQrMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Reemplazar QR
              </Button>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">QR internacional</p>
              <img
                src={internationalQrUrl || internationalQrDefault}
                alt="QR actual para pagos internacionales"
                className="mt-3 max-h-64 w-full rounded-xl bg-white object-contain p-2"
              />
              <p className="mt-2 break-all text-xs text-muted-foreground">
                {internationalQrUrl
                  ? "QR configurado"
                  : "Se muestra el QR incluido en la aplicación."}
              </p>
              <input
                ref={internationalQrInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => handleQrChange(event, "international")}
              />
              <Button
                type="button"
                variant="outline"
                className="mt-3 font-cond uppercase tracking-wide"
                disabled={uploadQrMutation.isPending}
                onClick={() => internationalQrInputRef.current?.click()}
              >
                {uploadQrMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Reemplazar QR internacional
              </Button>
              <label
                htmlFor="international-payment-instructions"
                className="mt-5 block text-sm font-semibold text-foreground"
              >
                Instrucciones internacionales
              </label>
              <Textarea
                id="international-payment-instructions"
                value={internationalInstructions}
                onChange={(event) => setInternationalInstructions(event.target.value)}
                maxLength={1200}
                placeholder="Añade aquí las instrucciones verificadas de Binance u otro método."
                className="mt-2 min-h-36"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                No publiques direcciones ni redes hasta verificarlas.
              </p>
            </div>
          </div>
        )}
        {!paymentSettings.isError && (
          <Button
            type="button"
            disabled={
              paymentSettings.isLoading ||
              uploadQrMutation.isPending ||
              saveSettingsMutation.isPending
            }
            onClick={() => saveSettingsMutation.mutate()}
            className="mt-5 font-cond uppercase tracking-wide"
          >
            {saveSettingsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar configuración de pagos
          </Button>
        )}
      </section>

      {requests.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : requests.isError ? (
        <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudieron cargar las solicitudes de membresía.
        </p>
      ) : (requests.data ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No hay solicitudes por ahora.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {(requests.data ?? []).map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-cond text-sm font-semibold uppercase tracking-wide text-foreground">
                  {r.profile?.full_name || r.profile?.email || r.user_id}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.profile?.email} · {r.profile?.phone || "sin teléfono"} ·{" "}
                  {new Date(r.created_at).toLocaleString("es-BO")}
                </p>
                <p className="text-xs text-primary">
                  {Number(r.amount).toFixed(2)} {r.currency} · {r.plan} ·{" "}
                  {r.payment_method === "bolivia_qr" ? "QR Bolivia" : "Internacional"} ·{" "}
                  {r.country_code === "BO" ? "Bolivia" : "Otro país"} · {r.status}
                </p>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ id: r.id, approve: true })}
                    className="font-cond uppercase tracking-wide"
                  >
                    <Check className="h-3.5 w-3.5" /> Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ id: r.id, approve: false })}
                    className="font-cond uppercase tracking-wide"
                  >
                    <X className="h-3.5 w-3.5" /> Rechazar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </ClubShell>
  );
}
