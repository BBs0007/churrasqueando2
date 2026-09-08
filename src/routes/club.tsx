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
  Sparkles,
  Star,
  Shirt,
  Hand,
  Video,
  Award,
  Heart,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { getMyClub, requestMembership } from "@/lib/club.functions";
import { getStoreCombos } from "@/lib/combos.functions";
import {
  CLUB,
  CLUB_BENEFITS,
  PUNTOS_BRASA_STEPS,
  FOUNDER_PERKS,
  CLUB_TESTIMONIALS,
  CLUB_FAQS,
} from "@/lib/club";
import { CLUB_CURSOS } from "@/data/club-cursos";
import { BUSINESS } from "@/data/business";
import { CURRENCY } from "@/data/products";
import { ClubShell } from "@/components/ClubShell";
import { Header } from "@/components/Header";
import { CombosSection } from "@/components/CombosSection";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSession } from "@/hooks/useSession";
import clubHero from "@/assets/club/club-hero.jpg";
import clubVideo from "@/assets/club/club-video-thumb.jpg";
import logo from "@/assets/logo-churrasqueando.png";

export const Route = createFileRoute("/club")({
  head: () => ({
    meta: [
      { title: "Club Churrasqueando · La plataforma para dominar la parrilla" },
      {
        name: "description",
        content:
          "6 cursos, recetarios y el soporte de nuestros parrilleros. Comunidad, Puntos Brasa y beneficios exclusivos de Socio Fundador.",
      },
      { property: "og:title", content: "Club Churrasqueando · Domina la parrilla" },
      {
        property: "og:description",
        content: "Cursos, comunidad, Puntos Brasa y beneficios exclusivos para socios del Club Churrasqueando.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClubPage,
});

const BENEFIT_ICONS: Record<string, React.ReactNode> = {
  lock: <Lock className="h-5 w-5" />,
  shirt: <Shirt className="h-5 w-5" />,
  hand: <Hand className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
};

const PERK_ICONS: Record<string, React.ReactNode> = {
  lock: <Lock className="h-3.5 w-3.5" />,
  award: <Award className="h-3.5 w-3.5" />,
  star: <Star className="h-3.5 w-3.5" />,
  video: <Video className="h-3.5 w-3.5" />,
};

function ClubPage() {
  const fetchClub = useServerFn(getMyClub);
  const askMembership = useServerFn(requestMembership);
  const fetchCombos = useServerFn(getStoreCombos);
  const queryClient = useQueryClient();
  const { session, loading: sessionLoading } = useSession();

  const { data } = useQuery({
    queryKey: ["club", "me"],
    queryFn: () => fetchClub(),
    enabled: !!session,
  });

  const { data: comboData } = useQuery({
    queryKey: ["store", "combos"],
    queryFn: () => fetchCombos(),
  });
  const combos = comboData?.combos ?? [];

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

  const foundersUsed = CLUB.founders.total - CLUB.founders.remaining;
  const foundersPct = Math.round((foundersUsed / CLUB.founders.total) * 100);

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
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="font-cond mt-5 text-xs uppercase tracking-[0.4em] text-primary">
            {CLUB.name}
          </p>
          <h1 className="font-display mx-auto mt-3 max-w-3xl text-3xl uppercase leading-tight tracking-wide text-foreground sm:text-5xl">
            La plataforma más completa para{" "}
            <span className="text-gradient-fire">dominar la parrilla</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {CLUB.coursesCount} cursos, recetarios y el soporte de nuestros parrilleros. Más una
            comunidad, Puntos Brasa y beneficios exclusivos de socio.
          </p>

          <p className="font-cond mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Star className="h-3.5 w-3.5 fill-primary" /> Precio de socio fundador · congelado de
            por vida
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a href="#suscribirse">
              <Button size="lg" className="font-cond uppercase tracking-wide">
                <Flame className="h-4 w-4" />
                {isMember
                  ? "Ver mis beneficios"
                  : `Suscribirme hoy · ${CLUB.monthlyPriceBs} ${CURRENCY}/mes`}
              </Button>
            </a>
            <a href="#video">
              <Button size="lg" variant="outline" className="font-cond uppercase tracking-wide">
                <Play className="h-4 w-4" /> Ver el video
              </Button>
            </a>
          </div>

          {session && (
            <div className="mt-5 flex justify-center">
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
            </div>
          )}
          {!session && !sessionLoading && (
            <div className="mt-5 flex justify-center">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="font-cond uppercase tracking-wide">
                  <UserPlus className="h-4 w-4" /> Crear cuenta gratis
                </Button>
              </Link>
            </div>
          )}

          <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: String(CLUB.coursesCount), v: "Cursos" },
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

      {/* EL PROBLEMA */}
      <section className="mt-14 rounded-3xl border border-border bg-card px-6 py-12 text-center sm:px-12 sm:py-16">
        <p className="font-cond text-xs uppercase tracking-[0.35em] text-primary">El problema</p>
        <h2 className="font-display mx-auto mt-3 max-w-2xl text-2xl uppercase leading-tight tracking-wide text-foreground sm:text-4xl">
          ¿Cansado de que cada asado sea una <span className="text-primary">lotería</span>?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Invitás gente y rezás para que la carne salga bien. A veces seca, a veces cruda. La
          verdad es simple: la buena carne hace el trabajo — solo falta que alguien te enseñe a no
          arruinarla. Eso es el {CLUB.name}.
        </p>
      </section>

      {/* VIDEO */}
      <section id="video" className="mt-14 scroll-mt-24">
        <p className="font-cond text-center text-xs uppercase tracking-[0.35em] text-primary">
          Así se vive el Club
        </p>
        <h2 className="font-display mt-2 text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          Mirá de qué se trata
        </h2>

        <div className="relative mt-8 overflow-hidden rounded-3xl border border-border">
          <img
            src={clubVideo}
            alt="Video de presentación del Club Churrasqueando"
            loading="lazy"
            width={1600}
            height={900}
            className="aspect-video w-full object-cover"
          />
          <div className="absolute inset-0 bg-background/45" />
          <span className="font-cond absolute right-4 top-4 rounded-full bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
            Video del Club · 3–4 min
          </span>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fire">
              <Play className="h-8 w-8" />
            </span>
            <p className="font-display px-6 text-xl uppercase tracking-wide text-foreground sm:text-2xl">
              Así se vive el Club Churrasqueando
            </p>
          </div>
          <span className="font-cond absolute bottom-4 right-4 rounded-full bg-background/85 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            3:50
          </span>
        </div>
      </section>

      {/* CURSOS */}
      <section className="mt-14">
        <p className="font-cond text-center text-xs uppercase tracking-[0.35em] text-primary">
          Todo incluido en tu membresía
        </p>
        <h2 className="font-display mt-2 text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          Conocé nuestros {CLUB.coursesCount} cursos
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
          Cada curso está pensado para llevarte de donde estás a donde querés llegar. Todos
          incluidos en el Club.
        </p>

        <div className="mt-10 space-y-6">
          {CLUB_CURSOS.map((c) => (
            <article
              key={c.id}
              className="grid gap-6 rounded-3xl border border-border bg-card p-4 sm:grid-cols-[280px_1fr] sm:p-6"
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-background">
                {c.image ? (
                  <>
                    <img
                      src={c.image}
                      alt={c.title}
                      loading="lazy"
                      width={800}
                      height={800}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <span className="font-cond absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary backdrop-blur">
                      {c.tag}
                    </span>
                  </>
                ) : (
                  <>
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(circle at 50% 100%, oklch(0.62 0.22 35 / 0.35), transparent 65%), var(--card)",
                      }}
                    />
                    <span className="font-cond absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary backdrop-blur">
                      {c.tag}
                    </span>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/50 text-primary">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <p className="font-display text-lg uppercase leading-tight tracking-wide text-foreground">
                        {c.title}
                      </p>
                    </div>
                    <p className="font-cond absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-background/85 px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                      <Camera className="h-3 w-3 shrink-0 text-primary" />
                      <span className="truncate">Foto: {c.photoBrief}</span>
                    </p>
                  </>
                )}
              </div>

              <div>
                <span className="font-cond inline-block rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                  {c.tag}
                </span>
                <h3 className="font-display mt-3 flex flex-wrap items-baseline gap-x-2 text-2xl uppercase tracking-wide text-foreground sm:text-3xl">
                  {c.title}
                  <span className="font-sans text-sm font-normal italic tracking-normal text-primary">
                    {c.subtitle}
                  </span>
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>
                <ul className="mt-4 space-y-2">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex gap-2.5 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-[2px] bg-primary" />
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

      {/* BENEFICIOS */}
      <section className="mt-14">
        <p className="font-cond text-center text-xs uppercase tracking-[0.35em] text-primary">
          Más que cursos
        </p>
        <h2 className="font-display mt-2 text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          Beneficios del socio
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {CLUB_BENEFITS.map((b) => (
            <div key={b.id} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                {BENEFIT_ICONS[b.icon]}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-xl uppercase tracking-wide text-foreground">
                    {b.title}
                  </h3>
                  {b.badge && (
                    <span className="font-cond rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                      {b.badge}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{b.description}</p>
                {!isMember && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 text-primary" /> Bloqueado hasta activar tu
                    membresía
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PUNTOS BRASA */}
      <section className="mt-14 rounded-3xl border border-border bg-card px-6 py-12 sm:px-10">
        <p className="font-cond text-center text-xs uppercase tracking-[0.35em] text-primary">
          Recompensa por comprar
        </p>
        <h2 className="font-display mt-2 text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          Cómo funcionan los Puntos Brasa
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
          Simple y sin letra chica. Mientras más comprás, más productos artesanales te llevás
          gratis.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {PUNTOS_BRASA_STEPS.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-border/70 bg-background/60 p-5 text-center"
            >
              <p className="font-display text-3xl text-primary">{s.id}</p>
              <h3 className="font-cond mt-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
          Ejemplo: <span className="text-foreground">200 puntos = una linguiça artesanal gratis</span>{" "}
          · <span className="text-foreground">500 = envío gratis</span> ·{" "}
          <span className="text-foreground">3.000 = el combo parrillero grande</span>. Los puntos
          vencen a los {CLUB.pointsExpireMonths} meses sin comprar.
        </p>
      </section>

      {/* COMBOS */}
      {combos.length > 0 && (
        <section className="mt-14">
          <p className="font-cond text-center text-xs uppercase tracking-[0.35em] text-primary">
            Directo a tu parrillada
          </p>
          <h2 className="font-display mt-2 text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
            Combos para socios
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
            Packs armados que además suman Puntos Brasa en cada compra.
          </p>
          <div className="mt-8">
            <CombosSection combos={combos} />
          </div>
        </section>
      )}

      {/* SOCIOS FUNDADORES */}
      <section className="mt-14 rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card px-6 py-12 text-center sm:px-10 sm:py-16">
        <p className="font-cond text-xs uppercase tracking-[0.35em] text-primary">
          Oferta de lanzamiento
        </p>
        <h2 className="font-display mx-auto mt-2 max-w-xl text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          Sé <span className="text-gradient-fire">socio fundador</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
          Los primeros {CLUB.founders.total} socios entran a un precio que queda congelado para
          siempre, con beneficios que nadie más va a tener. Cuando se llenan los cupos, esta
          puerta se cierra.
        </p>

        <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2">
          {FOUNDER_PERKS.map((p) => (
            <span
              key={p.id}
              className="font-cond inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              <span className="text-primary">{PERK_ICONS[p.icon]}</span> {p.label}
            </span>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-md">
          <Progress value={foundersPct} className="h-2" />
          <div className="font-cond mt-2 flex justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span>Cupos de fundador</span>
            <span className="text-primary">
              Quedan {CLUB.founders.remaining} de {CLUB.founders.total}
            </span>
          </div>
        </div>

        <a href="#suscribirse" className="mt-8 inline-block">
          <Button size="lg" className="font-cond uppercase tracking-wide">
            <Star className="h-4 w-4" /> Quiero ser fundador
          </Button>
        </a>
      </section>

      {/* TESTIMONIOS */}
      <section className="mt-14">
        <p className="font-cond text-center text-xs uppercase tracking-[0.35em] text-primary">
          Lo que dicen los socios
        </p>
        <h2 className="font-display mt-2 text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          Historias del fuego
        </h2>
        <p className="mt-2 text-center text-xs italic text-muted-foreground">
          (Testimonios de ejemplo — reemplazar con socios reales)
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {CLUB_TESTIMONIALS.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex gap-0.5 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-primary" />
                ))}
              </div>
              <p className="mt-3 text-sm italic text-muted-foreground">“{t.quote}”</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-cond text-sm font-semibold text-foreground">
                  {t.name.charAt(0)}
                </span>
                <div className="leading-tight">
                  <p className="font-cond text-sm font-semibold uppercase tracking-wide text-foreground">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GARANTÍA */}
      <section className="mt-10">
        <div className="mx-auto flex max-w-2xl items-start gap-4 rounded-2xl border border-border bg-card p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
            <Heart className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-lg uppercase tracking-wide text-foreground">
              Probá 7 días sin riesgo
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Entrá al Club, mirá los cursos y viví la comunidad. Si no es para vos, te devolvemos
              tu dinero. Sin vueltas.
            </p>
          </div>
        </div>
      </section>

      {/* SUSCRIPCIÓN */}
      <section
        id="suscribirse"
        className="mt-14 scroll-mt-24 rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-10"
      >
        <p className="font-cond text-center text-xs uppercase tracking-[0.35em] text-primary">
          Una sola membresía, todo adentro
        </p>
        <h2 className="font-display mt-2 text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          Sumate al Club
        </h2>

        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border bg-background/70 p-6 text-center">
          <p className="text-xs text-muted-foreground">
            Un solo curso suelto cuesta {CLUB.singleCoursePriceBs} {CURRENCY}. Adentro del Club los
            tenés los {CLUB.coursesCount}.
          </p>
          <p className="font-display mt-3 text-5xl text-foreground">
            {CLUB.monthlyPriceBs}
            <span className="text-lg text-muted-foreground"> {CURRENCY} / mes</span>
          </p>
          <p className="font-cond mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            o {CLUB.annualPriceBs} {CURRENCY}/año · 2 meses gratis
          </p>

          <ul className="mt-6 space-y-2.5 text-left text-sm text-muted-foreground">
            {[
              "Los 6 cursos y recetarios completos",
              "Comunidad privada de parrilleros",
              "Puntos Brasa canjeables por productos",
              "Merch y precio congelado de fundador",
              "Acceso a las grabaciones en vivo",
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7">
            {!session ? (
              <div className="space-y-3">
                <Link to="/auth" className="block">
                  <Button className="w-full font-cond uppercase tracking-wide">
                    <UserPlus className="h-4 w-4" /> Crear cuenta / Iniciar sesión
                  </Button>
                </Link>
                <a href={waUrl} target="_blank" rel="noreferrer" className="block">
                  <Button variant="outline" className="w-full font-cond uppercase tracking-wide">
                    <MessageCircle className="h-4 w-4" /> Consultar por WhatsApp
                  </Button>
                </a>
                <p className="text-xs text-muted-foreground">
                  Regístrate gratis para acumular Puntos Brasa y activar tu membresía cuando
                  quieras.
                </p>
              </div>
            ) : isMember ? (
              <div className="rounded-xl border border-border/70 bg-card p-4 text-sm text-muted-foreground">
                <p className="font-display text-lg uppercase tracking-wide text-foreground">
                  Tu membresía está activa
                </p>
                <p className="mt-1">
                  Disfruta de todos los beneficios y acumula puntos con cada pedido. Tienes{" "}
                  {profile?.points ?? 0} pts.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <a href={waUrl} target="_blank" rel="noreferrer" className="block">
                  <Button className="w-full font-cond uppercase tracking-wide">
                    <MessageCircle className="h-4 w-4" /> Suscribirme hoy
                  </Button>
                </a>
                <a href={waUrl} target="_blank" rel="noreferrer" className="block">
                  <Button variant="outline" className="w-full font-cond uppercase tracking-wide">
                    <MessageCircle className="h-4 w-4" /> Consultar por WhatsApp
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  disabled={mutation.isPending || !!pending}
                  onClick={() => mutation.mutate()}
                  className="w-full font-cond uppercase tracking-wide"
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
                {pending && (
                  <p className="text-xs text-muted-foreground">
                    Solicitud enviada el {new Date(pending.created_at).toLocaleDateString("es-BO")}.
                    La activación es manual y la confirma el equipo de Churrasqueando.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-14">
        <p className="font-cond text-center text-xs uppercase tracking-[0.35em] text-primary">
          Dudas
        </p>
        <h2 className="font-display mt-2 text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          Preguntas frecuentes
        </h2>

        <Accordion type="single" collapsible className="mx-auto mt-8 max-w-2xl space-y-3">
          {CLUB_FAQS.map((f) => (
            <AccordionItem
              key={f.id}
              value={f.id}
              className="rounded-2xl border border-border bg-card px-5"
            >
              <AccordionTrigger className="font-cond text-sm font-semibold uppercase tracking-wide text-foreground hover:no-underline">
                {f.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {f.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* FOOTER MINI */}
      <div className="mt-16 border-t border-border pt-8 text-center">
        <img
          src={logo}
          alt={CLUB.name}
          width={40}
          height={40}
          className="mx-auto h-10 w-10 rounded-xl object-cover ring-1 ring-primary/40"
        />
        <p className="font-display mt-3 text-xl uppercase tracking-wide text-foreground">
          Churrasqueando
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {CLUB.name} · Santa Cruz de la Sierra, Bolivia · churrasqueando.shop
        </p>
      </div>
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
