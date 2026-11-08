import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, KeyRound, Loader2, Search, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { getMyClub } from "@/lib/club.functions";
import {
  adminChangeAccountPassword,
  adminListAuthAccounts,
  type AdminAuthAccount,
} from "@/lib/customers.functions";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin-cuentas")({
  head: () => ({
    meta: [
      { title: "Cuentas y contraseñas · Admin · Churrasqueando" },
      {
        name: "description",
        content: "Administra las contraseñas de las cuentas de clientes y administradores.",
      },
    ],
  }),
  component: AdminCuentas,
});

function AdminCuentas() {
  const fetchClub = useServerFn(getMyClub);
  const fetchAccounts = useServerFn(adminListAuthAccounts);
  const changePassword = useServerFn(adminChangeAccountPassword);
  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const accounts = useQuery({
    queryKey: ["admin", "auth-accounts"],
    queryFn: () => fetchAccounts(),
    enabled: !!me.data?.isAdmin,
  });
  const [search, setSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<AdminAuthAccount | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const passwordMutation = useMutation({
    mutationFn: () => {
      if (!selectedAccount) throw new Error("Selecciona una cuenta");
      if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden");
      return changePassword({ data: { userId: selectedAccount.id, password } });
    },
    onSuccess: () => {
      toast.success(`Contraseña actualizada para ${selectedAccount?.email || "la cuenta"}`);
      closeDialog();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar la contraseña"),
  });

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const users = accounts.data ?? [];
    if (!query) return users;
    return users.filter(
      (account) =>
        account.email.toLocaleLowerCase().includes(query) ||
        account.full_name.toLocaleLowerCase().includes(query) ||
        (account.role === "admin" ? "administrador" : "cliente").includes(query),
    );
  }, [accounts.data, search]);

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedAccount(null);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  const openDialog = (account: AdminAuthAccount) => {
    setSelectedAccount(account);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setDialogOpen(true);
  };

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
          Esta sección es solo para administradores.
        </p>
      </ClubShell>
    );
  }

  const passwordIsValid = password.length >= 12 && password.length <= 128;
  const passwordsMatch = password === confirmPassword;

  return (
    <ClubShell
      points={me.data.profile.points}
      isMember={me.data.isMember}
      isAdmin={me.data.isAdmin}
    >
      <main className="mx-auto max-w-6xl pb-10">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-2xl uppercase tracking-wide text-foreground sm:text-3xl">
                Cuentas y contraseñas
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Cambia la contraseña de cualquier cliente o administrador.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-cond text-sm font-bold uppercase tracking-wide text-foreground">
                Cuentas registradas
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {accounts.data
                  ? `${filteredAccounts.length} de ${accounts.data.length} cuentas`
                  : "Clientes y administradores, tengan o no membresía del Club."}
              </p>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, correo o tipo de cuenta"
                aria-label="Buscar cuentas"
                className="pl-9"
              />
            </div>
          </div>

          {accounts.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : accounts.isError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p role="alert" className="text-sm text-destructive">
                No se pudieron cargar las cuentas. Intenta nuevamente.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void accounts.refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <p className="rounded-xl border border-border bg-background/50 p-6 text-center text-sm text-muted-foreground">
              No hay cuentas que coincidan con la búsqueda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden sm:table-cell">Registro</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="min-w-52">
                      <p className="font-medium text-foreground">
                        {account.full_name || "Sin nombre"}
                      </p>
                      <p className="break-all text-xs text-muted-foreground">
                        {account.email || "Cuenta sin correo"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                          account.role === "admin"
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {account.role === "admin" ? (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        ) : (
                          <UserRound className="h-3.5 w-3.5" />
                        )}
                        {account.role === "admin" ? "Administrador" : "Cliente"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {new Date(account.created_at).toLocaleDateString("es-BO", {
                        dateStyle: "medium",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(account)}
                      >
                        <KeyRound className="h-4 w-4" />
                        <span className="hidden sm:inline">Cambiar contraseña</span>
                        <span className="sm:hidden">Cambiar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </main>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && !passwordMutation.isPending) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wide">
              Cambiar contraseña
            </DialogTitle>
            <DialogDescription>
              {selectedAccount?.full_name || selectedAccount?.email || "Cuenta seleccionada"}
              {selectedAccount?.email ? ` · ${selectedAccount.email}` : ""}
              <br />
              Esta acción reemplaza la contraseña de la cuenta inmediatamente. Comunica la nueva
              contraseña a la persona por un medio privado y seguro.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              passwordMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="account-new-password">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="account-new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Usa entre 12 y 128 caracteres.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-confirm-password">Confirmar contraseña</Label>
              <Input
                id="account-confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-destructive">Las contraseñas no coinciden.</p>
              )}
              {password && !passwordIsValid && (
                <p className="text-xs text-destructive">
                  La contraseña debe tener entre 12 y 128 caracteres.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={passwordMutation.isPending}
                onClick={closeDialog}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  passwordMutation.isPending ||
                  !passwordIsValid ||
                  !confirmPassword ||
                  !passwordsMatch
                }
              >
                {passwordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Actualizar contraseña
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ClubShell>
  );
}
