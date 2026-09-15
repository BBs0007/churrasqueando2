import { Link, useNavigate } from "@tanstack/react-router";
import {
  LogOut,
  ShoppingBag,
  Shield,
  Star,
  Package,
  Users,
  Tag,
  LayoutGrid,
  Sparkles,
  GraduationCap,
  Receipt,
  MapPin,
  UtensilsCrossed,
  FileEdit,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
            {isMember && (
              <Link
                to="/cursos"
                className="font-cond inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <GraduationCap className="h-3.5 w-3.5" /> Cursos
              </Link>
            )}
            {isMember && (
              <Link
                to="/promociones"
                className="font-cond inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Sparkles className="h-3.5 w-3.5" /> Promociones del Club
              </Link>
            )}

            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="font-cond uppercase tracking-wide">
                    <LayoutGrid className="h-3.5 w-3.5" /> Panel Admin
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel className="font-cond text-[11px] uppercase tracking-wide text-muted-foreground">
                    Catálogo
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to="/admin-productos" className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5" /> Productos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin-cursos" className="flex items-center gap-2">
                      <GraduationCap className="h-3.5 w-3.5" /> Cursos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin-catering" className="flex items-center gap-2">
                      <UtensilsCrossed className="h-3.5 w-3.5" /> Catering
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin-tienda-seccion" className="flex items-center gap-2">
                      <LayoutGrid className="h-3.5 w-3.5" /> Tienda · Secciones
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="font-cond text-[11px] uppercase tracking-wide text-muted-foreground">
                    Ventas y clientes
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to="/admin-ventas" className="flex items-center gap-2">
                      <Receipt className="h-3.5 w-3.5" /> Ventas
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin-codigos" className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5" /> Códigos de descuento
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin-clientes" className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" /> Clientes
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="font-cond text-[11px] uppercase tracking-wide text-muted-foreground">
                    Club y configuración
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to="/admin-club-contenido" className="flex items-center gap-2">
                      <FileEdit className="h-3.5 w-3.5" /> Contenido de /club
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin-club" className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5" /> Membresías
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin-sucursales" className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" /> Puntos de venta
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Link to="/tienda">
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
