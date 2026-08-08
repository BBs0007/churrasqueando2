import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { adminListRequests, adminReviewRequest, getMyClub } from "@/lib/club.functions";
import { ClubShell } from "@/components/ClubShell";
import { Button } from "@/components/ui/button";
import { CURRENCY } from "@/data/products";

export const Route = createFileRoute("/_authenticated/admin-club")({
  head: () => ({
    meta: [
      { title: "Solicitudes del Club · Churrasqueando" },
      {
        name: "description",
        content: "Panel interno para aprobar pagos y activar membresías del Club Churrasqueando.",
      },
      { property: "og:title", content: "Solicitudes del Club · Churrasqueando" },
      { property: "og:description", content: "Aprobación manual de membresías del Club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminClub,
});

function AdminClub() {
  const fetchClub = useServerFn(getMyClub);
  const fetchRequests = useServerFn(adminListRequests);
  const review = useServerFn(adminReviewRequest);
  const queryClient = useQueryClient();

  const me = useQuery({ queryKey: ["club", "me"], queryFn: () => fetchClub() });
  const requests = useQuery({
    queryKey: ["club", "admin-requests"],
    queryFn: () => fetchRequests(),
    enabled: !!me.data?.isAdmin,
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; approve: boolean }) => review({ data: vars }),
    onSuccess: () => {
      toast.success("Solicitud actualizada");
      queryClient.invalidateQueries({ queryKey: ["club"] });
    },
    onError: () => toast.error("No se pudo actualizar la solicitud"),
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

  return (
    <ClubShell points={me.data.profile.points} isMember={me.data.isMember} isAdmin>
      <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">
        Solicitudes de membresía
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Aprueba una solicitud para activar la membresía por 1 mes.
      </p>

      {requests.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (requests.data ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No hay solicitudes por ahora.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {(requests.data ?? []).map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-cond text-sm font-semibold uppercase tracking-wide text-foreground">
                  {r.profile?.full_name || r.profile?.email || r.user_id}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.profile?.email} · {r.profile?.phone || "sin teléfono"} ·{" "}
                  {new Date(r.created_at).toLocaleString("es-BO")}
                </p>
                <p className="text-xs text-primary">
                  {Number(r.amount).toFixed(2)} {CURRENCY} · {r.plan} · {r.status}
                </p>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ id: r.id, approve: true })}
                    className="font-cond uppercase tracking-wide"
                  >
                    <Check className="h-3.5 w-3.5" /> Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ id: r.id, approve: false })}
                    className="font-cond uppercase tracking-wide"
                  >
                    <X className="h-3.5 w-3.5" /> Rechazar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </ClubShell>
  );
}
