import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Tag, Sparkles, Gift, ImageOff, MessageCircle } from "lucide-react";
import { getMyClub } from "@/lib/club.functions";
import { getActivePromotions } from "@/lib/discounts.functions";
import { getPromoStore } from "@/lib/promotions.functions";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { CURRENCY } from "@/data/products";
import { CLUB } from "@/lib/club";

export const Route = createFileRoute("/_authenticated/promociones")({
  head: () => ({
    meta: [
      { title: "Promociones del Club · Churrasqueando" },
      {
        name: "description",
        content: "Descuentos y promociones activas exclusivas para socios del Club Churrasqueando.",
      },
    ],
  }),
  component: Promociones,
});

function Promociones() {
  const fetchClub = useServerFn(getMyClub);
  const fetchPromos = useServerFn(getActivePromotions);
  const fetchStore = useServerFn(getPromoStore);

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const promos = useQuery({
    queryKey: ["promotions"],
    queryFn: () => fetchPromos(),
    enabled: !!me.data,
  });
  const store = useQuery({
    queryKey: ["promo-store"],
    queryFn: () => fetchStore(),
    enabled: !!me.data?.isMember,
  });

  if (me.isLoading) {
    return (
      <ClubShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </ClubShell>
    );
  }

  if (!me.data?.isMember) {
    return (
      <ClubShell points={me.data?.profile.points} isMember={me.data?.isMember} isAdmin={me.data?.isAdmin}>
        <h1 className="font-display text-2xl uppercase tracking-wide text-foreground">
          Solo para socios del Club
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Activa tu membresía para ver las promociones exclusivas.
        </p>
      </ClubShell>
    );
  }

  const list = promos.data?.promotions ?? [];

  return (
    <ClubShell points={me.data.profile.points} isMember={me.data.isMember} isAdmin={me.data.isAdmin}>
      <h1 className="flex items-center gap-2 font-display text-3xl uppercase tracking-wide text-foreground">
        <Sparkles className="h-7 w-7 text-primary" /> Promociones del Club
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Descuentos activos para socios. Usa el código en tu pedido.
      </p>

      {promos.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Todavía no hay promociones activas. Vuelve pronto.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {list.map((p) => (
            <div key={p.id} className="rounded-2xl border border-primary/40 bg-card p-5">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <span className="font-cond text-lg font-bold uppercase tracking-widest text-primary">
                  {p.code}
                </span>
              </div>
              <p className="mt-2 font-display text-2xl text-foreground">
                {p.discount_type === "percentage" ? `${p.value}%` : `${p.value} ${CURRENCY}`} de
                descuento
              </p>
              {p.description && (
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              )}
              {(p.starts_at || p.ends_at) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {p.starts_at ? new Date(p.starts_at).toLocaleDateString("es-BO") : "Ya activa"}
                  {" – "}
                  {p.ends_at ? new Date(p.ends_at).toLocaleDateString("es-BO") : "Sin fecha límite"}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TIENDA DE PROMOCIONES */}
      <div className="mt-12">
        <h2 className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide text-foreground">
          <Gift className="h-6 w-6 text-primary" /> Tienda de Promociones
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Artículos y paquetes exclusivos para socios del {CLUB.name}. No están en la tienda
          principal.
        </p>

        {store.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {(store.data?.promotions.length ?? 0) > 0 && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {store.data!.promotions.map((p) => {
                  const displayPrice = p.price !== null ? p.price : p.itemsTotal;
                  const waMsg = encodeURIComponent(
                    `¡Hola Churrasqueando! Me interesa la promoción "${p.title}" (${displayPrice} ${CURRENCY}).`,
                  );
                  return (
                    <div key={p.id} className="overflow-hidden rounded-2xl border border-primary/40 bg-card">
                      <div className="aspect-video w-full bg-secondary">
                        {p.image ? (
                          <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Gift className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="font-display text-lg uppercase tracking-wide text-foreground">
                          {p.title}
                        </p>
                        {p.subtitle && <p className="text-xs text-muted-foreground">{p.subtitle}</p>}
                        {p.description && (
                          <p className="mt-1.5 text-sm text-muted-foreground">{p.description}</p>
                        )}
                        {p.items.length > 0 && (
                          <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                            {p.items.map((it) => (
                              <li key={it.id}>
                                {it.quantity}× {it.name}
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="font-display mt-3 text-xl text-primary">
                          {displayPrice} {CURRENCY}
                        </p>
                        <a href={`https://wa.me/59175358008?text=${waMsg}`} target="_blank" rel="noreferrer">
                          <Button size="sm" className="mt-3 w-full font-cond uppercase tracking-wide">
                            <MessageCircle className="h-3.5 w-3.5" /> Consultar por WhatsApp
                          </Button>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(store.data?.products.length ?? 0) > 0 && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {store.data!.products.map((p) => {
                  const waMsg = encodeURIComponent(
                    `¡Hola Churrasqueando! Me interesa "${p.name}" (${p.price} ${CURRENCY}).`,
                  );
                  return (
                    <div key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                      <div className="aspect-square w-full bg-secondary">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <ImageOff className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.unit}</p>
                        <p className="font-display mt-1 text-lg text-primary">
                          {p.price} {CURRENCY}
                        </p>
                        <a href={`https://wa.me/59175358008?text=${waMsg}`} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="mt-2 w-full font-cond uppercase tracking-wide">
                            <MessageCircle className="h-3.5 w-3.5" /> Consultar
                          </Button>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(store.data?.promotions.length ?? 0) === 0 && (store.data?.products.length ?? 0) === 0 && (
              <p className="mt-6 text-sm text-muted-foreground">
                Todavía no hay artículos en la tienda de promociones. Vuelve pronto.
              </p>
            )}
          </>
        )}
      </div>
    </ClubShell>
  );
}
