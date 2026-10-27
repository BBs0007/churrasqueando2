import { Link, createFileRoute } from "@tanstack/react-router";
import { Flame, ArrowLeft, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CATERING_MIN_PEOPLE } from "@/data/catering";
import { getPublicCateringPackages } from "@/lib/catering.functions";
import { getClubContent } from "@/lib/club-content.functions";
import { CoursePageBuilderContent } from "@/components/CoursePageBuilder";
import { getCoursePageSections } from "@/lib/course-page-content";
import { CATERING_PAGE_DEFAULTS } from "@/lib/catering-page-content";
import picadaExample from "@/assets/real-punta-s-ch.jpg";
import premiumExample from "@/assets/real-cowboy-churras.jpg";
import servedExample from "@/assets/real-bife-chorizo-ch.jpg";
import servedPicadaExample from "@/assets/real-entrana-ch.jpg";

const CATERING_EXAMPLE_IMAGES = [picadaExample, premiumExample, servedExample, servedPicadaExample];

export const Route = createFileRoute("/reservar-catering")({
  head: () => ({
    meta: [
      { title: "Catering Churrasquero · Churrasqueando" },
      {
        name: "description",
        content:
          "Catering churrasquero en Santa Cruz: picada, picada premium y plato servido desde 70 Bs por persona. Mínimo 17 personas. Reserva por WhatsApp.",
      },
      { property: "og:title", content: "Catering Churrasquero · Churrasqueando" },
      {
        property: "og:description",
        content:
          "Picada, picada premium y plato servido desde 70 Bs por persona. Parrillero incluido. Reserva tu evento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReservarCatering,
});

function ColumnList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-cond text-sm font-bold uppercase tracking-[0.18em] text-ember">{title}</p>
      <ol className="mt-2 space-y-1.5">
        {items.map((it, i) => (
          <li key={it} className="flex gap-2 text-sm text-muted-foreground">
            <span className="font-cond text-primary">{i + 1}.</span>
            <span>{it}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReservarCatering() {
  const fetchPackages = useServerFn(getPublicCateringPackages);
  const fetchContent = useServerFn(getClubContent);
  const packages = useQuery({ queryKey: ["public-catering"], queryFn: () => fetchPackages() });
  const content = useQuery({ queryKey: ["club-content"], queryFn: () => fetchContent() });
  const cateringPackages = packages.data ?? [];
  const pageContent = { ...CATERING_PAGE_DEFAULTS, ...content.data };
  const pageSections = getCoursePageSections(pageContent.catering_page_builder);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedId && packages.data?.length) setSelectedId(packages.data[0].id);
  }, [packages.data, selectedId]);
  const selected = cateringPackages.find((p) => p.id === selectedId) ?? cateringPackages[0];
  const selectedIndex = selected ? cateringPackages.findIndex((pkg) => pkg.id === selected.id) : 0;
  const selectedImage =
    selected?.image_url ||
    CATERING_EXAMPLE_IMAGES[Math.max(selectedIndex, 0) % CATERING_EXAMPLE_IMAGES.length];

  if (packages.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-lg px-4 py-24 text-center text-sm text-muted-foreground">
          Todavía no hay paquetes de catering publicados.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="relative mx-auto max-w-[1400px] min-w-0 px-3 py-7 sm:px-4 sm:py-14">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {pageContent.catering_back_link}
        </Link>

        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-fire text-primary-foreground">
            <Flame className="h-6 w-6" />
          </span>
          <h1 className="font-display max-w-full break-words text-3xl uppercase leading-tight tracking-[0.04em] text-foreground sm:text-6xl sm:leading-none sm:tracking-[0.08em]">
            {pageContent.catering_page_title}
          </h1>
          <p className="font-cond text-sm font-bold uppercase tracking-[0.25em] text-primary">
            {pageContent.catering_page_subtitle.replace(/\{min\}/g, String(CATERING_MIN_PEOPLE))}
          </p>
        </div>

        {selectedImage && (
          <div className="mx-auto mt-6 aspect-video w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-card sm:mt-8">
            <img
              src={selectedImage}
              alt={`${selected.name} ${selected.highlight} · catering Churrasqueando${
                selected.image_url ? "" : " · imagen de ejemplo"
              }`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            {!selected.image_url && (
              <span className="sr-only">Imagen ilustrativa del paquete de catering</span>
            )}
          </div>
        )}

        <div className="mt-7 grid min-w-0 gap-4 sm:mt-10 sm:gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* Columna izquierda: opciones */}
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <p className="font-cond mb-3 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
              {pageContent.catering_options_label}
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {cateringPackages.map((pkg) => {
                const active = pkg.id === selectedId;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedId(pkg.id)}
                    className={`min-w-[155px] max-w-[230px] flex-1 rounded-2xl border p-3 text-left transition-all sm:min-w-[180px] sm:p-4 lg:min-w-0 ${
                      active
                        ? "border-primary bg-primary/10 shadow-card"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <p className="font-display text-base uppercase leading-tight tracking-[0.04em] text-foreground sm:text-lg sm:tracking-[0.06em]">
                      {pkg.name}{" "}
                      {pkg.highlight && <span className="text-gradient-fire">{pkg.highlight}</span>}
                    </p>
                    <p className="font-cond mt-1 text-xs font-bold uppercase tracking-[0.2em] text-ember">
                      {pkg.price} Bs p/p
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Columna central: detalle */}
          <section className="min-w-0 rounded-3xl border border-border bg-card p-4 shadow-card sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="font-display break-words text-2xl uppercase tracking-[0.05em] text-foreground sm:text-4xl sm:tracking-[0.08em]">
                  {selected.name}{" "}
                  {selected.highlight && (
                    <span className="text-gradient-fire">{selected.highlight}</span>
                  )}
                </h2>
                <p className="font-cond mt-1 text-xs font-bold uppercase tracking-[0.25em] text-ember">
                  {selected.portion}
                </p>
              </div>
              <div className="text-right">
                <p className="font-cond text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {pageContent.catering_price_label}
                </p>
                <p className="font-display text-3xl tracking-wide text-foreground">
                  {selected.price} Bs
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <p className="font-cond text-sm font-bold uppercase tracking-[0.2em] text-primary">
                {pageContent.catering_includes_label}
                {selected.includesNote && (
                  <span className="ml-2 normal-case tracking-normal text-muted-foreground">
                    ({selected.includesNote})
                  </span>
                )}
              </p>

              {selected.picada && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-cond font-bold uppercase tracking-[0.2em] text-foreground">
                    Picada:{" "}
                  </span>
                  {selected.picada}
                </p>
              )}

              <div className="grid gap-6 sm:grid-cols-3">
                <ColumnList title={pageContent.catering_cuts_label} items={selected.cortes} />
                <ColumnList
                  title={pageContent.catering_sides_label}
                  items={selected.guarniciones}
                />
                <ColumnList title={pageContent.catering_tools_label} items={selected.utencilios} />
              </div>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <h3 className="font-display text-2xl uppercase tracking-wide text-foreground">
                {pageContent.catering_booking_title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {pageContent.catering_booking_description}
              </p>
              <Button
                asChild
                size="lg"
                className="mt-4 font-cond font-bold uppercase tracking-wide"
              >
                <Link to="/reserva-catering">
                  {pageContent.catering_booking_button} <ArrowLeft className="h-5 w-5 rotate-180" />
                </Link>
              </Button>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-background/50 p-5">
              <p className="font-cond flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-primary">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />{" "}
                {pageContent.catering_notes_title}
              </p>
              <ol className="mt-3 space-y-2">
                {pageContent.catering_notes
                  .split("\n")
                  .filter(Boolean)
                  .map((n, i) => (
                    <li key={n} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="font-cond text-primary">{i + 1}.</span>
                      <span>{n}</span>
                    </li>
                  ))}
              </ol>
            </div>
          </section>
        </div>
        <div className="mt-10">
          <CoursePageBuilderContent sections={pageSections} />
        </div>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-8 text-center">
          <p className="font-display text-2xl uppercase tracking-wide text-foreground">
            {pageContent.catering_footer_brand}
          </p>
          <p className="font-cond text-sm uppercase tracking-[0.3em] text-primary">
            {pageContent.catering_footer_tagline}
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Churrasqueando
          </p>
        </div>
      </footer>
    </div>
  );
}
