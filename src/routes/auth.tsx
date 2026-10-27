import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Loader2, Mail, Lock, User, ArrowLeft, Flame, MapPin, Cake, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import { checkGoogleAccount, getMyClub, updateMyProfile } from "@/lib/club.functions";
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from "@/data/country-codes";
import logo from "@/assets/logo-churrasqueando.png";

type Mode = "login" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string; mode?: "login" | "signup"; oauth?: "google" } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    mode: search.mode === "signup" || search.mode === "login" ? search.mode : undefined,
    oauth: search.oauth === "google" ? "google" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ingresar al Club Churrasqueando" },
      {
        name: "description",
        content:
          "Crea tu cuenta gratis en Churrasqueando, gana Puntos de Brasa al completar videos y cursos, y accede a los beneficios del Club.",
      },
      { property: "og:title", content: "Ingresar al Club Churrasqueando" },
      {
        property: "og:description",
        content:
          "Registro gratuito, gana Puntos de Brasa aprendiendo y desbloquea beneficios del Club Churrasqueando.",
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
  const fetchClub = useServerFn(getMyClub);
  const checkGoogle = useServerFn(checkGoogleAccount);
  const saveProfile = useServerFn(updateMyProfile);

  const [mode, setMode] = useState<Mode>(search.mode ?? "login");
  const [checkingGoogleSession, setCheckingGoogleSession] = useState(search.oauth === "google");
  const [googleProfileRequired, setGoogleProfileRequired] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const authHandlingRef = useRef(false);

  useEffect(() => {
    let active = true;
    const handleSession = async (session: Session | null) => {
      if (!session) {
        if (active) setCheckingGoogleSession(false);
        return;
      }
      if (authHandlingRef.current) return;
      authHandlingRef.current = true;
      const provider = session.user.app_metadata.provider;
      if (provider === "google") {
        setEmail(session.user.email ?? "");
        const metadataName = session.user.user_metadata.full_name;
        if (typeof metadataName === "string") setFullName(metadataName);
        setLoading(true);
        try {
          const intent = search.mode === "signup" ? "signup" : "login";
          const account = await checkGoogle({ data: { intent } });
          if (intent === "login" && !account.registered) {
            await supabase.auth.signOut({ scope: "local" });
            if (active) {
              setMode("signup");
              setInfo("Todavía no tienes una cuenta. Regístrate con Google o con tu correo.");
              navigate({ to: "/auth", search: { mode: "signup", redirect: dest }, replace: true });
            }
            return;
          }
          if (account.registered && account.complete) {
            if (active) navigate({ to: dest, replace: true });
            return;
          }
          const club = await fetchClub();
          const profile = club.profile;
          if (!active) return;
          setFullName(profile.full_name || (typeof metadataName === "string" ? metadataName : ""));
          setPhone(profile.phone.replace(/^\+\d+\s*/, "").replace(/[^0-9]/g, ""));
          setAddress(profile.address);
          setBirthDate(profile.birth_date ?? "");
          const matchingCountry = COUNTRY_CODES.find((country) =>
            profile.phone.startsWith(country.dial),
          );
          if (matchingCountry) setCountryCode(matchingCountry.code);
          setMode("signup");
          setGoogleProfileRequired(true);
          setInfo(
            "Tu cuenta de Google ya está verificada. Completa tus datos de contacto para continuar.",
          );
        } catch (error) {
          if (active) {
            toast.error(error instanceof Error ? error.message : "No se pudo cargar tu perfil");
            authHandlingRef.current = false;
          }
        } finally {
          if (active) {
            setLoading(false);
            setCheckingGoogleSession(false);
          }
        }
        return;
      }
      if (session) {
        setCheckingGoogleSession(false);
        navigate({ to: dest, replace: true });
      }
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        toast.error(error.message);
        setCheckingGoogleSession(false);
        return;
      }
      void handleSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        void handleSession(session);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [checkGoogle, dest, fetchClub, navigate, search.mode]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setInfo(null);
    try {
      if (googleProfileRequired) {
        const dial = COUNTRY_CODES.find((c) => c.code === countryCode)?.dial ?? "+591";
        await saveProfile({
          data: {
            fullName: fullName.trim(),
            phone: `${dial} ${phone.trim()}`,
            address: address.trim(),
            birthDate,
          },
        });
        setGoogleProfileRequired(false);
        navigate({ to: dest, replace: true });
      } else if (mode === "forgot") {
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
      const redirectTo = new URL("/auth", window.location.origin);
      redirectTo.searchParams.set("mode", mode === "signup" ? "signup" : "login");
      redirectTo.searchParams.set("oauth", "google");
      redirectTo.searchParams.set("redirect", dest);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo.toString() },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo iniciar sesión con Google");
      setLoading(false);
    }
  };

  if (checkingGoogleSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Verificando tu cuenta de Google...</span>
        </div>
      </div>
    );
  }

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
            <img
              src={logo}
              alt="Churrasqueando"
              className="h-12 w-12 rounded-xl object-cover ring-1 ring-primary/40"
            />
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
              ? "Crea tu cuenta gratis y gana Puntos de Brasa completando videos y cursos del Club."
              : mode === "forgot"
                ? "Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña."
                : "Ingresa para ver tus Puntos de Brasa, tus compras y los beneficios del Club."}
          </p>

          {info && (
            <div className="mt-4 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
              {info}
            </div>
          )}

          {mode === "signup" && !googleProfileRequired && (
            <div className="mt-5 space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full font-cond uppercase tracking-wide"
              >
                Crear mi cuenta con Google
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Es más rápido. Después completarás tus datos de contacto.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="font-cond text-xs uppercase tracking-widest text-muted-foreground">
                  o regístrate con tu correo
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
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
            {googleProfileRequired ? (
              <div className="space-y-1.5">
                <Label>Correo de Google</Label>
                <div className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{email}</span>
                  <span className="ml-auto text-xs text-primary">Verificado</span>
                </div>
              </div>
            ) : (
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
            )}

            {mode === "login" && !googleProfileRequired && (
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-cond uppercase tracking-wide"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Flame className="h-4 w-4" />
              )}
              {mode === "signup"
                ? googleProfileRequired
                  ? "Guardar mis datos y continuar"
                  : "Crear mi cuenta"
                : mode === "forgot"
                  ? "Enviar enlace"
                  : "Ingresar"}
            </Button>
          </form>

          {mode !== "forgot" && !googleProfileRequired && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="font-cond text-xs uppercase tracking-widest text-muted-foreground">
                  o
                </span>
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
            {googleProfileRequired ? (
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  const { error } = await supabase.auth.signOut();
                  setLoading(false);
                  if (error) {
                    toast.error(error.message);
                    return;
                  }
                  authHandlingRef.current = false;
                  setGoogleProfileRequired(false);
                  setMode("login");
                  setInfo(null);
                }}
                className="text-muted-foreground underline-offset-4 hover:underline"
              >
                Cerrar sesión
              </button>
            ) : mode !== "login" ? (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary underline-offset-4 hover:underline"
              >
                Ya tengo cuenta, ingresar
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
