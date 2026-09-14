import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, Lock, User, ArrowLeft, Flame, MapPin, Cake, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CLUB } from "@/lib/club";
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from "@/data/country-codes";
import logo from "@/assets/logo-churrasqueando.png";

type Mode = "login" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ingresar al Club Churrasqueando" },
      {
        name: "description",
        content:
          "Crea tu cuenta gratis en Churrasqueando, acumula puntos con cada compra y accede a los beneficios del Club.",
      },
      { property: "og:title", content: "Ingresar al Club Churrasqueando" },
      {
        property: "og:description",
        content: "Registro gratuito, acumula puntos y desbloquea beneficios del Club Churrasqueando.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function safePath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/cuenta";
  return value;
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const dest = safePath(search.redirect);

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: dest, replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        navigate({ to: dest, replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [dest, navigate]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setInfo(null);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo("Te enviamos un correo para restablecer tu contraseña.");
      } else if (mode === "signup") {
        const dial = COUNTRY_CODES.find((c) => c.code === countryCode)?.dial ?? "+591";
        const fullPhone = `${dial} ${phone.trim()}`;
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${dest}`,
            data: {
              full_name: fullName.trim(),
              address: address.trim(),
              birth_date: birthDate || null,
              phone: fullPhone,
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo("¡Listo! Revisa tu correo y confirma tu cuenta para ingresar.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("No se pudo iniciar sesión con Google");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: dest, replace: true });
    } catch {
      toast.error("No se pudo iniciar sesión con Google");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="font-cond mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a la tienda
        </Link>

        <div className="rounded-3xl border border-border bg-card/80 p-6 shadow-card backdrop-blur sm:p-8">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Churrasqueando" className="h-12 w-12 rounded-xl object-cover ring-1 ring-primary/40" />
            <div>
              <h1 className="font-display text-2xl uppercase tracking-wide text-foreground">
                {CLUB.name}
              </h1>
              <p className="font-cond text-xs uppercase tracking-[0.25em] text-primary">
                Registro gratuito
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {mode === "signup"
              ? `Crea tu cuenta gratis y acumula 1 punto por cada ${CLUB.bsPerPoint} Bs de compra.`
              : mode === "forgot"
                ? "Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña."
                : "Ingresa para ver tus puntos, tus compras y los beneficios del Club."}
          </p>

          {info && (
            <div className="mt-4 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
              {info}
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="mt-5 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre"
                    className="pl-9"
                    required
                    maxLength={120}
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@mail.com"
                  className="pl-9"
                  required
                  maxLength={255}
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pl-9"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                  <div className="flex gap-2">
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger className="w-[110px] shrink-0" aria-label="Código de país">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CODES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.flag} {c.dial}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="Número sin el código"
                        className="pl-9"
                        required
                        maxLength={20}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Primero elige el código de tu país, luego escribe solo tu número.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Dirección</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Tu dirección"
                      className="pl-9"
                      required
                      maxLength={200}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="birthDate">Fecha de nacimiento</Label>
                  <div className="relative">
                    <Cake className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <Button type="submit" disabled={loading} className="w-full font-cond uppercase tracking-wide">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
              {mode === "signup" ? "Crear mi cuenta" : mode === "forgot" ? "Enviar enlace" : "Ingresar"}
            </Button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="font-cond text-xs uppercase tracking-widest text-muted-foreground">o</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full font-cond uppercase tracking-wide"
              >
                Continuar con Google
              </Button>
            </>
          )}

          <div className="mt-6 space-y-2 text-center text-sm">
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  No tengo cuenta, quiero registrarme
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-muted-foreground underline-offset-4 hover:underline"
                >
                  Olvidé mi contraseña
                </button>
              </>
            )}
            {mode !== "login" && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary underline-offset-4 hover:underline"
              >
                Ya tengo cuenta, ingresar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
