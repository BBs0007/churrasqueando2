import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Category } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";

export function ProductCarousel({ category }: { category: Category }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: number) => {
    scrollerRef.current?.scrollBy({ left: dir * 290, behavior: "smooth" });
  };

  return (
    <section id={category.id} className="scroll-mt-28">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl uppercase tracking-wide text-foreground sm:text-3xl">
            {category.name}
          </h2>
          <p className="font-cond text-sm uppercase tracking-[0.2em] text-primary">
            {category.tagline}
          </p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
      >
        {category.products.map((p) => (
          <div key={p.id} className="snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
