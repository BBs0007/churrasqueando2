import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nueva contraseña · Churrasqueando" },
      { name: "description", content: "Crea una nueva contraseña para tu cuenta del Club Churrasqueando." },
      { property: "og:title", content: "Nueva contraseña · Churrasqueando" },
      { property: "og:description", content: "Restablece la contraseña de tu cuenta Churrasqueando." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setReady(true);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Contraseña actualizada");
      navigate({ to: "/cuenta", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 shadow-card">
        <h1 className="font-display text-2xl uppercase tracking-wide text-foreground">
          Nueva contraseña
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ready
            ? "Escribe tu nueva contraseña para tu cuenta del Club Churrasqueando."
            : "Abre este enlace desde el correo de recuperación que te enviamos."}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full font-cond uppercase tracking-wide">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar contraseña
          </Button>
        </form>
      </div>
    </div>
  );
}
