import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Flame,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { getMyClub, getMembershipPaymentSettings, requestMembership } from "@/lib/club.functions";
import { getClubContent } from "@/lib/club-content.functions";
import { getClubLandingNumber } from "@/lib/club-landing-content";
import { BUSINESS } from "@/data/business";
import { CURRENCY } from "@/data/products";
import { useSession } from "@/hooks/useSession";
import qrDefault from "@/assets/club/membership-qr.jpeg";

export const Route = createFileRoute("/club-pago")({
  head: () => ({
    meta: [
      { title: "Pago de membresía · Club Churrasqueando" },
      {
        name: "description",
        content: "Elige cómo pagar tu membresía anual del Club Churrasqueando.",
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

function ClubPaymentPage() {
  const queryClient = useQueryClient();
  const { session, loading: sessionLoading } = useSession();
  const fetchClub = useServerFn(getMyClub);
  const fetchSettings = useServerFn(getMembershipPaymentSettings);
  const fetchLandingContent = useServerFn(getClubContent);
  const createRequest = useServerFn(requestMembership);
  const [countryCode, setCountryCode] = useState<CountryCode>("BO");
  const [hasDetectedCountry, setHasDetectedCountry] = useState(false);
  const [whatsappHref, setWhatsappHref] = useState<string | null>(null);

  const club = useQuery({
    queryKey: ["club", "me"],
    queryFn: () => fetchClub(),
    enabled: !!session,
  });
  const settings = useQuery({
    queryKey: ["club", "payment-settings"],
    queryFn: () => fetchSettings(),
  });
  const landingContent = useQuery({
    queryKey: ["club-content"],
    queryFn: () => fetchLandingContent(),
  });
  const annualPrice = getClubLandingNumber(landingContent.data ?? {}, "membership_annual_price");

  useEffect(() => {
    setCountryCode(detectCountryFromBrowser());
    setHasDetectedCountry(true);
  }, []);

  const pendingRequest = useMemo(
    () => club.data?.requests.find((request) => request.status === "pending") ?? null,
    [club.data?.requests],
  );
  const isMember = !!club.data?.isMember || !!club.data?.isAdmin;
  const paymentMethod = countryCode === "BO" ? "bolivia_qr" : "binance";

  const makeWhatsappHref = useCallback(
    (requestId: string, amount: number, method: string, country: string) => {
      const message = [
        `Hola, quiero activar mi membresía anual del Club Churrasqueando.`,
        `Solicitud: ${requestId}`,
        `Cuenta: ${club.data?.profile.email ?? session?.user.email ?? "sin correo"}`,
        `Método: ${method === "bolivia_qr" ? "QR Bolivia" : "Pago internacional"}`,
        `País: ${country === "BO" ? "Bolivia" : "Internacional"}`,
        `Monto: ${amount} ${CURRENCY}`,
        "Adjunto mi comprobante para verificación.",
      ].join("\n");
      return `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}`;
    },
    [club.data?.profile.email, session?.user.email],
  );

  useEffect(() => {
    if (pendingRequest) {
      setWhatsappHref(
        makeWhatsappHref(
          pendingRequest.id,
          pendingRequest.amount,
          pendingRequest.payment_method,
          pendingRequest.country_code,
        ),
      );
    }
  }, [makeWhatsappHref, pendingRequest]);

  const requestMutation = useMutation({
    mutationFn: () => createRequest({ data: { paymentMethod, countryCode } }),
    onSuccess: async (result) => {
      if (result.request) {
        setWhatsappHref(
          makeWhatsappHref(
            result.request.id,
            result.request.amount,
            result.request.payment_method,
            result.request.country_code,
          ),
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["club", "me"] });
      toast.success("Solicitud registrada. Envía el comprobante para verificar tu pago.");
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la solicitud"),
  });

  const points = club.data?.profile.points;

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
      <Link
        to="/club"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al Club
      </Link>

      {isMember ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-primary/40 bg-primary/10 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
          <h1 className="font-display mt-3 text-2xl uppercase text-foreground">
            Tu membresía está activa
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ya puedes entrar a los cursos y beneficios del Club.
          </p>
          <Button asChild className="mt-5 font-cond uppercase tracking-wide">
            <Link to="/cursos">Ir a mis cursos</Link>
          </Button>
        </div>
      ) : pendingRequest ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-primary/40 bg-card p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h1 className="font-display text-xl uppercase text-foreground">
                Pago pendiente de verificación
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Tu membresía y los cursos seguirán bloqueados hasta que nuestro equipo compruebe el
                pago y el administrador apruebe la solicitud.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Solicitud {pendingRequest.id} ·{" "}
                {pendingRequest.payment_method === "bolivia_qr" ? "QR Bolivia" : "Internacional"}
              </p>
            </div>
          </div>
          {whatsappHref && (
            <Button asChild className="mt-5 w-full font-cond uppercase tracking-wide">
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" /> Enviar comprobante por WhatsApp
              </a>
            </Button>
          )}
        </div>
      ) : (
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-card sm:p-8">
          <div className="text-center">
            <Flame className="mx-auto h-8 w-8 text-primary" />
            <p className="font-cond mt-3 text-xs uppercase tracking-[0.25em] text-primary">
              Membresía anual
            </p>
            <h1 className="font-display mt-1 text-3xl uppercase text-foreground">
              Suscríbete al Club
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {annualPrice} {CURRENCY} al año · Acceso después de verificar y aprobar el pago.
            </p>
          </div>

          <div className="mt-7">
            <p className="mb-2 text-sm font-semibold text-foreground">¿Desde dónde pagas?</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["BO", "Bolivia"],
                  ["INT", "Otro país"],
                ] as const
              ).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setCountryCode(code);
                    setWhatsappHref(null);
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    countryCode === code
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {hasDetectedCountry && (
              <p className="mt-2 text-xs text-muted-foreground">
                Sugerencia basada en la configuración regional de tu navegador; puedes cambiarla.
              </p>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-border bg-background/60 p-4">
            {countryCode === "BO" ? (
              <>
                <h2 className="font-cond text-sm font-semibold uppercase tracking-wide text-foreground">
                  Paga con QR · Banco Ganadero
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Escanea el QR, introduce el monto de la membresía ({annualPrice} {CURRENCY}) y
                  confirma la transferencia.
                </p>
                <img
                  src={settings.data?.boliviaQrUrl ?? qrDefault}
                  alt="Código QR de pago de la membresía del Club Churrasqueando"
                  className="mx-auto mt-4 max-h-[420px] w-full max-w-sm rounded-xl bg-white object-contain p-2"
                />
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Titular: Monasterio Vargas Diego Enrique · Cuenta de abono CA
                </p>
              </>
            ) : (
              <>
                <h2 className="font-cond text-sm font-semibold uppercase tracking-wide text-foreground">
                  Pago internacional · Binance
                </h2>
                {settings.isLoading ? (
                  <Loader2 className="mt-3 h-5 w-5 animate-spin text-primary" />
                ) : settings.isError ? (
                  <p className="mt-2 text-sm text-destructive">
                    No se pudieron cargar las instrucciones de pago.
                  </p>
                ) : settings.data?.internationalInstructions ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {settings.data.internationalInstructions}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    PENDIENTE DE CONFIGURAR. Escríbenos por WhatsApp para recibir las instrucciones
                    internacionales verificadas. No envíes dinero a direcciones no confirmadas.
                  </p>
                )}
                <Button asChild variant="outline" className="mt-4 w-full font-cond uppercase">
                  <a
                    href={`https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent("Hola, quiero pagar la membresía anual del Club Churrasqueando desde otro país. ¿Me comparten las instrucciones internacionales?")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" /> Consultar instrucciones por WhatsApp
                  </a>
                </Button>
              </>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-foreground">Después de realizar el pago</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Registra tu solicitud y envía el comprobante por WhatsApp. Tu cuenta mostrará el
              estado pendiente; el acceso se activa únicamente cuando el administrador confirme el
              pago.
            </p>
          </div>

          {landingContent.isError && (
            <p className="mt-4 text-sm text-destructive">
              No se pudo cargar el precio actual. Recarga la página antes de registrar el pago.
            </p>
          )}
          {requestMutation.isError && (
            <p className="mt-4 text-sm text-destructive">
              {requestMutation.error instanceof Error
                ? requestMutation.error.message
                : "No se pudo registrar el pago"}
            </p>
          )}
          {!session ? (
            <div className="mt-5 space-y-3">
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
                  href={`https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(
                    `Hola, estoy revisando el pago de la membresía del Club Churrasqueando y necesito orientación. Método: ${paymentMethod === "bolivia_qr" ? "QR Bolivia" : "pago internacional"}.`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> Hablar por WhatsApp
                </a>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Puedes revisar el método de pago ahora. Para registrar la solicitud y enviar el
                comprobante, crea tu cuenta o inicia sesión.
              </p>
            </div>
          ) : whatsappHref ? (
            <Button asChild className="mt-5 w-full font-cond uppercase tracking-wide">
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" /> Enviar comprobante por WhatsApp
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              disabled={
                requestMutation.isPending ||
                landingContent.isLoading ||
                landingContent.isError ||
                (countryCode === "INT" && settings.isLoading)
              }
              onClick={() => requestMutation.mutate()}
              className="mt-5 w-full font-cond uppercase tracking-wide"
            >
              {requestMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Registrar solicitud y continuar
            </Button>
          )}
        </div>
      )}
    </ClubShell>
  );
}
