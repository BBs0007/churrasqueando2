import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Receipt, TrendingUp, Users, UserX } from "lucide-react";
import { getMyClub } from "@/lib/club.functions";
import { adminListSales } from "@/lib/sales.functions";
import { ClubShell } from "@/components/ClubShell";
import { Input } from "@/components/ui/input";
import { CURRENCY } from "@/data/products";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin-ventas")({
  head: () => ({
    meta: [
      { title: "Ventas · Admin · Churrasqueando" },
      {
        name: "description",
        content: "Pedidos realizados por la página y qué cliente los hizo.",
      },
    ],
  }),
  component: AdminVentas,
});

const DELIVERY_LABELS: Record<string, string> = {
  pickup: "Recojo en local",
  delivery: "Delivery",
  province: "Envío a provincia",
};

function AdminVentas() {
  const fetchClub = useServerFn(getMyClub);
  const fetchSales = useServerFn(adminListSales);

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const sales = useQuery({
    queryKey: ["admin", "sales"],
    queryFn: () => fetchSales(),
    enabled: !!me.data?.isAdmin,
  });

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const list = sales.data?.sales ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.customerName.toLowerCase().includes(q) ||
        s.customerPhone.toLowerCase().includes(q) ||
        (s.customerEmail ?? "").toLowerCase().includes(q),
    );
  }, [sales.data, search]);

  if (me.isLoading) {
    return (
      <ClubShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </ClubShell>
    );
  }

  if (!me.data?.isAdmin) {
    return (
      <ClubShell points={me.data?.profile.points} isMember={me.data?.isMember}>
        <h1 className="font-display text-2xl uppercase tracking-wide text-foreground">
          Acceso restringido
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección es solo para el equipo de Churrasqueando.
        </p>
      </ClubShell>
    );
  }

  const stats = sales.data?.stats;

  return (
    <ClubShell points={me.data.profile.points} isMember={me.data.isMember} isAdmin>
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">Ventas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pedidos realizados desde la página, con o sin cuenta, y qué cliente los hizo.
        </p>
      </div>

      {sales.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="font-cond flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-primary" /> Total vendido
              </p>
              <p className="font-display mt-2 text-2xl text-foreground">
                {(stats?.totalAmount ?? 0).toFixed(2)} {CURRENCY}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="font-cond flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                <Receipt className="h-3.5 w-3.5 text-primary" /> Pedidos
              </p>
              <p className="font-display mt-2 text-2xl text-foreground">{stats?.totalOrders ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="font-cond flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-primary" /> Con cuenta
              </p>
              <p className="font-display mt-2 text-2xl text-foreground">
                {stats?.registeredCustomers ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="font-cond flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                <UserX className="h-3.5 w-3.5 text-primary" /> Invitados
              </p>
              <p className="font-display mt-2 text-2xl text-foreground">{stats?.guestOrders ?? 0}</p>
            </div>
          </div>

          <div className="mt-6 relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, teléfono o correo"
              className="pl-9"
            />
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString("es-BO")}{" "}
                      {new Date(s.createdAt).toLocaleTimeString("es-BO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{s.customerName}</p>
                      <p className="text-xs text-muted-foreground">{s.customerPhone}</p>
                    </TableCell>
                    <TableCell>
                      {s.hasAccount ? (
                        <span className="font-cond rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                          Cliente registrado
                        </span>
                      ) : (
                        <span className="font-cond rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Invitado
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {DELIVERY_LABELS[s.deliveryType] ?? s.deliveryType}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">
                      {s.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                    </TableCell>
                    <TableCell className="font-display text-foreground">
                      {s.total.toFixed(2)} {CURRENCY}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No se encontraron ventas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </ClubShell>
  );
}
