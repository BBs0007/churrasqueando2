import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { CURRENCY } from "@/data/products";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { isKgProduct } from "@/lib/units";

export function CartDrawer() {
  const { items, isOpen, setOpen, setQuantity, removeItem, totalPrice, totalItems } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-display flex items-center gap-2 text-2xl uppercase tracking-wide">
            <ShoppingBag className="h-5 w-5 text-primary" /> Tu pedido
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
            <p className="font-cond text-lg uppercase tracking-wide text-muted-foreground">
              Tu carrito está vacío
            </p>
            <p className="text-sm text-muted-foreground">
              Agrega productos para hacer tu pedido.
            </p>
          </div>
        ) : (
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="flex gap-3 rounded-xl border border-border/70 bg-card p-2"
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-secondary/40 text-[10px] uppercase text-muted-foreground">
                    Sin foto
                  </div>
                )}

                <div className="flex flex-1 flex-col">
                  <p className="font-cond text-sm font-semibold uppercase leading-tight text-foreground">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {product.price} {CURRENCY} · {product.unit}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 rounded-full border border-border">
                      <button
                        aria-label="Quitar uno"
                        onClick={() => setQuantity(product.id, quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-foreground hover:bg-secondary"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-cond w-10 text-center text-sm font-semibold">
                        {quantity}{isKgProduct(product.unit) ? " kg" : ""}
                      </span>
                      <button
                        aria-label="Agregar uno"
                        onClick={() => setQuantity(product.id, quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-foreground hover:bg-secondary"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="font-display text-lg text-gradient-fire">
                      {product.price * quantity} {CURRENCY}
                    </span>
                  </div>
                </div>
                <button
                  aria-label="Eliminar"
                  onClick={() => removeItem(product.id)}
                  className="self-start text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <SheetFooter className="border-t border-border">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-cond uppercase tracking-wide text-muted-foreground">
                Total ({totalItems})
              </span>
              <span className="font-display text-2xl text-gradient-fire">
                {totalPrice} {CURRENCY}
              </span>
            </div>
            <Button asChild size="lg" className="font-cond w-full text-base font-bold uppercase tracking-wide">
              <Link to="/checkout" onClick={() => setOpen(false)}>
                Continuar con el pedido
              </Link>
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
