import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, ShoppingBag, Shield, Star } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-churrasqueando.png";
import { CLUB } from "@/lib/club";

export function ClubShell({
  children,
  points,
  isMember,
  isAdmin,
}: {
  children: React.ReactNode;
  points?: number;
  isMember?: boolean;
  isAdmin?: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="Churrasqueando"
              className="h-10 w-10 rounded-lg object-cover ring-1 ring-primary/40"
            />
            <div className="leading-none">
              <p className="font-display text-lg tracking-wide text-foreground">{CLUB.name}</p>
              <p className="font-cond text-[10px] uppercase tracking-[0.3em] text-primary">
                {isMember ? "Socio activo" : "Cuenta gratuita"}
              </p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-2">
            {typeof points === "number" && (
              <span className="font-cond inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
                <Star className="h-3.5 w-3.5 text-primary" /> {points} pts
              </span>
            )}
            <Link
              to="/cuenta"
              className="font-cond rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Mi cuenta
            </Link>
            <Link
              to="/club"
              className="font-cond rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Beneficios
            </Link>
            {isAdmin && (
              <Link
                to="/admin-club"
                className="font-cond inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Shield className="h-3.5 w-3.5" /> Admin
              </Link>
            )}
            <Link to="/">
              <Button variant="outline" size="sm" className="font-cond uppercase tracking-wide">
                <ShoppingBag className="h-3.5 w-3.5" /> Tienda
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="font-cond uppercase tracking-wide"
            >
              <LogOut className="h-3.5 w-3.5" /> Salir
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
