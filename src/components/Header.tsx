import { Link } from "@tanstack/react-router";
import { ShoppingBag, User } from "lucide-react";
import logo from "@/assets/logo-churrasqueando.png";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/tienda", label: "Tienda" },
  { to: "/reservar-catering", label: "Catering" },
  { to: "/club", label: "Club Churrasqueando" },
] as const;

export function Header() {
  const { totalItems, setOpen } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex min-w-0 max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img
            src={logo}
            alt="Churrasqueando"
            width={48}
            height={48}
            className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-primary/40 sm:h-11 sm:w-11"
          />
          <div className="min-w-0 leading-none">
            <p className="font-display truncate text-base tracking-wide text-foreground sm:text-xl">
              CHURRASQUEANDO
            </p>
            <p className="font-cond truncate text-[9px] uppercase tracking-[0.16em] text-primary sm:text-xs sm:tracking-[0.3em]">
              MOMENTO QUE SE SABOREAN!
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="font-cond rounded-full px-3 py-1.5 text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/puntos-de-venta"
            className="font-cond rounded-full px-3 py-1.5 text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "text-primary" }}
          >
            Puntos de ventas
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(true)}
            aria-label={`Abrir pedido${totalItems > 0 ? `, ${totalItems} productos` : ""}`}
            className="relative px-2 font-cond font-semibold uppercase tracking-wide sm:px-4"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Pedido</span>
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground">
                {totalItems}
              </span>
            )}
          </Button>
          <Button
            asChild
            aria-label="Mi cuenta del Club"
            className="px-2 font-cond font-semibold uppercase tracking-wide sm:px-4"
          >
            <Link to="/cuenta">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Club</span>
            </Link>
          </Button>
        </div>
      </div>

      <nav
        aria-label="Navegación principal"
        className="flex items-center gap-2 overflow-x-auto px-3 pb-2 sm:px-4 lg:hidden no-scrollbar"
      >
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="font-cond shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-wide text-secondary-foreground"
          >
            {item.label}
          </Link>
        ))}
        <Link
          to="/puntos-de-venta"
          className="font-cond shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary-foreground"
        >
          Puntos de ventas
        </Link>
      </nav>
    </header>
  );
}
