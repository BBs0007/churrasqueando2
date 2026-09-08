import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Tag, Sparkles } from "lucide-react";
import { getMyClub } from "@/lib/club.functions";
import { getActivePromotions } from "@/lib/discounts.functions";
import { ClubShell } from "@/components/ClubShell";
import { CURRENCY } from "@/data/products";

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

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const promos = useQuery({
    queryKey: ["promotions"],
    queryFn: () => fetchPromos(),
    enabled: !!me.data,
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
    </ClubShell>
  );
}
