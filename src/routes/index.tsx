import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ProductCard } from "@/components/ProductCard";
import { SucursalesSection } from "@/components/SucursalesSection";
import { CartDrawer } from "@/components/CartDrawer";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { Button } from "@/components/ui/button";
import { bestSellers } from "@/data/products";
import { BUSINESS } from "@/data/business";
import {
  Flame,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Facebook,
  MessageCircle,
  Crown,
  Gift,
  GraduationCap,
  Percent,
  Users,
  ArrowRight,
  Store,
} from "lucide-react";
import { useRef } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Churrasqueando · Carnes, catering y Club Churrasqueando" },
      {
        name: "description",
        content:
          "La carne que tu parrilla está esperando. Compra en la tienda, reserva catering churrasquero, únete al Club y encuentra nuestros puntos de venta.",
      },
      { property: "og:title", content: "Churrasqueando · Momento que se saborean!" },
      {
        property: "og:description",
        content: "Tienda en línea, catering churrasquero, Club Churrasqueando y puntos de venta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const bestRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />

        <div className="mx-auto max-w-7xl space-y-12 px-4 pt-14">
          <section
            id="best-sellers"
            className="scroll-mt-28 rounded-3xl border border-primary/40 bg-[image:var(--gradient-ember)] p-5 shadow-fire sm:p-8"
          >
            <div className="mb-8 flex items-end justify-between gap-4 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <span className="h-8 w-1.5 rounded-full bg-gradient-fire" />
                <div>
                  <h2 className="font-display text-2xl uppercase tracking-wide text-foreground sm:text-4xl">
                    Best <span className="text-gradient-fire">Sellers</span>
                  </h2>
                  <p className="font-cond text-sm uppercase tracking-[0.2em] text-primary">
                    Los más pedidos por nuestros clientes
                  </p>
                </div>
              </div>
              <div className="hidden shrink-0 gap-2 sm:flex">
                <button
                  onClick={() => bestRef.current?.scrollBy({ left: -290, behavior: "smooth" })}
                  aria-label="Anterior"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => bestRef.current?.scrollBy({ left: 290, behavior: "smooth" })}
                  aria-label="Siguiente"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div
              ref={bestRef}
              className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
            >
              {bestSellers.map((p) => (
                <div key={p.id} className="snap-start">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <Button asChild size="lg" className="font-cond font-bold uppercase tracking-wide">
                <Link to="/tienda">
                  <Store className="h-5 w-5" /> Ver toda la tienda
                </Link>
              </Button>
            </div>
          </section>

          {/* Catering */}
          <section className="scroll-mt-28 overflow-hidden rounded-3xl border border-ember/40 bg-card/60 p-6 sm:p-10">
            <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-4">
                <span className="font-cond inline-flex items-center gap-2 rounded-full border border-primary/50 px-3 py-1 text-xs uppercase tracking-[0.25em] text-primary">
                  <Flame className="h-3.5 w-3.5" /> Eventos en casa
                </span>
                <h2 className="font-display text-3xl uppercase leading-tight tracking-wide text-foreground sm:text-5xl">
                  Reservar <span className="text-gradient-fire">catering churrasquero</span>
                </h2>
                <p className="max-w-xl text-muted-foreground">
                  Llevamos la parrilla, los cortes y al churrasquero a tu casa o evento. Paquetes
                  desde 17 personas, con opciones de linguiças, cortes premium y guarniciones.
                </p>
                <Button asChild size="lg" className="font-cond font-bold uppercase tracking-wide">
                  <Link to="/reservar-catering">
                    Reservar ahora <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
              <ul className="grid gap-3">
                {[
                  "Churrasquero profesional incluido",
                  "Cortes y linguiças de la casa",
                  "Paquetes para 17 personas o más",
                  "Cotización rápida por WhatsApp",
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/50 p-4"
                  >
                    <Users className="h-5 w-5 shrink-0 text-primary" />
                    <span className="font-cond text-sm uppercase tracking-wide text-foreground">
                      {t}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Club */}
          <section className="scroll-mt-28 rounded-3xl border border-primary/40 bg-[image:var(--gradient-ember)] p-6 shadow-fire sm:p-10">
            <div className="mb-8 flex items-center gap-3">
              <Crown className="h-6 w-6 text-primary" />
              <h2 className="font-display text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
                Club <span className="text-gradient-fire">Churrasqueando</span>
              </h2>
            </div>
            <p className="mb-8 max-w-2xl text-muted-foreground">
              Registro gratuito: acumula 1 punto por cada 10 Bs de compra y sigue tus pedidos.
              Activa la membresía por 50 Bs al mes y desbloquea todos los beneficios.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Benefit icon={<GraduationCap className="h-6 w-6" />} title="Cursos churrasqueros">
                Clases y guías exclusivas para dominar la parrilla.
              </Benefit>
              <Benefit icon={<Percent className="h-6 w-6" />} title="Descuentos de socio">
                Precios especiales en cortes, linguiças y combos.
              </Benefit>
              <Benefit icon={<Gift className="h-6 w-6" />} title="Canjes por puntos">
                Cambia tus puntos por productos y sorpresas.
              </Benefit>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="font-cond font-bold uppercase tracking-wide">
                <Link to="/club">Conocer el Club</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="font-cond font-bold uppercase tracking-wide"
              >
                <Link to="/cuenta">Mi cuenta</Link>
              </Button>
            </div>
          </section>
        </div>

        {/* Puntos de venta */}
        <SucursalesSection />

        {/* Redes sociales */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-14 text-center">
            <h2 className="font-display text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
              Síguenos en <span className="text-gradient-fire">redes</span>
            </h2>
            <p className="mt-2 text-muted-foreground">
              Promos, nuevos cortes y tips de parrilla todas las semanas.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Social
                href="https://www.instagram.com/churrasqueando"
                icon={<Instagram className="h-6 w-6" />}
                label="Instagram"
              />
              <Social
                href="https://www.facebook.com/churrasqueando"
                icon={<Facebook className="h-6 w-6" />}
                label="Facebook"
              />
              <Social
                href={`https://wa.me/${BUSINESS.whatsapp}`}
                icon={<MessageCircle className="h-6 w-6" />}
                label="WhatsApp"
              />
            </div>
          </div>
        </section>
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

function Benefit({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-border/70 bg-card p-5 text-left">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-fire text-primary-foreground">
        {icon}
      </div>
      <div>
        <h3 className="font-cond text-lg font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function Social({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4 transition-colors hover:border-primary"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-fire text-primary-foreground">
        {icon}
      </span>
      <span className="font-cond text-base font-semibold uppercase tracking-wide text-foreground">
        {label}
      </span>
    </a>
  );
}
