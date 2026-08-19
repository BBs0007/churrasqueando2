import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { SucursalesSection } from "@/components/SucursalesSection";
import { CartDrawer } from "@/components/CartDrawer";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { BUSINESS } from "@/data/business";

export const Route = createFileRoute("/sucursales")({
  head: () => ({
    meta: [
      { title: "Sucursales · Churrasqueando" },
      {
        name: "description",
        content:
          "Encuentra todas las sucursales de Churrasqueando en Santa Cruz y Montero. Ubicaciones en el mapa y cómo llegar.",
      },
      { property: "og:title", content: "Sucursales · Churrasqueando" },
      {
        property: "og:description",
        content: "Nuestros puntos de venta en el mapa. Encuentra el más cercano a ti.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SucursalesPage,
});

function SucursalesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <SucursalesSection />
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-8 text-center">
          <p className="font-display text-2xl uppercase tracking-wide text-foreground">
            CHURRASQUEANDO
          </p>
          <p className="font-cond text-sm uppercase tracking-[0.3em] text-primary">
            Lo mejor para tu churrasco
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Churrasqueando · {BUSINESS.hours}
          </p>
        </div>
      </footer>

      <CartDrawer />
      <WhatsAppFab />
    </div>
  );
}
