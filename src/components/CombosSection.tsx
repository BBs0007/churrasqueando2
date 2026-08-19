import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Check, Users } from "lucide-react";
import { combos, type Combo } from "@/data/combos";
import { CURRENCY } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";

function ComboCard({ combo }: { combo: Combo }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(combo, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  return (
    <article className="group flex w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-card transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-background">
        <img
          src={combo.image}
          alt={`Combo ${combo.name}`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="font-cond absolute left-2 top-2 flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-foreground backdrop-blur">
          <Users className="h-3 w-3 text-primary" /> {combo.people} personas
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-xl uppercase tracking-wide text-foreground">
          {combo.name}
        </h3>
        <ul className="flex-1 space-y-0.5 text-xs text-muted-foreground">
          {combo.items.map((it) => (
            <li key={it}>· {it}</li>
          ))}
        </ul>
        <div className="mt-2 flex items-center justify-between">
          <p className="font-display text-2xl text-foreground">
            {combo.price}
            <span className="ml-1 text-sm text-muted-foreground">{CURRENCY}</span>
          </p>
          <Button
            size="sm"
            onClick={handleAdd}
            className="font-cond font-semibold uppercase tracking-wide"
          >
            {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {added ? "Listo" : "Agregar"}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function CombosSection() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) =>
    scrollerRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });

  return (
    <section id="combos" className="scroll-mt-28">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl uppercase tracking-wide text-foreground sm:text-3xl">
            Combos
          </h2>
          <p className="font-cond text-sm uppercase tracking-[0.2em] text-primary">
            Packs armados para tu parrillada
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
        {combos.map((c) => (
          <ComboCard key={c.id} combo={c} />
        ))}
      </div>
    </section>
  );
}
