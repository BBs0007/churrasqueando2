import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { ProductCarousel } from "@/components/ProductCarousel";
import { ProductCard } from "@/components/ProductCard";
import { CombosSection } from "@/components/CombosSection";
import { CartDrawer } from "@/components/CartDrawer";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { bestSellers } from "@/data/products";
import { sections, getSectionCategories } from "@/data/sections";
import { BUSINESS } from "@/data/business";
import { Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

export const Route = createFileRoute("/tienda")({
  head: () => ({
    meta: [
      { title: "Tienda · Churrasqueando · Cortes, linguiças y combos" },
      {
        name: "description",
        content:
          "Compra en línea cortes de res, linguiças artesanales, matambres, combos y extras para tu churrasco. Entrega a domicilio o recojo en el local.",
      },
      { property: "og:title", content: "Tienda Churrasqueando" },
      {
        property: "og:description",
        content: "Cortes de res, productos Churrasqueando, combos y extras. Pide en línea.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TiendaPage,
});

function TiendaPage() {
  const bestRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <div className="mx-auto max-w-7xl space-y-12 px-4 pt-10">
          <div className="flex items-center gap-3">
            <Flame className="h-6 w-6 text-primary" />
            <h1 className="font-display text-3xl uppercase tracking-wide text-foreground sm:text-5xl">
              Tienda <span className="text-gradient-fire">Churrasqueando</span>
            </h1>
          </div>

          <section
            id="best-sellers"
            className="scroll-mt-28 rounded-3xl border border-primary/40 bg-[image:var(--gradient-ember)] p-5 shadow-fire sm:p-8"
          >
            <div className="mb-8 flex items-end justify-between gap-4 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <span className="h-8 w-1.5 rounded-full bg-gradient-fire" />
                <div>
                  <h2 className="font-display text-2xl uppercase tracking-wide text-foreground sm:text-4xl">
                    Best <span className="text-gradient-fire">Sellers</span>
                  </h2>
                  <p className="font-cond text-sm uppercase tracking-[0.2em] text-primary">
                    Los más pedidos por nuestros clientes
                  </p>
                </div>
              </div>
              <div className="hidden shrink-0 gap-2 sm:flex">
                <button
                  onClick={() => bestRef.current?.scrollBy({ left: -290, behavior: "smooth" })}
                  aria-label="Anterior"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => bestRef.current?.scrollBy({ left: 290, behavior: "smooth" })}
                  aria-label="Siguiente"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div
              ref={bestRef}
              className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
            >
              {bestSellers.map((p) => (
                <div key={p.id} className="snap-start">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>

          <section
            id="combos-seccion"
            className="scroll-mt-28 rounded-3xl border border-ember/40 bg-card/60 p-5 sm:p-8"
          >
            <div className="mb-8 flex items-center gap-3 border-b border-border/60 pb-4">
              <span className="h-8 w-1.5 rounded-full bg-gradient-fire" />
              <h2 className="font-display text-2xl uppercase tracking-wide text-foreground sm:text-4xl">
                Combos
              </h2>
            </div>
            <CombosSection />
          </section>
        </div>

        <div id="menu" className="mx-auto max-w-7xl space-y-12 px-4 py-14 scroll-mt-24">
          <div className="flex items-center gap-3">
            <Flame className="h-6 w-6 text-primary" />
            <h2 className="font-display text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
              Nuestro <span className="text-gradient-fire">menú</span>
            </h2>
          </div>

          {sections.map((section, i) => {
            const styles = [
              "border-primary/40 bg-[image:var(--gradient-ember)] shadow-fire",
              "border-ember/40 bg-card/60",
              "border-border bg-secondary/30",
            ];
            return (
              <section
                key={section.id}
                id={section.id}
                className={`scroll-mt-28 rounded-3xl border ${styles[i % styles.length]} p-5 sm:p-8`}
              >
                <div className="mb-8 flex items-center gap-3 border-b border-border/60 pb-4">
                  <span className="h-8 w-1.5 rounded-full bg-gradient-fire" />
                  <h3 className="font-display text-2xl uppercase tracking-wide text-foreground sm:text-4xl">
                    {section.title}
                  </h3>
                </div>
                <div className="space-y-12">
                  {getSectionCategories(section).map((c) => (
                    <ProductCarousel key={c.id} category={c} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-8 text-center">
          <p className="font-display text-2xl uppercase tracking-wide text-foreground">
            CHURRASQUEANDO
          </p>
          <p className="font-cond text-sm uppercase tracking-[0.3em] text-primary">
            Lo mejor para tu churrasco
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Churrasqueando · {BUSINESS.hours}
          </p>
        </div>
      </footer>

      <CartDrawer />
      <WhatsAppFab />
    </div>
  );
}
