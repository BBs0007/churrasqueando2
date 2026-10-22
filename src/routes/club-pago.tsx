import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Flame, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { getMyClub, getMembershipPaymentSettings, requestMembership } from "@/lib/club.functions";
import { useSession } from "@/hooks/useSession";
import { getActiveMembershipPlans, type MembershipPlan } from "@/lib/membership-plans.functions";
import { CLUB_WHATSAPP } from "@/lib/club";
import qrDefault from "@/assets/club/membership-qr.jpeg";

export const Route = createFileRoute("/club-pago")({
  head: () => ({
    meta: [
      { title: "Pago de membresía · Club Churrasqueando" },
      {
        name: "description",
        content: "Elige tu plan y cómo pagar tu membresía del Club Churrasqueando.",
      },
    ],
  }),
  component: ClubPaymentPage,
});

type CountryCode = "BO" | "INT";

function detectCountryFromBrowser(): CountryCode {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const locales = navigator.languages?.length ? navigator.languages : [navigator.language];
  const hasBoliviaLocale = locales.some((locale) => /-BO(?:-|$)/i.test(locale));
  return hasBoliviaLocale || timezone === "America/La_Paz" ? "BO" : "INT";
}

function planPeriod(plan: MembershipPlan) {
  return plan.interval === "annual" ? "año" : plan.interval === "quarterly" ? "trimestre" : "mes";
}

function formatPrice(price: number, currency: string) {
  return `${Number(price).toLocaleString("es-BO")} ${currency}`;
}

function ClubPaymentPage() {
  const queryClient = useQueryClient();
  const { session, loading: sessionLoading } = useSession();
  const fetchClub = useServerFn(getMyClub);
  const fetchSettings = useServerFn(getMembershipPaymentSettings);
  const fetchPlans = useServerFn(getActiveMembershipPlans);
  const createRequest = useServerFn(requestMembership);
  const [countryCode, setCountryCode] = useState<CountryCode>("BO");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [changePlan, setChangePlan] = useState(false);

  const club = useQuery({
    queryKey: ["club", "me"],
    queryFn: () => fetchClub(),
    enabled: !!session,
  });
  const settings = useQuery({
    queryKey: ["club", "payment-settings"],
    queryFn: () => fetchSettings(),
  });
  const plans = useQuery({
    queryKey: ["club", "membership-plans"],
    queryFn: () => fetchPlans(),
  });

  useEffect(() => {
    setCountryCode(detectCountryFromBrowser());
  }, []);
  useEffect(() => {
    if (!selectedPlanId && plans.data?.length) {
      const annual = plans.data.find((plan) => plan.interval === "annual");
      setSelectedPlanId(annual?.id ?? plans.data[0].id);
    }
  }, [plans.data, selectedPlanId]);

  const pendingRequest = useMemo(
    () => club.data?.requests.find((request) => request.status === "pending") ?? null,
    [club.data?.requests],
  );
  const isMember = !!club.data?.isMember || !!club.data?.isAdmin;
  const selectedPlan = plans.data?.find((plan) => plan.id === selectedPlanId) ?? null;
  useEffect(() => {
    if (selectedPlan?.currency === "USD") setCountryCode("INT");
  }, [selectedPlan?.currency]);
  const currentPlan = plans.data?.find((plan) => plan.id === club.data?.profile.membership_plan_id);
  const paymentMethod = countryCode === "BO" ? "bolivia_qr" : "binance";

  const makeWhatsappHref = useCallback(
    (request: {
      id: string;
      plan: string;
      amount: number;
      currency: string;
      payment_method: string;
      country_code: string;
    }) => {
      const message = [
        "Hola, quiero pagar/renovar mi suscripción del Club Churrasqueando.",
        `Solicitud: ${request.id}`,
        `Cuenta: ${club.data?.profile.email ?? session?.user.email ?? "sin correo"}`,
        `Plan: ${request.plan}`,
        `Método: ${request.payment_method === "bolivia_qr" ? "QR Bolivia" : "Pago internacional"}`,
        `País: ${request.country_code === "BO" ? "Bolivia" : "Internacional"}`,
        `Monto: ${formatPrice(request.amount, request.currency)}`,
        "Adjunto mi comprobante para verificación.",
      ].join("\n");
      return `https://wa.me/${CLUB_WHATSAPP}?text=${encodeURIComponent(message)}`;
    },
    [club.data?.profile.email, session?.user.email],
  );

  const requestMutation = useMutation({
    mutationFn: () => {
      if (!selectedPlan) throw new Error("Selecciona un plan activo");
      return createRequest({
        data: {
          planId: selectedPlan.id,
          paymentMethod,
          countryCode,
        },
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["club", "me"] });
      if (!result.alreadyPending) {
        toast.success("Solicitud registrada. Envía el comprobante para verificar tu pago.");
      }
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la solicitud"),
  });

  const points = club.data?.profile.points;
  const requestWhatsappHref = pendingRequest
    ? makeWhatsappHref({
        id: pendingRequest.id,
        plan: pendingRequest.plan,
        amount: pendingRequest.amount,
        currency: pendingRequest.currency,
        payment_method: pendingRequest.payment_method,
        country_code: pendingRequest.country_code,
      })
    : requestMutation.data?.request
      ? makeWhatsappHref({
          id: requestMutation.data.request.id,
          plan: requestMutation.data.request.plan,
          amount: requestMutation.data.request.amount,
          currency: requestMutation.data.request.currency,
          payment_method: requestMutation.data.request.payment_method,
          country_code: requestMutation.data.request.country_code,
        })
      : null;

  if (sessionLoading || (session && club.isLoading)) {
    return (
      <ClubShell points={points}>
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </ClubShell>
    );
  }

  if (session && club.isError) {
    return (
      <ClubShell>
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo cargar tu cuenta. Recarga la página o vuelve a iniciar sesión.
        </p>
      </ClubShell>
    );
  }

  return (
    <ClubShell points={points} isMember={club.data?.isMember} isAdmin={club.data?.isAdmin}>
      <main className="mx-auto max-w-3xl pb-10">
        <Link
          to="/club"
          className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al Club
        </Link>

        <header className="rounded-3xl bg-[radial-gradient(ellipse_at_top,rgba(231,96,10,0.2),transparent_68%)] px-2 py-8 text-center sm:py-11">
          <p className="font-cond text-xs font-bold uppercase tracking-[0.28em] text-primary sm:text-sm sm:tracking-[0.4em]">
            Club Churrasqueando
          </p>
          <h1 className="font-display mt-3 text-3xl uppercase leading-tight text-foreground sm:text-5xl">
            {isMember && !changePlan ? (
              <>
                Tu suscripción <span className="text-primary">está activa</span>
              </>
            ) : (
              <>
                Elige tu <span className="text-primary">suscripción</span>
              </>
            )}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            {isMember && !changePlan
              ? "Puedes revisar tus beneficios o elegir otro plan cuando decidas cambiar o renovar."
              : "Selecciona el plan que prefieras, realiza el pago y envíanos el comprobante por WhatsApp. El acceso se activa después de verificar el pago."}
          </p>
        </header>

        {isMember && !changePlan ? (
          <section className="rounded-2xl border border-primary/40 bg-primary/10 p-5 text-center sm:p-7">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h2 className="font-display mt-3 text-2xl uppercase text-foreground">
              {currentPlan?.name ?? "Membresía activa"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {club.data?.profile.membership_expires_at
                ? `Vence el ${new Date(club.data.profile.membership_expires_at).toLocaleDateString("es-BO")}`
                : "Tu acceso está habilitado."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button asChild className="font-cond uppercase tracking-wide">
                <Link to="/cursos">Ir a mis cursos</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setChangePlan(true)}
                className="font-cond uppercase tracking-wide"
              >
                Cambiar / renovar plan
              </Button>
            </div>
          </section>
        ) : pendingRequest ? (
          <section className="rounded-2xl border border-primary/40 bg-card p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-display text-xl uppercase text-foreground">
                  Pago pendiente de verificación
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Plan: {pendingRequest.plan} ·{" "}
                  {formatPrice(pendingRequest.amount, pendingRequest.currency)}. El acceso se activa
                  cuando el equipo confirme el pago.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Solicitud {pendingRequest.id}. Para cambiar el plan, espera a que revisemos esta
                  solicitud.
                </p>
              </div>
            </div>
            {requestWhatsappHref && (
              <Button asChild className="mt-5 w-full font-cond uppercase tracking-wide">
                <a href={requestWhatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> Enviar comprobante por WhatsApp
                </a>
              </Button>
            )}
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-primary bg-gradient-to-br from-primary/15 to-card p-4 text-center sm:p-6">
              <p className="font-cond text-xs font-bold uppercase tracking-[0.22em] text-primary">
                Planes disponibles
              </p>
              {plans.isLoading ? (
                <Loader2 className="mx-auto mt-3 h-6 w-6 animate-spin text-primary" />
              ) : plans.isError ? (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  No se pudieron cargar los planes. Intenta nuevamente más tarde.
                </p>
              ) : plans.data?.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {plans.data.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      aria-pressed={selectedPlanId === plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        selectedPlanId === plan.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background/50 hover:border-primary/50"
                      }`}
                    >
                      <span className="font-cond text-xs font-bold uppercase tracking-[0.18em] text-primary">
                        {plan.interval === "annual"
                          ? "Plan anual"
                          : plan.interval === "quarterly"
                            ? "Plan trimestral"
                            : "Plan mensual"}
                      </span>
                      <span className="mt-1 block text-lg font-bold text-foreground">
                        {plan.name}
                      </span>
                      <span className="font-display mt-2 block text-2xl text-foreground">
                        {formatPrice(plan.price, plan.currency)}
                        <span className="font-sans text-xs text-muted-foreground">
                          {" "}
                          / {planPeriod(plan)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No hay planes disponibles en este momento.
                </p>
              )}
            </section>

            <section aria-label="Pasos para activar" className="mt-4 grid grid-cols-3 gap-2">
              {["Elige y paga", "Guarda el comprobante", "Envíalo por WhatsApp"].map(
                (step, index) => (
                  <div
                    key={step}
                    className="rounded-xl border border-border bg-card px-2 py-3 text-center sm:px-4"
                  >
                    <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <p className="mt-2 text-[11px] leading-tight text-foreground sm:text-sm">
                      {step}
                    </p>
                  </div>
                ),
              )}
            </section>

            <section className="mt-7">
              <h2 className="font-cond mb-3 text-center text-sm font-bold uppercase tracking-[0.2em] text-primary">
                ¿Desde dónde vas a pagar?
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["BO", "🇧🇴", "Bolivia", "QR · transferencia"],
                    ["INT", "🌎", "Internacional", "Instrucciones de pago"],
                  ] as const
                ).map(([code, icon, label, description]) => (
                  <button
                    key={code}
                    type="button"
                    role="tab"
                    aria-selected={countryCode === code}
                    disabled={selectedPlan?.currency === "USD" && code === "BO"}
                    onClick={() => setCountryCode(code)}
                    className={`rounded-xl border p-3 text-center transition-colors sm:p-4 ${
                      countryCode === code
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    <span className="block text-2xl" aria-hidden="true">
                      {icon}
                    </span>
                    <span className="mt-1 block font-semibold text-foreground">{label}</span>
                    <span className="block text-[11px] text-muted-foreground sm:text-xs">
                      {description}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-3 rounded-2xl border border-border bg-card p-4 sm:p-6">
                {selectedPlan ? (
                  <div className="mb-4 rounded-xl border border-primary/50 bg-primary/5 p-3 text-center">
                    <p className="font-display text-2xl text-foreground">
                      {formatPrice(selectedPlan.price, selectedPlan.currency)} /{" "}
                      {planPeriod(selectedPlan)}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedPlan.name}</p>
                  </div>
                ) : (
                  <p className="mb-4 text-sm text-muted-foreground">
                    Selecciona un plan para continuar.
                  </p>
                )}
                {countryCode === "BO" ? (
                  <div className="text-center">
                    <h3 className="font-cond text-sm font-semibold uppercase tracking-wide text-foreground">
                      Pago por QR · Bolivia
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Escanea el QR y realiza el pago por el monto del plan elegido. El
                      administrador confirmará el comprobante antes de activar el acceso.
                    </p>
                    <img
                      src={settings.data?.boliviaQrUrl ?? qrDefault}
                      alt="Código QR para pagar la membresía del Club Churrasqueando"
                      className="mx-auto mt-4 max-h-[360px] w-full max-w-xs rounded-xl bg-white object-contain p-2"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Si necesitas datos para transferencia o efectivo, consúltanos por WhatsApp.
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-cond text-sm font-semibold uppercase tracking-wide text-foreground">
                      Métodos internacionales
                    </h3>
                    {settings.isLoading ? (
                      <Loader2 className="mt-3 h-5 w-5 animate-spin text-primary" />
                    ) : settings.isError ? (
                      <p role="alert" className="mt-2 text-sm text-destructive">
                        No se pudieron cargar las instrucciones internacionales.
                      </p>
                    ) : settings.data?.internationalInstructions ? (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                        {settings.data.internationalInstructions}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Solicita las instrucciones internacionales verificadas por WhatsApp antes de
                        enviar dinero.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {!session ? (
              <div className="mt-4 space-y-3">
                <Button asChild className="w-full font-cond uppercase tracking-wide">
                  <Link to="/auth" search={{ redirect: "/club-pago", mode: "signup" }}>
                    <Flame className="h-4 w-4" /> Crear cuenta para continuar
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full font-cond uppercase tracking-wide"
                >
                  <a
                    href={`https://wa.me/${CLUB_WHATSAPP}?text=${encodeURIComponent("Hola, necesito información para pagar mi suscripción del Club Churrasqueando.")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" /> Contactar al Club por WhatsApp
                  </a>
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Crea una cuenta para registrar la solicitud. El registro de clientes requiere
                  confirmar el correo.
                </p>
              </div>
            ) : requestWhatsappHref ? (
              <Button asChild className="mt-4 w-full font-cond uppercase tracking-wide">
                <a href={requestWhatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> Enviar comprobante por WhatsApp
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                disabled={
                  !selectedPlan ||
                  !plans.data?.length ||
                  requestMutation.isPending ||
                  (countryCode === "INT" && settings.isLoading)
                }
                onClick={() => requestMutation.mutate()}
                className="mt-4 w-full font-cond uppercase tracking-wide"
              >
                {requestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                Registrar solicitud y continuar
              </Button>
            )}
            {isMember && changePlan && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setChangePlan(false)}
                className="mt-2 w-full"
              >
                Cancelar cambio de plan
              </Button>
            )}
          </>
        )}

        <section className="mt-8">
          <h2 className="font-cond border-b border-border pb-2 text-sm font-bold uppercase tracking-[0.2em] text-primary">
            Preguntas frecuentes
          </h2>
          <div className="mt-3 space-y-2">
            <Faq
              title="¿Cuándo se activa mi suscripción?"
              text="Cuando el equipo recibe y verifica el comprobante. La aprobación activa el plan y su vigencia."
            />
            <Faq
              title="¿Puedo cambiar de plan?"
              text="Sí. Puedes elegir otro plan antes de solicitar el pago o al renovar. Si tienes una solicitud pendiente, espera a que sea revisada."
            />
            <Faq
              title="¿Dónde envío mi comprobante?"
              text="Usa el botón de WhatsApp de esta página para contactar exclusivamente al equipo del Club."
            />
          </div>
        </section>
        <footer className="mt-8 text-center text-xs text-muted-foreground">
          <p className="font-display text-base tracking-widest text-foreground">CHURRASQUEANDO</p>
          <p>Club Churrasqueando · churrasqueando.shop</p>
        </footer>
      </main>
    </ClubShell>
  );
}

function Faq({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
