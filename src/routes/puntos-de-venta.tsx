import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CartDrawer } from "@/components/CartDrawer";
import { Header } from "@/components/Header";
import { SucursalesSection } from "@/components/SucursalesSection";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { getPublicBranches } from "@/lib/branches.functions";

export const Route = createFileRoute("/puntos-de-venta")({
  head: () => ({
    meta: [
      { title: "Puntos de venta · Churrasqueando" },
      {
        name: "description",
        content: "Encuentra nuestros puntos de venta y cómo llegar a cada sucursal.",
      },
    ],
  }),
  component: PuntosDeVentaPage,
});

function PuntosDeVentaPage() {
  const fetchBranches = useServerFn(getPublicBranches);
  const branches = useQuery({ queryKey: ["public-branches"], queryFn: () => fetchBranches() });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <SucursalesSection branches={branches.data ?? []} />
      </main>
      <CartDrawer />
      <WhatsAppFab />
    </div>
  );
}
