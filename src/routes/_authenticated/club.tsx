import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, Unlock, MessageCircle, CheckCircle2, Clock, CreditCard, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getMyClub, requestMembership, startMembershipOnlinePayment } from "@/lib/club.functions";
import { CLUB, CLUB_BENEFITS } from "@/lib/club";
import { BUSINESS } from "@/data/business";
import { CURRENCY } from "@/data/products";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/club")({
  head: () => ({
    meta: [
      { title: "Beneficios del Club Churrasqueando" },
      {
        name: "description",
        content:
          "Descuentos, cursos de parrilla, canje de puntos y acceso prioritario para socios del Club Churrasqueando.",
      },
      { property: "og:title", content: "Beneficios del Club Churrasqueando" },
      {
        property: "og:description",
        content: "Activa tu membresía y desbloquea descuentos, cursos y canje de puntos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClubPage,
});

function ClubPage() {
  const fetchClub = useServerFn(getMyClub);
  const askMembership = useServerFn(requestMembership);
  const payOnline = useServerFn(startMembershipOnlinePayment);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });

  const mutation = useMutation({
    mutationFn: () => askMembership({ data: {} }),
    onSuccess: (res) => {
      toast.success(
        res.alreadyPending
          ? "Ya tienes una solicitud en revisión"
          : "Solicitud enviada. Activaremos tu membresía al confirmar el pago.",
      );
      queryClient.invalidateQueries({ queryKey: ["club", "me"] });
    },
    onError: () => toast.error("No se pudo registrar la solicitud"),
  });

  const onlineMutation = useMutation({
    mutationFn: () => payOnline({ data: { returnUrl: `${window.location.origin}/club` } }),
    onSuccess: (res) => {
      if (res.ok) {
        window.location.href = res.redirectUrl;
      } else {
        toast.error(res.error);
      }
    },
    onError: () => toast.error("No se pudo iniciar el pago en línea"),
  });

  if (isLoading || !data) {
    return (
      <ClubShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </ClubShell>
    );
  }

  const { profile, isMember, isAdmin, requests } = data;
  const pending = requests.find((r) => r.status === "pending");

  const waMessage = encodeURIComponent(
    `¡Hola Churrasqueando! Quiero activar mi membresía del ${CLUB.name} (${CLUB.planLabel}, ${CLUB.monthlyPriceBs} ${CURRENCY}).\nMi cuenta: ${profile.email}\nEnvíenme el QR de pago, por favor.`,
  );
  const waUrl = `https://wa.me/${BUSINESS.whatsapp}?text=${waMessage}`;

  const waCancelMessage = encodeURIComponent(
    `¡Hola Churrasqueando! Quiero cancelar/dar de baja mi membresía del ${CLUB.name}.\nMi cuenta: ${profile.email}`,
  );
  const waCancelUrl = `https://wa.me/${BUSINESS.whatsapp}?text=${waCancelMessage}`;

  return (
    <ClubShell points={profile.points} isMember={isMember} isAdmin={isAdmin}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
            Beneficios del Club
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Membresía {CLUB.planLabel.toLowerCase()} por {CLUB.monthlyPriceBs} {CURRENCY}. Los puntos
            los acumulas siempre; el canje y los beneficios son solo para socios activos.
          </p>
        </div>
        <span
          className={`font-cond inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
            isMember ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          }`}
        >
          {isMember ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {isMember ? "Membresía activa" : "Membresía inactiva"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {CLUB_BENEFITS.map((b) => (
          <div
            key={b.id}
            className={`relative overflow-hidden rounded-2xl border border-border bg-card p-5 ${
              isMember ? "" : "opacity-95"
            }`}
          >
            <h2 className="font-display text-xl uppercase tracking-wide text-foreground">
              {b.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{b.description}</p>
            {!isMember && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5 text-primary" /> Bloqueado hasta activar tu membresía
              </div>
            )}
          </div>
        ))}
      </div>

      {!isMember && (
        <section className="mt-8 rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8">
          <h2 className="font-display text-2xl uppercase tracking-wide text-foreground">
            Activar mi membresía
          </h2>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>
              <span className="font-semibold text-foreground">1.</span> Escríbenos por WhatsApp y te
              enviamos el QR de pago de {CLUB.monthlyPriceBs} {CURRENCY}.
            </li>
            <li>
              <span className="font-semibold text-foreground">2.</span> Realiza el pago y envía el
              comprobante por el mismo chat.
            </li>
            <li>
              <span className="font-semibold text-foreground">3.</span> Marca abajo “Ya realicé el
              pago” y nuestro equipo activa tu membresía al confirmarlo.
            </li>
          </ol>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              disabled={onlineMutation.isPending || !!pending}
              onClick={() => onlineMutation.mutate()}
              className="font-cond uppercase tracking-wide"
            >
              {onlineMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Pagar en línea
            </Button>
            <a href={waUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" className="font-cond uppercase tracking-wide">
                <MessageCircle className="h-4 w-4" /> Pedir QR por WhatsApp
              </Button>
            </a>
            {!pending && (
              <Button
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                className="font-cond uppercase tracking-wide"
              >
                <CheckCircle2 className="h-4 w-4" />
                Ya pagué por WhatsApp
              </Button>
            )}
            {pending && (
              <Button variant="outline" disabled className="font-cond uppercase tracking-wide">
                <Clock className="h-4 w-4" /> Solicitud en revisión
              </Button>
            )}
          </div>

          {pending && (
            <p className="mt-3 text-xs text-muted-foreground">
              Solicitud enviada el {new Date(pending.created_at).toLocaleDateString("es-BO")}. La
              activación es manual y la confirma el equipo de Churrasqueando.
            </p>
          )}
        </section>
      )}

      {isMember && (
        <section className="mt-8 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            ¿Quieres dar de baja tu membresía? Escríbenos por WhatsApp y la cancelamos por ti.
          </p>
          <a href={waCancelUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block">
            <Button variant="outline" className="font-cond uppercase tracking-wide">
              <XCircle className="h-4 w-4" /> Cancelar membresía por WhatsApp
            </Button>
          </a>
        </section>
      )}
    </ClubShell>
  );
}
