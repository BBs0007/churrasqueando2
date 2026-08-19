import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Star, Package, UserCog, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { getMyClub, updateMyProfile } from "@/lib/club.functions";
import { CLUB } from "@/lib/club";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCY } from "@/data/products";

export const Route = createFileRoute("/_authenticated/cuenta")({
  head: () => ({
    meta: [
      { title: "Mi cuenta · Club Churrasqueando" },
      {
        name: "description",
        content: "Consulta tus puntos, tus compras y edita tus datos en el Club Churrasqueando.",
      },
      { property: "og:title", content: "Mi cuenta · Club Churrasqueando" },
      { property: "og:description", content: "Tus puntos, tus compras y tu perfil de socio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cuenta,
});

function Cuenta() {
  const fetchClub = useServerFn(getMyClub);
  const saveProfile = useServerFn(updateMyProfile);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["club", "me"],
    queryFn: () => fetchClub(),
  });

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const mutation = useMutation({
    mutationFn: (vars: { fullName: string; phone: string }) => saveProfile({ data: vars }),
    onSuccess: () => {
      toast.success("Datos actualizados");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["club", "me"] });
    },
    onError: () => toast.error("No se pudieron guardar los datos"),
  });

  const redeemable = useMemo(() => {
    const pts = data?.profile.points ?? 0;
    const blocks = Math.floor(pts / CLUB.redeemStep);
    return blocks * CLUB.redeemValueBs;
  }, [data?.profile.points]);

  if (isLoading || !data) {
    return (
      <ClubShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </ClubShell>
    );
  }

  const { profile, orders, transactions, isMember, isAdmin } = data;

  return (
    <ClubShell points={profile.points} isMember={isMember} isAdmin={isAdmin}>
      <h1 className="font-display text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
        Hola{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        1 punto por cada {CLUB.bsPerPoint} {CURRENCY} de compra. {CLUB.redeemStep} puntos ={" "}
        {CLUB.redeemValueBs} {CURRENCY} de descuento (solo socios activos).
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-cond text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Mis puntos
          </p>
          <p className="mt-2 flex items-center gap-2 font-display text-4xl text-primary">
            <Star className="h-7 w-7" /> {profile.points}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Equivalen a {redeemable} {CURRENCY} en descuentos
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-cond text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Mis compras
          </p>
          <p className="mt-2 flex items-center gap-2 font-display text-4xl text-foreground">
            <Package className="h-7 w-7 text-primary" /> {orders.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Pedidos registrados en tu cuenta</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-cond text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Membresía
          </p>
          <p className="mt-2 flex items-center gap-2 font-display text-2xl text-foreground">
            {isMember ? (
              <>
                <Unlock className="h-6 w-6 text-primary" /> Activa
              </>
            ) : (
              <>
                <Lock className="h-6 w-6 text-muted-foreground" /> Inactiva
              </>
            )}
          </p>
          {isMember && profile.membership_expires_at ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Vence el {new Date(profile.membership_expires_at).toLocaleDateString("es-BO")}
            </p>
          ) : (
            <Link to="/club" className="mt-2 inline-block text-xs text-primary hover:underline">
              Activar por {CLUB.monthlyPriceBs} {CURRENCY}/mes
            </Link>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl uppercase tracking-wide text-foreground">
              Mi perfil
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="font-cond uppercase tracking-wide"
              onClick={() => {
                setFullName(profile.full_name);
                setPhone(profile.phone);
                setEditing((v) => !v);
              }}
            >
              <UserCog className="h-3.5 w-3.5" /> {editing ? "Cancelar" : "Editar"}
            </Button>
          </div>

          {editing ? (
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate({ fullName, phone });
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input id="nombre" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tel">Teléfono / WhatsApp</Label>
                <Input id="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
              </div>
              <Button type="submit" disabled={mutation.isPending} className="font-cond uppercase tracking-wide">
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
              </Button>
            </form>
          ) : (
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Nombre</dt>
                <dd className="text-foreground">{profile.full_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Correo</dt>
                <dd className="text-foreground">{profile.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Teléfono</dt>
                <dd className="text-foreground">{profile.phone || "—"}</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-xl uppercase tracking-wide text-foreground">
            Mis compras
          </h2>
          {orders.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Todavía no tienes compras registradas. Los pedidos que hagas con tu cuenta abierta se
              guardan aquí y suman puntos automáticamente.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {orders.map((o) => (
                <li key={o.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-cond text-sm font-semibold uppercase tracking-wide text-foreground">
                      {new Date(o.created_at).toLocaleDateString("es-BO")} ·{" "}
                      {o.delivery_type === "pickup"
                        ? "Recojo en local"
                        : o.delivery_type === "province"
                          ? "Envío a provincia"
                          : "Delivery"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg text-foreground">
                      {Number(o.total).toFixed(2)} {CURRENCY}
                    </p>
                    <p className="text-xs text-primary">+{o.points_earned} pts</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {transactions.length > 0 && (
            <>
              <h3 className="font-cond mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Movimiento de puntos
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {transactions.slice(0, 8).map((t) => (
                  <li key={t.id} className="flex justify-between text-muted-foreground">
                    <span>
                      {new Date(t.created_at).toLocaleDateString("es-BO")} · {t.reason}
                    </span>
                    <span className={t.points >= 0 ? "text-primary" : "text-destructive"}>
                      {t.points >= 0 ? "+" : ""}
                      {t.points}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </ClubShell>
  );
}
