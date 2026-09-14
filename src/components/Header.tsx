import { Link, useRouterState } from "@tanstack/react-router";
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as { from?: string } });
  const isHome = pathname === "/";

  // Cuando el cliente entra a la Tienda desde su panel (Mi cuenta), el navbar
  // se muestra reducido: sin "Club Churrasqueando" ni "Puntos de ventas". Al
  // volver a la página principal, el navbar vuelve a mostrarse completo.
  const isDashboardTienda = pathname === "/tienda" && search?.from === "dashboard";
  const visibleNav = isDashboardTienda ? NAV.filter((item) => item.to !== "/club") : NAV;
  const showBranchesLink = !isDashboardTienda;

  const goToBranches = () => {
    const el = document.getElementById("puntos-de-venta");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logo}
            alt="Churrasqueando"
            width={48}
            height={48}
            className="h-11 w-11 rounded-lg object-cover ring-1 ring-primary/40"
          />
          <div className="leading-none">
            <p className="font-display text-xl tracking-wide text-foreground">CHURRASQUEANDO</p>
            <p className="font-cond text-xs uppercase tracking-[0.3em] text-primary">MOMENTO QUE SE SABOREAN!</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {visibleNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="font-cond rounded-full px-3 py-1.5 text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {item.label}
            </Link>
          ))}
          {showBranchesLink &&
            (isHome ? (
              <button
                onClick={goToBranches}
                className="font-cond rounded-full px-3 py-1.5 text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Puntos de ventas
              </button>
            ) : (
              <Link
                to="/"
                hash="puntos-de-venta"
                className="font-cond rounded-full px-3 py-1.5 text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Puntos de ventas
              </Link>
            ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(true)}
            className="relative font-cond font-semibold uppercase tracking-wide"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Pedido</span>
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground">
                {totalItems}
              </span>
            )}
          </Button>
          <Button asChild className="font-cond font-semibold uppercase tracking-wide">
            <Link to="/cuenta">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Club</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2 lg:hidden no-scrollbar">
        {visibleNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="font-cond shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-wide text-secondary-foreground"
          >
            {item.label}
          </Link>
        ))}
        {showBranchesLink && (
          <Link
            to="/"
            hash="puntos-de-venta"
            className="font-cond shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary-foreground"
          >
            Puntos de ventas
          </Link>
        )}
      </div>
    </header>
  );
}
