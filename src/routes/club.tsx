import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Lock,
  Unlock,
  AlertCircle,
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
} from "lucide-react";
import { getMyClub } from "@/lib/club.functions";
import { getPublicCourses } from "@/lib/courses.functions";
import { getClubContent } from "@/lib/club-content.functions";
import {
  CLUB_LANDING_DEFAULTS,
  getClubLandingCollection,
  getClubLandingNumber,
  getClubLandingText,
} from "@/lib/club-landing-content";
import {
  CLUB_BENEFITS,
  PUNTOS_BRASA_STEPS,
  FOUNDER_PERKS,
  CLUB_TESTIMONIALS,
  CLUB_FAQS,
} from "@/lib/club";
import { CURRENCY } from "@/data/products";
import { ClubShell } from "@/components/ClubShell";
import { Header } from "@/components/Header";
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
  loader: () => getClubContent(),
  head: ({ loaderData }) => {
    const content = loaderData ?? {};
    return {
      meta: [
        { title: getClubLandingText(content, "seo_title") },
        { name: "description", content: getClubLandingText(content, "seo_description") },
        { property: "og:title", content: getClubLandingText(content, "seo_social_title") },
        {
          property: "og:description",
          content: getClubLandingText(content, "seo_social_description"),
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
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
  const fetchCourses = useServerFn(getPublicCourses);
  const fetchContent = useServerFn(getClubContent);
  const routeContent = Route.useLoaderData();
  const { session, loading: sessionLoading } = useSession();

  const clubContentQuery = useQuery({
    queryKey: ["club-content"],
    queryFn: () => fetchContent(),
    initialData: routeContent,
  });
  const c = clubContentQuery.data ?? {};
  const t = (key: string) => getClubLandingText(c, key);
  const img = (key: string, fallback: string) => c[key]?.trim() || fallback;

  const { data } = useQuery({
    queryKey: ["club", "me"],
    queryFn: () => fetchClub(),
    enabled: !!session,
  });

  const courses = useQuery({
    queryKey: ["club", "courses"],
    queryFn: () => fetchCourses(),
  });
  const clubCursos = courses.data ?? [];

  const profile = data?.profile;
  const isMember = !!data?.isMember;
  const isAdmin = !!data?.isAdmin;

  const foundersTotal = Math.max(0, getClubLandingNumber(c, "founders_total"));
  const foundersRemaining = Math.min(
    foundersTotal,
    Math.max(0, getClubLandingNumber(c, "founders_remaining")),
  );
  const foundersUsed = foundersTotal - foundersRemaining;
  const foundersPct = foundersTotal > 0 ? Math.round((foundersUsed / foundersTotal) * 100) : 0;
  const hasPendingMembership = data?.requests.some((request) => request.status === "pending");
  const benefits = getClubLandingCollection<(typeof CLUB_BENEFITS)[number]>(c, "benefits");
  const pointsSteps = getClubLandingCollection<(typeof PUNTOS_BRASA_STEPS)[number]>(
    c,
    "points_steps",
  );
  const founderPerks = getClubLandingCollection<(typeof FOUNDER_PERKS)[number]>(c, "founder_perks");
  const testimonials = getClubLandingCollection<(typeof CLUB_TESTIMONIALS)[number]>(
    c,
    "testimonials",
  );
  const membershipPerks = getClubLandingCollection<{ text: string }>(c, "membership_perks");
  const faqs = getClubLandingCollection<(typeof CLUB_FAQS)[number]>(c, "faqs");
  const annualPrice = getClubLandingNumber(c, "membership_annual_price");
  const regularPrice = getClubLandingNumber(c, "membership_regular_price");
  const testimonialsNote = Object.hasOwn(c, "testimonials_note")
    ? c.testimonials_note
    : CLUB_LANDING_DEFAULTS.testimonials_note;
  const heroTitle = t("hero_title");
  const problemTitle = t("problem_title");
  const foundersTitle = t("founders_title");

  const content = (
    <>
      {/* FRANJA DE LANZAMIENTO */}
      <div className="-mx-4 mb-6 flex items-center justify-center gap-2.5 bg-primary px-4 py-3 text-center shadow-fire sm:mx-0 sm:rounded-2xl">
        <Flame className="h-4 w-4 shrink-0 text-primary-foreground" />
        <p className="font-cond text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground sm:text-sm">
          {t("launch_banner")}
        </p>
      </div>

      {/* HERO */}
      <section className="relative -mx-4 overflow-hidden rounded-none border-y border-border/70 sm:mx-0 sm:rounded-3xl sm:border">
        <img
          src={img("hero_image", clubHero)}
          alt={t("hero_image_alt")}
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
            {t("hero_brand")}
          </p>
          <h1 className="font-display mx-auto mt-3 max-w-3xl text-3xl uppercase leading-tight tracking-wide text-foreground sm:text-5xl">
            {heroTitle === CLUB_LANDING_DEFAULTS.hero_title ? (
              <>
                La plataforma más completa para{" "}
                <span className="text-gradient-fire">dominar la parrilla</span>
              </>
            ) : (
              heroTitle
            )}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {t("hero_subtitle")}
          </p>

          <p className="font-cond mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Star className="h-3.5 w-3.5 fill-primary" /> {t("hero_founder_badge")}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link to={isMember ? "/cursos" : "/club-pago"}>
              <Button size="lg" className="font-cond uppercase tracking-wide">
                <Flame className="h-4 w-4" />
                {isMember
                  ? "Ver mis cursos"
                  : hasPendingMembership
                    ? "Ver estado de mi pago"
                    : `${t("hero_cta")} · ${annualPrice} ${CURRENCY}/año`}
              </Button>
            </Link>
            <a href="#video">
              <Button size="lg" variant="outline" className="font-cond uppercase tracking-wide">
                <Play className="h-4 w-4" /> {t("hero_video_cta")}
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
              <Link to="/club-pago">
                <Button variant="ghost" size="sm" className="font-cond uppercase tracking-wide">
                  <UserPlus className="h-4 w-4" /> Crear cuenta gratis
                </Button>
              </Link>
            </div>
          )}

          <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: t("hero_stat_courses"), v: t("hero_stat_courses_label") },
              { k: t("hero_stat_lessons"), v: t("hero_stat_lessons_label") },
              { k: t("hero_stat_recipes"), v: t("hero_stat_recipes_label") },
              { k: t("hero_stat_access"), v: t("hero_stat_access_label") },
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
        <p className="font-cond text-xs uppercase tracking-[0.35em] text-primary">
          {t("problem_eyebrow")}
        </p>
        <h2 className="font-display mx-auto mt-3 max-w-2xl text-2xl uppercase leading-tight tracking-wide text-foreground sm:text-4xl">
          {problemTitle === CLUB_LANDING_DEFAULTS.problem_title ? (
            <>
              ¿Cansado de que cada asado sea una <span className="text-primary">lotería</span>?
            </>
          ) : (
            problemTitle
          )}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {t("problem_body")}
        </p>
      </section>

      {/* VIDEO */}
      <section id="video" className="mt-14 scroll-mt-24">
        <p className="font-cond text-center text-xs uppercase tracking-[0.35em] text-primary">
          {t("video_eyebrow")}
        </p>
        <h2 className="font-display mt-2 text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          {t("video_title")}
        </h2>

        <div className="relative mt-8 overflow-hidden rounded-3xl border border-border">
          <img
            src={img("video_image", clubVideo)}
            alt={t("video_image_alt")}
            loading="lazy"
            width={1600}
            height={900}
            className="aspect-video w-full object-cover"
          />
          <div className="absolute inset-0 bg-background/45" />
          <span className="font-cond absolute right-4 top-4 rounded-full bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
            {t("video_badge")}
          </span>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fire">
              <Play className="h-8 w-8" />
            </span>
            <p className="font-display px-6 text-xl uppercase tracking-wide text-foreground sm:text-2xl">
              {t("video_overlay_title")}
            </p>
          </div>
          <span className="font-cond absolute bottom-4 right-4 rounded-full bg-background/85 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            {t("video_duration")}
          </span>
        </div>
      </section>

      {/* CURSOS */}
      <section className="mt-14">
        <p className="font-cond text-center text-xs uppercase tracking-[0.35em] text-primary">
          {t("courses_eyebrow")}
        </p>
        <h2 className="font-display mt-2 text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          {t("courses_title")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
          {t("courses_description")}
        </p>

        <div className="mt-10 space-y-6">
          {clubCursos.map((c) => (
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
                    <Button
                      variant="outline"
                      className="font-cond uppercase tracking-wide"
                      disabled
                    >
                      <Play className="h-4 w-4" /> Contenido en preparación
                    </Button>
                  ) : (
                    <Link to="/club-pago">
                      <Button className="font-cond uppercase tracking-wide">
                        <Lock className="h-4 w-4" /> {t("courses_cta")}
                      </Button>
                    </Link>
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
          {t("benefits_eyebrow")}
        </p>
        <h2 className="font-display mt-2 text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          {t("benefits_title")}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {benefits.map((b) => (
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
          {t("points_eyebrow")}
        </p>
        <h2 className="font-display mt-2 text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          {t("points_title")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
          {t("points_description")}
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {pointsSteps.map((s, index) => (
            <div
              key={s.id ?? `points-step-${index}`}
              className="rounded-2xl border border-border/70 bg-background/60 p-5 text-center"
            >
              <p className="font-display text-3xl text-primary">{index + 1}</p>
              <h3 className="font-cond mt-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
          {t("points_note")}
        </p>
      </section>

      {/* SOCIOS FUNDADORES */}
      <section className="mt-14 rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card px-6 py-12 text-center sm:px-10 sm:py-16">
        <p className="font-cond text-xs uppercase tracking-[0.35em] text-primary">
          {t("founders_eyebrow")}
        </p>
        <h2 className="font-display mx-auto mt-2 max-w-xl text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          {foundersTitle === CLUB_LANDING_DEFAULTS.founders_title ? (
            <>
              Sé <span className="text-gradient-fire">socio fundador</span>
            </>
          ) : (
            foundersTitle
          )}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
          {t("founders_description")}
        </p>

        <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2">
          {founderPerks.map((p) => (
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
            <span>{t("founders_quota_label")}</span>
            <span className="text-primary">
              {t("founders_remaining_label")} {foundersRemaining} de {foundersTotal}
            </span>
          </div>
        </div>

        <Link to="/club-pago" className="mt-8 inline-block">
          <Button size="lg" className="font-cond uppercase tracking-wide">
            <Star className="h-4 w-4" /> {t("founders_cta")}
          </Button>
        </Link>
      </section>

      {/* TESTIMONIOS */}
      <section className="mt-14">
        <p className="font-cond text-center text-xs uppercase tracking-[0.35em] text-primary">
          {t("testimonials_eyebrow")}
        </p>
        <h2 className="font-display mt-2 text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          {t("testimonials_title")}
        </h2>
        {testimonialsNote.trim() && (
          <p className="mt-2 text-center text-xs italic text-muted-foreground">
            {testimonialsNote}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {testimonials.map((t) => (
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
              {t("guarantee_title")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("guarantee_body")}</p>
          </div>
        </div>
      </section>

      {/* SUSCRIPCIÓN */}
      <section
        id="suscribirse"
        className="mt-14 scroll-mt-24 rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-10"
      >
        <p className="font-cond text-center text-xs uppercase tracking-[0.35em] text-primary">
          {t("membership_eyebrow")}
        </p>
        <h2 className="font-display mt-2 text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          {t("membership_title")}
        </h2>

        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border bg-background/70 p-6 text-center">
          <p className="text-xs text-muted-foreground">{t("membership_course_intro")}</p>
          <p className="font-display mt-3 text-5xl text-foreground">
            {annualPrice}
            <span className="text-lg text-muted-foreground"> {t("membership_period_label")}</span>
          </p>
          <div className="mt-4 space-y-2 text-sm text-foreground/90">
            <p>{t("membership_price_caption")}</p>
            <p className="text-muted-foreground">
              Precio real luego: {regularPrice} {CURRENCY} anual
            </p>
          </div>

          <ul className="mt-6 space-y-2.5 text-left text-sm text-muted-foreground">
            {membershipPerks.map((perk) => (
              <li key={perk.id ?? perk.text} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{perk.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7">
            {!session ? (
              <div className="space-y-3">
                <Link to="/club-pago" className="block">
                  <Button className="w-full font-cond uppercase tracking-wide">
                    <Flame className="h-4 w-4" /> Suscribirme · Elegir método de pago
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground">
                  Primero crea tu cuenta; el acceso se activa después de verificar el pago.
                </p>
              </div>
            ) : isMember ? (
              <div className="rounded-xl border border-border/70 bg-card p-4 text-sm text-muted-foreground">
                <p className="font-display text-lg uppercase tracking-wide text-foreground">
                  Tu membresía está activa
                </p>
                <p className="mt-1">
                  Disfruta de todos los beneficios. Tienes {profile?.points ?? 0} Puntos de Brasa.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Link to="/club-pago" className="block">
                  <Button className="w-full font-cond uppercase tracking-wide">
                    {hasPendingMembership ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <Flame className="h-4 w-4" />
                    )}
                    {hasPendingMembership ? "Ver estado del pago" : "Suscribirme"}
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground">
                  Tras enviar el comprobante, el administrador verificará el pago antes de activar
                  tu membresía.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-14">
        <p className="font-cond text-center text-xs uppercase tracking-[0.35em] text-primary">
          {t("faq_eyebrow")}
        </p>
        <h2 className="font-display mt-2 text-center text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          {t("faq_title")}
        </h2>

        <Accordion type="single" collapsible className="mx-auto mt-8 max-w-2xl space-y-3">
          {faqs.map((f) => (
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
          src={img("footer_logo", logo)}
          alt={t("footer_logo_alt")}
          width={40}
          height={40}
          className="mx-auto h-10 w-10 rounded-xl object-cover ring-1 ring-primary/40"
        />
        <p className="font-display mt-3 text-xl uppercase tracking-wide text-foreground">
          {t("footer_brand")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("hero_brand")} · {t("footer_location")} · {t("footer_website")}
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
