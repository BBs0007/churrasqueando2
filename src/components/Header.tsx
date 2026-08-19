import { Link } from "@tanstack/react-router";
import { ShoppingBag, Flame, MapPin, ChevronDown, User } from "lucide-react";
import logo from "@/assets/logo-churrasqueando.png";
import { sections, getSectionCategories } from "@/data/sections";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";

export function Header() {
  const { totalItems, setOpen } = useCart();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
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
          <button
            onClick={() => scrollTo("best-sellers")}
            className="font-cond rounded-full px-3 py-1.5 text-sm font-medium uppercase tracking-wide text-primary transition-colors hover:bg-secondary"
          >
            Best Sellers
          </button>
          <button
            onClick={() => scrollTo("combos-seccion")}
            className="font-cond rounded-full px-3 py-1.5 text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Combos
          </button>
          {sections.map((section) => (
            <div key={section.id} className="group relative">
              <button
                onClick={() => scrollTo(section.id)}
                className="font-cond flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors group-hover:bg-secondary group-hover:text-foreground"
              >
                {section.title}
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
              </button>
              <div className="invisible absolute left-0 top-full z-50 min-w-64 translate-y-1 rounded-2xl border border-border bg-popover p-2 opacity-0 shadow-card transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                {getSectionCategories(section).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => scrollTo(c.id)}
                    className="flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-secondary"
                  >
                    <span className="font-cond text-sm font-semibold uppercase tracking-wide text-foreground">
                      {c.name}
                    </span>
                    <span className="text-xs text-primary">{c.tagline}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Link
            to="/sucursales"
            className="font-cond rounded-full px-3 py-1.5 text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            PUNTOS DE VENTAS
          </Link>
          <Link
            to="/cuenta"
            className="font-cond rounded-full px-3 py-1.5 text-sm font-medium uppercase tracking-wide text-primary transition-colors hover:bg-secondary"
          >
            CLUB
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/cuenta" className="lg:hidden">
            <Button variant="outline" size="icon" aria-label="Mi cuenta del Club">
              <User className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="default"
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
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2 lg:hidden no-scrollbar">
        <Flame className="h-4 w-4 shrink-0 text-primary" />
        <button
          onClick={() => scrollTo("best-sellers")}
          className="font-cond shrink-0 rounded-full bg-gradient-fire px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary-foreground"
        >
          Best Sellers
        </button>
        <button
          onClick={() => scrollTo("combos-seccion")}
          className="font-cond shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-wide text-secondary-foreground"
        >
          Combos
        </button>
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollTo(section.id)}
            className="font-cond shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-wide text-secondary-foreground"
          >
            {section.title}
          </button>
        ))}
        <Link
          to="/sucursales"
          className="font-cond flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary-foreground"
        >
          <MapPin className="h-3 w-3" /> PUNTOS DE VENTAS
        </Link>
      </div>
    </header>
  );
}
