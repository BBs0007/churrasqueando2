import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Loader2, Check, X, Save, Upload, QrCode } from "lucide-react";
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
import { CURRENCY } from "@/data/products";

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
  const queryClient = useQueryClient();
  const qrInputRef = useRef<HTMLInputElement>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [internationalInstructions, setInternationalInstructions] = useState("");

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

  useEffect(() => {
    if (paymentSettings.data) {
      setQrUrl(paymentSettings.data.boliviaQrUrl ?? "");
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
    mutationFn: async (file: File) => {
      const { path, token, publicUrl } = await createQrUploadUrl({
        data: { fileName: file.name, contentType: file.type },
      });
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.storage
        .from("membership-payments")
        .uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw error;
      return publicUrl;
    },
    onSuccess: (url) => {
      setQrUrl(url);
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

  const handleQrChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadQrMutation.mutate(file);
    event.target.value = "";
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
        Aprueba una solicitud para activar la membresía anual.
      </p>

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
                onChange={handleQrChange}
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
              <label
                htmlFor="international-payment-instructions"
                className="text-sm font-semibold text-foreground"
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
                  {Number(r.amount).toFixed(2)} {CURRENCY} · {r.plan} ·{" "}
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
