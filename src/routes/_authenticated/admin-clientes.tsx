import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Star, ShieldCheck } from "lucide-react";
import { getMyClub } from "@/lib/club.functions";
import { adminListCustomers } from "@/lib/customers.functions";
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

export const Route = createFileRoute("/_authenticated/admin-clientes")({
  head: () => ({
    meta: [
      { title: "Clientes · Admin · Churrasqueando" },
      { name: "description", content: "Listado de clientes y su estado de membresía del Club." },
    ],
  }),
  component: AdminClientes,
});

function AdminClientes() {
  const fetchClub = useServerFn(getMyClub);
  const fetchCustomers = useServerFn(adminListCustomers);

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const customers = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: () => fetchCustomers(),
    enabled: !!me.data?.isAdmin,
  });

  const [search, setSearch] = useState("");
  const [onlyMembers, setOnlyMembers] = useState(false);

  const filtered = useMemo(() => {
    let list = customers.data?.customers ?? [];
    if (onlyMembers) list = list.filter((c) => c.is_member);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q),
      );
    }
    return list;
  }, [customers.data, search, onlyMembers]);

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

  const memberCount = (customers.data?.customers ?? []).filter((c) => c.is_member).length;

  return (
    <ClubShell points={me.data.profile.points} isMember={me.data.isMember} isAdmin>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {customers.data?.customers.length ?? 0} clientes registrados · {memberCount} con
            membresía activa
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono"
            className="pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setOnlyMembers((v) => !v)}
          className={`font-cond inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
            onlyMembers
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Solo socios del club
        </button>
      </div>

      {customers.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Puntos</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Membresía</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">{c.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      Desde {new Date(c.created_at).toLocaleDateString("es-BO")}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <p>{c.email}</p>
                    <p>{c.phone || "—"}</p>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                    {c.address || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-primary" /> {c.points}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{c.orders_count}</TableCell>
                  <TableCell>
                    {c.is_member ? (
                      <span className="font-cond rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        Socio activo
                      </span>
                    ) : (
                      <span className="font-cond rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Sin membresía
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No se encontraron clientes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </ClubShell>
  );
}
