import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, X } from "lucide-react";
import { Header } from "@/components/Header";
import { ProductCarousel } from "@/components/ProductCarousel";
import { ProductCard } from "@/components/ProductCard";
import { CombosSection } from "@/components/CombosSection";
import { CartDrawer } from "@/components/CartDrawer";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { getStoreCatalog } from "@/lib/catalog.functions";
import { BUSINESS } from "@/data/business";
import { Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

export const Route = createFileRoute("/tienda")({
  validateSearch: (search: Record<string, unknown>): { from?: string } => ({
    from: typeof search.from === "string" ? search.from : undefined,
  }),
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
  const fetchCatalog = useServerFn(getStoreCatalog);
  const catalog = useQuery({ queryKey: ["store-catalog"], queryFn: () => fetchCatalog() });
  const bestSellers = catalog.data?.bestSellers ?? [];
  const categories = catalog.data?.categories ?? [];
  const layout = catalog.data?.layout ?? [];
  const combos = catalog.data?.combos ?? [];

  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!query) return [];
    return categories
      .flatMap((c) => c.products)
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query),
      );
  }, [categories, query]);

  if (catalog.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const styles = [
    "border-primary/40 bg-[image:var(--gradient-ember)] shadow-fire",
    "border-ember/40 bg-card/60",
    "border-border bg-secondary/30",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <div className="mx-auto max-w-7xl space-y-6 px-4 pt-10">
          <div className="flex items-center gap-3">
            <Flame className="h-6 w-6 text-primary" />
            <h1 className="font-display text-3xl uppercase tracking-wide text-foreground sm:text-5xl">
              Tienda <span className="text-gradient-fire">Churrasqueando</span>
            </h1>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos…"
              className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-10 text-sm text-foreground outline-none ring-primary/40 placeholder:text-muted-foreground focus:ring-2"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {query ? (
          <div className="mx-auto max-w-7xl px-4 py-10">
            <h2 className="font-display text-2xl uppercase tracking-wide text-foreground">
              {searchResults.length} resultado{searchResults.length === 1 ? "" : "s"} para "
              {search}"
            </h2>
            {searchResults.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No encontramos productos con ese nombre. Prueba con otra palabra.
              </p>
            ) : (
              <div className="mt-6 flex flex-wrap gap-4">
                {searchResults.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mx-auto max-w-7xl space-y-12 px-4 pt-6">
              {layout.map((block, i) => {
                if (block.kind === "best_sellers") {
                  if (bestSellers.length === 0) return null;
                  return (
                    <section
                      key={block.id}
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
                  );
                }

                if (block.kind === "combos") {
                  if (combos.length === 0) return null;
                  return (
                    <section
                      key={block.id}
                      id="combos-seccion"
                      className="scroll-mt-28 rounded-3xl border border-ember/40 bg-card/60 p-5 sm:p-8"
                    >
                      <div className="mb-8 flex items-center gap-3 border-b border-border/60 pb-4">
                        <span className="h-8 w-1.5 rounded-full bg-gradient-fire" />
                        <h2 className="font-display text-2xl uppercase tracking-wide text-foreground sm:text-4xl">
                          Combos
                        </h2>
                      </div>
                      <CombosSection combos={combos} />
                    </section>
                  );
                }

                const blockCategories = categories.filter((c) => c.section_id === block.id);
                if (blockCategories.length === 0) return null;
                return (
                  <section
                    key={block.id}
                    id={block.id}
                    className={`scroll-mt-28 rounded-3xl border ${styles[i % styles.length]} p-5 sm:p-8`}
                  >
                    <div className="mb-8 flex items-center gap-3 border-b border-border/60 pb-4">
                      <span className="h-8 w-1.5 rounded-full bg-gradient-fire" />
                      <h3 className="font-display text-2xl uppercase tracking-wide text-foreground sm:text-4xl">
                        {block.title}
                      </h3>
                    </div>
                    <div className="space-y-12">
                      {blockCategories.map((c) => (
                        <ProductCarousel key={c.id} category={c} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <div id="menu" className="mx-auto max-w-7xl px-4 py-4 scroll-mt-24" />
          </>
        )}
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
