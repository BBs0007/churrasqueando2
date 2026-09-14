import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Plus, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { getMyClub } from "@/lib/club.functions";
import {
  adminListBranches,
  adminUpsertBranch,
  adminDeleteBranch,
  type PublicBranch,
} from "@/lib/branches.functions";
import { ClubShell } from "@/components/ClubShell";
import { MapPicker } from "@/components/MapPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin-sucursales")({
  head: () => ({
    meta: [
      { title: "Puntos de venta · Admin · Churrasqueando" },
      {
        name: "description",
        content: "Panel interno para administrar los puntos de venta de Churrasqueando.",
      },
    ],
  }),
  component: AdminSucursales,
});

type FormState = {
  id?: string;
  name: string;
  address: string;
  city: string;
  lat: string;
  lng: string;
  active: boolean;
  sortOrder: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  address: "",
  city: "Santa Cruz de la Sierra",
  lat: "",
  lng: "",
  active: true,
  sortOrder: "0",
};

function AdminSucursales() {
  const fetchClub = useServerFn(getMyClub);
  const fetchBranches = useServerFn(adminListBranches);
  const upsert = useServerFn(adminUpsertBranch);
  const remove = useServerFn(adminDeleteBranch);
  const queryClient = useQueryClient();

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const branches = useQuery({
    queryKey: ["admin", "branches"],
    queryFn: () => fetchBranches(),
    enabled: !!me.data?.isAdmin,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<PublicBranch | null>(null);

  const upsertMutation = useMutation({
    mutationFn: (vars: FormState) =>
      upsert({
        data: {
          id: vars.id,
          name: vars.name,
          address: vars.address,
          city: vars.city,
          lat: Number(vars.lat),
          lng: Number(vars.lng),
          active: vars.active,
          sortOrder: Number(vars.sortOrder) || 0,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Punto de venta actualizado" : "Punto de venta creado");
      queryClient.invalidateQueries({ queryKey: ["admin", "branches"] });
      queryClient.invalidateQueries({ queryKey: ["public-branches"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo guardar el punto de venta"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Punto de venta eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin", "branches"] });
      queryClient.invalidateQueries({ queryKey: ["public-branches"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo eliminar el punto de venta"),
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (b: PublicBranch) => {
    setForm({
      id: b.id,
      name: b.name,
      address: b.address,
      city: b.city,
      lat: String(b.lat),
      lng: String(b.lng),
      active: b.active,
      sortOrder: String(b.sort_order),
    });
    setDialogOpen(true);
  };

  const mapValue =
    form.lat && form.lng && !Number.isNaN(Number(form.lat)) && !Number.isNaN(Number(form.lng))
      ? { lat: Number(form.lat), lng: Number(form.lng) }
      : null;

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

  const list = branches.data ?? [];

  return (
    <ClubShell points={me.data.profile.points} isMember={me.data.isMember} isAdmin>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">
            Puntos de venta
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {list.length} punto{list.length === 1 ? "" : "s"} · visibles en la sección "Puntos de
            venta" de la página principal.
          </p>
        </div>
        <Button onClick={openCreate} className="font-cond uppercase tracking-wide">
          <Plus className="h-4 w-4" /> Nuevo punto de venta
        </Button>
      </div>

      {branches.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium text-foreground">{b.name}</TableCell>
                  <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">
                    {b.address}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.city}</TableCell>
                  <TableCell>
                    {b.active ? (
                      <span className="font-cond rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        Visible
                      </span>
                    ) : (
                      <span className="font-cond rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Oculto
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(b)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    <MapPin className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                    Todavía no hay puntos de venta. Crea el primero.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar punto de venta" : "Nuevo punto de venta"}</DialogTitle>
            <DialogDescription>
              Toca el mapa para ubicar el punto exacto. Se mostrará en la página principal.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!mapValue) {
                toast.error("Selecciona la ubicación en el mapa");
                return;
              }
              upsertMutation.mutate(form);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="b-name">Nombre</Label>
              <Input
                id="b-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                maxLength={150}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="b-address">Dirección</Label>
                <Input
                  id="b-address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-city">Ciudad</Label>
                <Input
                  id="b-city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  maxLength={100}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Ubicación en el mapa</Label>
              <MapPicker
                value={mapValue}
                onChange={(v) =>
                  setForm((f) => ({ ...f, lat: String(v.lat), lng: String(v.lng) }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="b-sort">Orden</Label>
                <Input
                  id="b-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                  id="b-active"
                />
                <Label htmlFor="b-active">Visible para los clientes</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={upsertMutation.isPending}
                className="font-cond uppercase tracking-wide"
              >
                {upsertMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este punto de venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Dejará de mostrarse en la página principal. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ClubShell>
  );
}
