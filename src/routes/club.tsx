import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Lock,
  Unlock,
  MessageCircle,
  CheckCircle2,
  Clock,
  Play,
  Check,
  Flame,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { getMyClub, requestMembership } from "@/lib/club.functions";
import { CLUB, CLUB_BENEFITS } from "@/lib/club";
import { CLUB_CURSOS } from "@/data/club-cursos";
import { BUSINESS } from "@/data/business";
import { CURRENCY } from "@/data/products";
import { ClubShell } from "@/components/ClubShell";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import clubHero from "@/assets/club/club-hero.jpg";
import clubVideo from "@/assets/club/club-video-thumb.jpg";
import logo from "@/assets/logo-churrasqueando.png";

export const Route = createFileRoute("/club")({
  head: () => ({
    meta: [
      { title: "Club Churrasqueando · Cursos de parrilla y beneficios" },
      {
        name: "description",
        content:
          "La plataforma para dominar la parrilla: cursos de fuego, cortes, linguiças, BBQ y asado a la leña, más descuentos y canje de puntos para socios.",
      },
      { property: "og:title", content: "Club Churrasqueando · Cursos de parrilla" },
      {
        property: "og:description",
        content: "Cursos, recetarios y beneficios exclusivos para socios del Club Churrasqueando.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClubPage,
});

function ClubPage() {
  const fetchClub = useServerFn(getMyClub);
  const askMembership = useServerFn(requestMembership);
  const queryClient = useQueryClient();
  const { session, loading: sessionLoading } = useSession();

  const { data } = useQuery({
    queryKey: ["club", "me"],
    queryFn: () => fetchClub(),
    enabled: !!session,
  });

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

  const profile = data?.profile;
  const isMember = !!data?.isMember;
  const isAdmin = !!data?.isAdmin;
  const pending = data?.requests.find((r) => r.status === "pending");

  const waMessage = encodeURIComponent(
    `¡Hola Churrasqueando! Quiero activar mi membresía del ${CLUB.name} (${CLUB.planLabel}, ${CLUB.monthlyPriceBs} ${CURRENCY}).${
      profile?.email ? `\nMi cuenta: ${profile.email}` : ""
    }\nEnvíenme el QR de pago, por favor.`,
  );
  const waUrl = `https://wa.me/${BUSINESS.whatsapp}?text=${waMessage}`;

  const content = (
    <>
      {/* HERO */}
      <section className="relative -mx-4 overflow-hidden rounded-none border-y border-border/70 sm:mx-0 sm:rounded-3xl sm:border">
        <img
          src={clubHero}
          alt="Cortes sellándose sobre brasas"
          width={1600}
          height={900}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        <div className="relative px-6 py-14 text-center sm:px-10 sm:py-20">
          <img
            src={logo}
            alt="Club Churrasqueando"
            width={96}
            height={96}
            className="mx-auto h-20 w-20 rounded-2xl object-cover ring-1 ring-primary/50"
          />
          <p className="font-cond mt-5 text-xs uppercase tracking-[0.4em] text-primary">
            {CLUB.name}
          </p>
          <h1 className="font-display mx-auto mt-3 max-w-3xl text-3xl uppercase leading-tight tracking-wide text-foreground sm:text-5xl">
            La plataforma más completa para aprender a dominar la parrilla
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Cursos, recetarios y soporte de nuestros parrilleros, además de descuentos y canje de
            puntos en la tienda. Todo dentro de tu membresía {CLUB.planLabel.toLowerCase()} de{" "}
            {CLUB.monthlyPriceBs} {CURRENCY}.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a href="#suscribirse">
              <Button size="lg" className="font-cond uppercase tracking-wide">
                <Flame className="h-4 w-4" />
                {isMember ? "Ver mis beneficios" : "Suscribirme hoy"}
              </Button>
            </a>
            {session ? (
              <span
                className={`font-cond inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                  isMember
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {isMember ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {isMember ? "Membresía activa" : "Membresía inactiva"}
              </span>
            ) : (
              !sessionLoading && (
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="font-cond uppercase tracking-wide">
                    <UserPlus className="h-4 w-4" /> Crear cuenta gratis
                  </Button>
                </Link>
              )
            )}
          </div>

          <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: "+5", v: "Cursos" },
              { k: "+120", v: "Lecciones" },
              { k: "+300", v: "Recetas" },
              { k: "24/7", v: "Acceso" },
            ].map((s) => (
              <div
                key={s.v}
                className="rounded-2xl border border-border/70 bg-card/70 px-3 py-4 backdrop-blur"
              >
                <dt className="font-display text-2xl text-primary">{s.k}</dt>
                <dd className="font-cond text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CURSOS */}
      <section className="mt-14">
        <h2 className="font-display text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          Conoce nuestros cursos
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
          Todos los cursos están incluidos en la membresía del Club. Las imágenes son referenciales
          mientras subimos las fotos y videos reales.
        </p>

        <div className="mt-10 space-y-10">
          {CLUB_CURSOS.map((c, i) => (
            <article
              key={c.id}
              className="grid items-center gap-6 rounded-3xl border border-border bg-card p-4 sm:p-6 lg:grid-cols-2 lg:gap-10"
            >
              <div
                className={`relative overflow-hidden rounded-2xl ${i % 2 === 1 ? "lg:order-2" : ""}`}
              >
                <img
                  src={c.image}
                  alt={c.title}
                  loading="lazy"
                  width={1200}
                  height={800}
                  className="aspect-[3/2] w-full object-cover"
                />
                <span className="font-cond absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary backdrop-blur">
                  {c.tag}
                </span>
              </div>

              <div>
                <h3 className="font-display text-2xl uppercase tracking-wide text-foreground sm:text-3xl">
                  {c.title}
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>
                <ul className="mt-4 space-y-2">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  {isMember ? (
                    <Button variant="outline" className="font-cond uppercase tracking-wide" disabled>
                      <Play className="h-4 w-4" /> Contenido en preparación
                    </Button>
                  ) : (
                    <a href="#suscribirse">
                      <Button className="font-cond uppercase tracking-wide">
                        <Lock className="h-4 w-4" /> Incluido · Suscríbete
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* VIDEO PLACEHOLDER */}
      <section className="mt-14">
        <div className="relative overflow-hidden rounded-3xl border border-border">
          <img
            src={clubVideo}
            alt="Video de presentación del Club Churrasqueando"
            loading="lazy"
            width={1600}
            height={900}
            className="aspect-video w-full object-cover"
          />
          <div className="absolute inset-0 bg-background/45" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fire">
              <Play className="h-8 w-8" />
            </span>
            <p className="font-display text-xl uppercase tracking-wide text-foreground sm:text-2xl">
              Así se vive el Club Churrasqueando
            </p>
            <p className="font-cond text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Video demostrativo · próximamente
            </p>
          </div>
          <span className="font-cond absolute bottom-4 right-4 rounded-full bg-background/85 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            2:38
          </span>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="mt-14">
        <h2 className="font-display text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          Beneficios del socio
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {CLUB_BENEFITS.map((b) => (
            <div key={b.id} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-display text-xl uppercase tracking-wide text-foreground">
                {b.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.description}</p>
              {!isMember && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 text-primary" /> Bloqueado hasta activar tu membresía
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SUSCRIPCIÓN */}
      <section
        id="suscribirse"
        className="mt-14 scroll-mt-24 rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-10"
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="font-cond text-xs uppercase tracking-[0.35em] text-primary">
              Suscríbete hoy
            </p>
            <h2 className="font-display mt-2 text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
              {CLUB.monthlyPriceBs} {CURRENCY}{" "}
              <span className="text-base text-muted-foreground">/ mes</span>
            </h2>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              {[
                "Todos nuestros cursos y recetarios",
                "Descuentos exclusivos de socio en la tienda",
                `Canje de puntos: ${CLUB.redeemStep} pts = ${CLUB.redeemValueBs} ${CURRENCY}`,
                "Soporte directo del equipo Churrasqueando",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {!session ? (
            <div className="rounded-2xl border border-border bg-background/60 p-6">
              <p className="font-display text-2xl uppercase tracking-wide text-foreground">
                Crea tu cuenta gratis
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Regístrate para acumular puntos con cada compra y activar tu membresía del Club
                cuando quieras. El registro es gratuito.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/auth">
                  <Button className="font-cond uppercase tracking-wide">
                    <UserPlus className="h-4 w-4" /> Crear cuenta / Iniciar sesión
                  </Button>
                </Link>
                <a href={waUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="font-cond uppercase tracking-wide">
                    <MessageCircle className="h-4 w-4" /> Consultar por WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          ) : isMember ? (
            <div className="rounded-2xl border border-border bg-background/60 p-6">
              <p className="font-display text-2xl uppercase tracking-wide text-foreground">
                Tu membresía está activa
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Disfruta de todos los beneficios y acumula puntos con cada pedido. Tienes{" "}
                {profile?.points ?? 0} pts.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-background/60 p-6">
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <span className="font-semibold text-foreground">1.</span> Escríbenos por WhatsApp y
                  te enviamos el QR de pago de {CLUB.monthlyPriceBs} {CURRENCY}.
                </li>
                <li>
                  <span className="font-semibold text-foreground">2.</span> Realiza el pago y envía
                  el comprobante por el mismo chat.
                </li>
                <li>
                  <span className="font-semibold text-foreground">3.</span> Marca “Ya realicé el
                  pago” y nuestro equipo activa tu membresía al confirmarlo.
                </li>
              </ol>

              <div className="mt-6 flex flex-wrap gap-3">
                <a href={waUrl} target="_blank" rel="noreferrer">
                  <Button className="font-cond uppercase tracking-wide">
                    <MessageCircle className="h-4 w-4" /> Pedir QR por WhatsApp
                  </Button>
                </a>
                <Button
                  variant="outline"
                  disabled={mutation.isPending || !!pending}
                  onClick={() => mutation.mutate()}
                  className="font-cond uppercase tracking-wide"
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : pending ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {pending ? "Solicitud en revisión" : "Ya realicé el pago"}
                </Button>
              </div>

              {pending && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Solicitud enviada el {new Date(pending.created_at).toLocaleDateString("es-BO")}. La
                  activación es manual y la confirma el equipo de Churrasqueando.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );

  if (session && data) {
    return (
      <ClubShell points={profile?.points} isMember={isMember} isAdmin={isAdmin}>
        {content}
      </ClubShell>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">{content}</main>
    </div>
  );
}
