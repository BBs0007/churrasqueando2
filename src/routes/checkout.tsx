import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Store,
  Truck,
  CheckCircle2,
  MessageCircle,
  ShoppingBag,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { CURRENCY } from "@/data/products";
import { BUSINESS } from "@/data/business";
import { BOLIVIA, DEPARTAMENTOS } from "@/data/bolivia";
import { submitOrder, type OrderResult } from "@/lib/order.functions";
import { recordOrder } from "@/lib/club.functions";
import { supabase } from "@/integrations/supabase/client";
import { MapPicker, type LatLng } from "@/components/MapPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import logo from "@/assets/logo-churrasqueando.png";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar pedido · Churrasqueando" },
      { name: "description", content: "Completa tus datos y confirma tu pedido en Churrasqueando." },
    ],
  }),
  component: Checkout,
});

// En PC, wa.me redirige a api.whatsapp.com (a veces bloqueado). Usamos WhatsApp Web.
function buildWhatsappUrl(result: OrderResult): string {
  const phone = BUSINESS.whatsapp;
  const text = encodeURIComponent(result.message);
  const isMobile =
    typeof navigator !== "undefined" &&
    /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  return isMobile
    ? `https://wa.me/${phone}?text=${text}`
    : `https://web.whatsapp.com/send?phone=${phone}&text=${text}`;
}

function Checkout() {
  const { items, totalPrice, totalItems, clear } = useCart();
  const navigate = useNavigate();
  const submit = useServerFn(submitOrder);
  const saveOrder = useServerFn(recordOrder);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup" | "province">("delivery");
  const [location, setLocation] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("");
  const [department, setDepartment] = useState<string>("");
  const [province, setProvince] = useState<string>("");
  const [town, setTown] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderResult | null>(null);
  const [earnedPoints, setEarnedPoints] = useState<number | null>(null);

  const provincesList = useMemo(
    () => (department ? Object.keys(BOLIVIA[department] ?? {}) : []),
    [department],
  );
  const townsList = useMemo(
    () => (department && province ? BOLIVIA[department]?.[province] ?? [] : []),
    [department, province],
  );

  const canSubmit =
    name.trim() &&
    phone.trim().length >= 7 &&
    items.length > 0 &&
    (deliveryType === "pickup" ||
      (deliveryType === "delivery" && (location || address.trim())) ||
      (deliveryType === "province" && department && province && town));

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await submit({
        data: {
          customerName: name.trim(),
          customerPhone: phone.trim(),
          deliveryType,
          address:
            deliveryType === "delivery"
              ? address.trim()
              : deliveryType === "province"
                ? address.trim() || undefined
                : undefined,
          lat: deliveryType === "delivery" ? location?.lat : undefined,
          lng: deliveryType === "delivery" ? location?.lng : undefined,
          department: deliveryType === "province" ? department : undefined,
          province: deliveryType === "province" ? province : undefined,
          town: deliveryType === "province" ? town : undefined,
          notes: notes.trim() || undefined,
          items: items.map((i) => ({
            name: i.product.name,
            quantity: i.quantity,
            price: i.product.price,
            unit: i.product.unit,
          })),
          total: totalPrice,
        },
      });
      setResult(res);

      // Si el cliente tiene sesión, guardamos el pedido y sumamos sus puntos del Club.
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          const saved = await saveOrder({
            data: {
              customerName: name.trim(),
              customerPhone: phone.trim(),
              deliveryType,
              address: address.trim() || null,
              lat: deliveryType === "delivery" ? location?.lat ?? null : null,
              lng: deliveryType === "delivery" ? location?.lng ?? null : null,
              department: deliveryType === "province" ? department : null,
              province: deliveryType === "province" ? province : null,
              town: deliveryType === "province" ? town : null,
              notes: notes.trim() || null,
              items: items.map((i) => ({
                name: i.product.name,
                quantity: i.quantity,
                price: i.product.price,
                unit: i.product.unit,
              })),
              total: totalPrice,
            },
          });
          setEarnedPoints(saved.points);
        }
      } catch {
        /* el pedido por WhatsApp ya se envió; los puntos se pueden ajustar manualmente */
      }

      clear();
      if (!res.autoSent) {
        window.open(buildWhatsappUrl(res), "_blank");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <SuccessView
        result={result}
        earnedPoints={earnedPoints}
        onHome={() => navigate({ to: "/" })}
      />
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <ShoppingBag className="h-14 w-14 text-muted-foreground/50" />
        <h1 className="font-display text-2xl uppercase tracking-wide">Tu carrito está vacío</h1>
        <p className="text-muted-foreground">Agrega productos antes de finalizar tu pedido.</p>
        <Button asChild className="font-cond uppercase tracking-wide">
          <Link to="/">Ver el menú</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <img src={logo} alt="Churrasqueando" className="h-9 w-9 rounded-md object-cover" />
          <h1 className="font-display text-xl uppercase tracking-wide">Finalizar pedido</h1>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {/* Datos personales */}
          <Section title="1. Tus datos">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre completo</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">WhatsApp / Teléfono</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 591 7XXXXXXX"
                  inputMode="tel"
                  maxLength={20}
                />
              </div>
            </div>
          </Section>

          {/* Entrega */}
          <Section title="2. ¿Cómo lo quieres recibir?">
            <div className="grid gap-3 sm:grid-cols-3">
              <OptionCard
                active={deliveryType === "delivery"}
                onClick={() => setDeliveryType("delivery")}
                icon={<MapPin className="h-5 w-5" />}
                title="Entrega a domicilio"
                desc="Marca tu ubicación en el mapa"
              />
              <OptionCard
                active={deliveryType === "pickup"}
                onClick={() => setDeliveryType("pickup")}
                icon={<Store className="h-5 w-5" />}
                title="Recoger en el local"
                desc={BUSINESS.pickup.address}
              />
              <OptionCard
                active={deliveryType === "province"}
                onClick={() => setDeliveryType("province")}
                icon={<Truck className="h-5 w-5" />}
                title="Envíos a provincias"
                desc="Departamento, provincia y pueblo"
              />
            </div>

            {deliveryType === "delivery" && (
              <div className="mt-4 space-y-4">
                <MapPicker value={location} onChange={setLocation} />
                <div className="space-y-1.5">
                  <Label htmlFor="address">Referencia de la dirección</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, número, barrio, referencia..."
                    maxLength={160}
                  />
                </div>
              </div>
            )}

            {deliveryType === "pickup" && (
              <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                <p className="font-cond font-semibold uppercase tracking-wide text-foreground">
                  {BUSINESS.pickup.label}
                </p>
                <p>{BUSINESS.pickup.address}</p>
                <p className="mt-1">{BUSINESS.hours}</p>
              </div>
            )}

            {deliveryType === "province" && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Departamento</Label>
                    <Select
                      value={department}
                      onValueChange={(v) => {
                        setDepartment(v);
                        setProvince("");
                        setTown("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Elige departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTAMENTOS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Provincia</Label>
                    <Select
                      value={province}
                      onValueChange={(v) => {
                        setProvince(v);
                        setTown("");
                      }}
                      disabled={!department}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={department ? "Elige provincia" : "Elige departamento primero"} />
                      </SelectTrigger>
                      <SelectContent>
                        {provincesList.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Pueblo / Municipio</Label>
                    <Select
                      value={town}
                      onValueChange={setTown}
                      disabled={!province || townsList.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !province
                              ? "Elige provincia primero"
                              : townsList.length === 0
                                ? "Sin pueblos registrados"
                                : "Elige pueblo"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {townsList.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prov-ref">Referencia / Dirección exacta (opcional)</Label>
                  <Input
                    id="prov-ref"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Zona, calle, punto de referencia..."
                    maxLength={160}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Coordinaremos por WhatsApp el costo y la empresa de encomienda para tu envío.
                </p>
              </div>
            )}
          </Section>

          {/* Notas */}
          <Section title="3. Notas (opcional)">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="¿Algo que debamos saber? Ej: cantidad de carbón, hora de entrega..."
              maxLength={300}
              rows={3}
            />
          </Section>
        </div>

        {/* Resumen */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-xl uppercase tracking-wide">Resumen</h2>
            <div className="mt-4 space-y-3">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {quantity}x {product.name}
                  </span>
                  <span className="font-cond shrink-0 font-semibold">
                    {product.price * quantity} {CURRENCY}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="font-cond uppercase tracking-wide text-muted-foreground">
                Total ({totalItems})
              </span>
              <span className="font-display text-2xl text-gradient-fire">
                {totalPrice} {CURRENCY}
              </span>
            </div>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

            <Button
              size="lg"
              disabled={!canSubmit || loading}
              onClick={handleSubmit}
              className="font-cond mt-4 w-full text-base font-bold uppercase tracking-wide"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <MessageCircle className="h-5 w-5" />
              )}
              Confirmar pedido
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Te contactaremos por WhatsApp para coordinar el pago.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SuccessView({
  result,
  onHome,
  earnedPoints,
}: {
  result: OrderResult;
  onHome: () => void;
  earnedPoints: number | null;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-4 py-12 text-center">
      <CheckCircle2 className="h-16 w-16 text-primary" />
      <h1 className="font-display text-3xl uppercase tracking-wide">¡Pedido confirmado!</h1>
      <p className="max-w-md text-muted-foreground">
        {result.autoSent
          ? "Recibimos tu pedido. Te contactaremos por WhatsApp para coordinar el pago y la entrega."
          : "Abrimos WhatsApp con tu pedido. Envíalo y te contactaremos para coordinar el pago y la entrega."}
      </p>

      {earnedPoints !== null ? (
        <p className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
          Sumaste <span className="font-semibold text-primary">{earnedPoints} puntos</span> al Club
          Churrasqueando con esta compra.
        </p>
      ) : (
        <Link to="/auth" className="text-sm text-primary hover:underline">
          Crea tu cuenta gratis del Club y suma puntos con cada compra
        </Link>
      )}




      {!result.autoSent && (
        <Button asChild variant="outline" className="font-cond uppercase tracking-wide">
          <a href={buildWhatsappUrl(result)} target="_blank" rel="noreferrer">
            <MessageCircle className="h-4 w-4" /> Reenviar por WhatsApp
          </a>
        </Button>
      )}

      <Button onClick={onHome} className="font-cond uppercase tracking-wide">
        Volver al inicio
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display mb-3 text-lg uppercase tracking-wide text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function OptionCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          active ? "bg-gradient-fire text-primary-foreground" : "bg-secondary text-foreground"
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="font-cond font-semibold uppercase tracking-wide text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}
