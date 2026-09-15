import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { getMyClub } from "@/lib/club.functions";
import {
  adminListCateringPackages,
  adminUpsertCateringPackage,
  adminDeleteCateringPackage,
  type CateringPackage,
} from "@/lib/catering.functions";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CURRENCY } from "@/data/products";

export const Route = createFileRoute("/_authenticated/admin-catering")({
  head: () => ({
    meta: [
      { title: "Catering · Admin · Churrasqueando" },
      {
        name: "description",
        content: "Panel interno para administrar los paquetes de Catering Churrasquero.",
      },
    ],
  }),
  component: AdminCatering,
});

type FormState = {
  id?: string;
  name: string;
  highlight: string;
  price: string;
  portion: string;
  includesNote: string;
  picada: string;
  cortes: string;
  guarniciones: string;
  utencilios: string;
  active: boolean;
  sortOrder: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  highlight: "",
  price: "0",
  portion: "500 gr por persona",
  includesNote: "",
  picada: "",
  cortes: "",
  guarniciones: "",
  utencilios: "",
  active: true,
  sortOrder: "0",
};

function AdminCatering() {
  const fetchClub = useServerFn(getMyClub);
  const fetchPackages = useServerFn(adminListCateringPackages);
  const upsert = useServerFn(adminUpsertCateringPackage);
  const remove = useServerFn(adminDeleteCateringPackage);
  const queryClient = useQueryClient();

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const packages = useQuery({
    queryKey: ["admin", "catering"],
    queryFn: () => fetchPackages(),
    enabled: !!me.data?.isAdmin,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<CateringPackage | null>(null);

  const upsertMutation = useMutation({
    mutationFn: (vars: FormState) =>
      upsert({
        data: {
          id: vars.id,
          name: vars.name,
          highlight: vars.highlight,
          price: Number(vars.price) || 0,
          portion: vars.portion,
          includesNote: vars.includesNote,
          picada: vars.picada,
          cortes: vars.cortes.split("\n").map((c) => c.trim()).filter(Boolean),
          guarniciones: vars.guarniciones.split("\n").map((c) => c.trim()).filter(Boolean),
          utencilios: vars.utencilios.split("\n").map((c) => c.trim()).filter(Boolean),
          active: vars.active,
          sortOrder: Number(vars.sortOrder) || 0,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Paquete actualizado" : "Paquete creado");
      queryClient.invalidateQueries({ queryKey: ["admin", "catering"] });
      queryClient.invalidateQueries({ queryKey: ["public-catering"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo guardar el paquete"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Paquete eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin", "catering"] });
      queryClient.invalidateQueries({ queryKey: ["public-catering"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo eliminar el paquete"),
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (p: CateringPackage) => {
    setForm({
      id: p.id,
      name: p.name,
      highlight: p.highlight,
      price: String(p.price),
      portion: p.portion,
      includesNote: p.includesNote,
      picada: p.picada,
      cortes: p.cortes.join("\n"),
      guarniciones: p.guarniciones.join("\n"),
      utencilios: p.utencilios.join("\n"),
      active: p.active,
      sortOrder: String(p.sort_order),
    });
    setDialogOpen(true);
  };

  if (me.isLoading || !me.data) {
    return (
      <ClubShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </ClubShell>
    );
  }

  if (!me.data.isAdmin) {
    return (
      <ClubShell points={me.data.profile.points} isMember={me.data.isMember}>
        <h1 className="font-display text-2xl uppercase tracking-wide text-foreground">
          Acceso restringido
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección es solo para el equipo de Churrasqueando.
        </p>
      </ClubShell>
    );
  }

  const list = packages.data ?? [];

  return (
    <ClubShell points={me.data.profile.points} isMember={me.data.isMember} isAdmin>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">
            Paquetes de Catering
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {list.length} paquete{list.length === 1 ? "" : "s"} · visibles en /reservar-catering.
          </p>
        </div>
        <Button onClick={openCreate} className="font-cond uppercase tracking-wide">
          <Plus className="h-4 w-4" /> Nuevo paquete
        </Button>
      </div>

      {packages.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paquete</TableHead>
                <TableHead>Precio / persona</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">
                      {p.name}
                      {p.highlight && (
                        <span className="ml-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          {p.highlight}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.portion}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.price} {CURRENCY}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.sort_order}</TableCell>
                  <TableCell>
                    {p.active ? (
                      <span className="font-cond rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        Activo
                      </span>
                    ) : (
                      <span className="font-cond rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Oculto
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    <UtensilsCrossed className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                    Todavía no hay paquetes. Crea el primero.
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
            <DialogTitle>{form.id ? "Editar paquete" : "Nuevo paquete"}</DialogTitle>
            <DialogDescription>Se muestra en /reservar-catering para clientes.</DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              upsertMutation.mutate(form);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-name">Nombre</Label>
                <Input
                  id="p-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-highlight">Etiqueta (opcional)</Label>
                <Input
                  id="p-highlight"
                  value={form.highlight}
                  onChange={(e) => setForm((f) => ({ ...f, highlight: e.target.value }))}
                  placeholder="PREMIUM"
                  maxLength={40}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Precio por persona (Bs)</Label>
                <Input
                  id="p-price"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-portion">Porción</Label>
                <Input
                  id="p-portion"
                  value={form.portion}
                  onChange={(e) => setForm((f) => ({ ...f, portion: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-includes">Nota de "incluye" (opcional)</Label>
              <Input
                id="p-includes"
                value={form.includesNote}
                onChange={(e) => setForm((f) => ({ ...f, includesNote: e.target.value }))}
                placeholder="Todos los productos de Churrasqueando"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-picada">Detalle de picada (opcional)</Label>
              <Textarea
                id="p-picada"
                value={form.picada}
                onChange={(e) => setForm((f) => ({ ...f, picada: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cortes">Cortes (uno por línea)</Label>
              <Textarea
                id="p-cortes"
                value={form.cortes}
                onChange={(e) => setForm((f) => ({ ...f, cortes: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-guarniciones">Guarniciones (una por línea)</Label>
              <Textarea
                id="p-guarniciones"
                value={form.guarniciones}
                onChange={(e) => setForm((f) => ({ ...f, guarniciones: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-utencilios">Utensilios (uno por línea)</Label>
              <Textarea
                id="p-utencilios"
                value={form.utencilios}
                onChange={(e) => setForm((f) => ({ ...f, utencilios: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-sort">Orden</Label>
                <Input
                  id="p-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                  id="p-active"
                />
                <Label htmlFor="p-active">Visible para los clientes</Label>
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
            <AlertDialogTitle>¿Eliminar este paquete?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará de /reservar-catering. Esta acción no se puede deshacer.
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
