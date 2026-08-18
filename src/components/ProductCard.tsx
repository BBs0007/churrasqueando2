import { Plus, Check } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/data/products";
import { CURRENCY } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { getBaseKg } from "@/lib/units";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    const baseKg = getBaseKg(product.unit);
    addItem(product, baseKg ?? 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  return (
    <article className="group flex w-[260px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary/20">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            width={800}
            height={600}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-secondary/30 text-center">
            <span className="font-display text-2xl uppercase text-muted-foreground/70">
              Churrasqueando
            </span>
            <span className="font-cond text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60">
              Foto próximamente
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />

        <span className="font-cond absolute right-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
          {product.unit}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-cond text-lg font-semibold uppercase leading-tight tracking-wide text-foreground">
          {product.name}
        </h3>
        <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{product.description}</p>

        <div className="mt-2 flex items-center justify-between">
          <p className="font-display text-2xl text-foreground">
            {product.price}
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
