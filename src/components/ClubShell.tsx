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
  Gift,
  AlertCircle,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getMyClub } from "@/lib/club.functions";
import { useSession } from "@/hooks/useSession";
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
  const { session } = useSession();
  const fetchClub = useServerFn(getMyClub);
  const clubStatus = useQuery({
    queryKey: ["club", "me"],
    queryFn: () => fetchClub(),
    enabled: !!session && !isAdmin,
  });
  const hasPendingMembership = clubStatus.data?.requests.some(
    (request) => request.status === "pending",
  );

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-4">
          <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <img
              src={logo}
              alt="Churrasqueando"
              className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-primary/40 sm:h-10 sm:w-10"
            />
            <div className="min-w-0 leading-none">
              <p className="font-display truncate text-base tracking-wide text-foreground sm:text-lg">
                {CLUB.name}
              </p>
              <p className="font-cond truncate text-[9px] uppercase tracking-[0.2em] text-primary sm:text-[10px] sm:tracking-[0.3em]">
                {isMember ? "Socio activo" : "Cuenta gratuita"}
              </p>
            </div>
          </Link>

          <nav
            aria-label="Navegación del Club"
            className="no-scrollbar flex w-full max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:justify-end sm:gap-2 sm:overflow-visible sm:pb-0"
          >
            {typeof points === "number" && (
              <span
                aria-label={`${points} Puntos de Brasa`}
                title="Puntos de Brasa"
                className="font-cond inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-secondary-foreground sm:px-3"
              >
                <Star className="h-3.5 w-3.5 text-primary" /> {points} PB
              </span>
            )}
            <Link
              to="/cuenta"
              className="font-cond shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Mi cuenta
            </Link>
            {isMember && (
              <Link
                to="/cursos"
                className="font-cond inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <GraduationCap className="h-3.5 w-3.5" /> Cursos
              </Link>
            )}
            {isMember && (
              <Link
                to="/promociones"
                className="font-cond inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Sparkles className="h-3.5 w-3.5" /> Promociones del Club
              </Link>
            )}

            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0 font-cond uppercase tracking-wide"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Panel Admin
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 max-w-[calc(100vw-2rem)]">
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
                    <Link to="/admin-promociones" className="flex items-center gap-2">
                      <Gift className="h-3.5 w-3.5" /> Promociones (tienda socios)
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
                      <FileEdit className="h-3.5 w-3.5" /> Editar página del Club
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

            <Link to="/tienda" className="shrink-0">
              <Button variant="outline" size="sm" className="font-cond uppercase tracking-wide">
                <ShoppingBag className="h-3.5 w-3.5" /> Tienda
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="shrink-0 font-cond uppercase tracking-wide"
            >
              <LogOut className="h-3.5 w-3.5" /> Salir
            </Button>
          </nav>
        </div>
      </header>
      {hasPendingMembership && !clubStatus.data?.isMember && (
        <div className="border-b border-primary/30 bg-primary/10 px-4 py-3">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm text-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 text-primary" />
              Tu pago está pendiente de verificación. El contenido se habilitará cuando aprobemos tu
              membresía.
            </p>
            <Link
              to="/club-pago"
              className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
            >
              Ver estado
            </Link>
          </div>
        </div>
      )}
      <main className="mx-auto min-w-0 max-w-6xl px-3 py-6 sm:px-4 sm:py-8">{children}</main>
    </div>
  );
}
