import { Link, createFileRoute } from "@tanstack/react-router";
import { Flame, MessageCircle, ArrowLeft, Check, Info } from "lucide-react";
import { useState } from "react";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BUSINESS } from "@/data/business";
import {
  CATERING_MIN_PEOPLE,
  cateringNotes,
  cateringPackages,
  cateringPriceNote,
} from "@/data/catering";

export const Route = createFileRoute("/reservar-catering")({
  head: () => ({
    meta: [
      { title: "Catering Churrasquero · Churrasqueando" },
      {
        name: "description",
        content:
          "Catering churrasquero en Santa Cruz: picada, picada premium y plato servido desde 70 Bs por persona. Mínimo 17 personas. Reserva por WhatsApp.",
      },
      { property: "og:title", content: "Catering Churrasquero · Churrasqueando" },
      {
        property: "og:description",
        content:
          "Picada, picada premium y plato servido desde 70 Bs por persona. Parrillero incluido. Reserva tu evento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReservarCatering,
});

function ColumnList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-cond text-sm font-bold uppercase tracking-[0.18em] text-ember">{title}</p>
      <ol className="mt-2 space-y-1.5">
        {items.map((it, i) => (
          <li key={it} className="flex gap-2 text-sm text-muted-foreground">
            <span className="font-cond text-primary">{i + 1}.</span>
            <span>{it}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReservarCatering() {
  const [selectedId, setSelectedId] = useState(cateringPackages[0]!.id);
  const selected = cateringPackages.find((p) => p.id === selectedId) ?? cateringPackages[0]!;
  const selectedLabel = `${selected.name} ${selected.highlight ?? ""}`.trim() + ` — ${selected.price} Bs p/p`;

  const [form, setForm] = useState({
    name: "",
    guests: "",
    date: "",
    time: "",
    location: "",
    people: "",
    notes: "",
  });
  const [sent, setSent] = useState(false);

  const update =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = [
      "*RESERVA DE CATERING CHURRASQUERO* 🔥",
      "",
      `*Nombre completo:* ${form.name}`,
      `*Cantidad de personas:* ${form.guests}`,
      `*Tipo de churrasco:* ${selectedLabel}`,
      `*Día:* ${form.date}`,
      `*Hora para comer:* ${form.time}`,
      `*Ubicación:* ${form.location}`,
      `*Tipo de personas:* ${form.people}`,
      form.notes ? `*Notas:* ${form.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    window.open(`https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="relative mx-auto max-w-[1400px] px-4 py-10 sm:py-14">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al menú
        </Link>

        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-fire text-primary-foreground">
            <Flame className="h-6 w-6" />
          </span>
          <h1 className="font-display text-4xl uppercase leading-none tracking-[0.08em] text-foreground sm:text-6xl">
            CATERING <span className="text-gradient-fire">CHURRASQUERO</span>
          </h1>
          <p className="font-cond text-sm font-bold uppercase tracking-[0.25em] text-primary">
            Mínimo {CATERING_MIN_PEOPLE} personas
          </p>
        </div>

        {/* Layout 3 columnas: opciones / detalle / formulario */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_380px]">
          {/* Columna izquierda: opciones */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="font-cond mb-3 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
              Opciones de catering
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {cateringPackages.map((pkg) => {
                const active = pkg.id === selectedId;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedId(pkg.id)}
                    className={`min-w-[180px] rounded-2xl border p-4 text-left transition-all lg:min-w-0 ${
                      active
                        ? "border-primary bg-primary/10 shadow-card"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <p className="font-display text-lg uppercase leading-tight tracking-[0.06em] text-foreground">
                      {pkg.name}{" "}
                      {pkg.highlight && <span className="text-gradient-fire">{pkg.highlight}</span>}
                    </p>
                    <p className="font-cond mt-1 text-xs font-bold uppercase tracking-[0.2em] text-ember">
                      {pkg.price} Bs p/p
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="font-cond mt-4 text-xs font-bold uppercase leading-relaxed tracking-[0.12em] text-ember">
              * {cateringPriceNote}
            </p>
          </aside>

          {/* Columna central: detalle */}
          <section className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="font-display text-3xl uppercase tracking-[0.08em] text-foreground sm:text-4xl">
                  {selected.name}{" "}
                  {selected.highlight && <span className="text-gradient-fire">{selected.highlight}</span>}
                </h2>
                <p className="font-cond mt-1 text-xs font-bold uppercase tracking-[0.25em] text-ember">
                  {selected.portion}
                </p>
              </div>
              <div className="text-right">
                <p className="font-cond text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Precio x per.
                </p>
                <p className="font-display text-3xl tracking-wide text-foreground">{selected.price} Bs</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <p className="font-cond text-sm font-bold uppercase tracking-[0.2em] text-primary">
                Incluye:
                {selected.includesNote && (
                  <span className="ml-2 normal-case tracking-normal text-muted-foreground">
                    ({selected.includesNote})
                  </span>
                )}
              </p>

              {selected.picada && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-cond font-bold uppercase tracking-[0.2em] text-foreground">Picada: </span>
                  {selected.picada}
                </p>
              )}

              <div className="grid gap-6 sm:grid-cols-3">
                <ColumnList title="Cortes de carne" items={selected.cortes} />
                <ColumnList title="Guarniciones" items={selected.guarniciones} />
                <ColumnList title="Utencilios" items={selected.utencilios} />
              </div>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <h3 className="font-display text-xl uppercase tracking-wide text-foreground">
                Para confirmar el evento necesitamos
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  "Nombre completo",
                  "Cantidad de personas",
                  "Tipo de churrasco",
                  "Día",
                  "Hora para comer",
                  "Ubicación",
                  "Tipo de personas (mujeres, hombres, niños, mayores)",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-background/50 p-5">
              <p className="font-cond flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-primary">
                <Info className="h-4 w-4" /> Nota
              </p>
              <ol className="mt-3 space-y-2">
                {cateringNotes.map((n, i) => (
                  <li key={n} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="font-cond text-primary">{i + 1}.</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Columna derecha: formulario */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card lg:sticky lg:top-24 lg:self-start">
            {sent ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <MessageCircle className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-2xl uppercase tracking-wide text-foreground">
                    ¡Solicitud enviada!
                  </h3>
                  <p className="text-muted-foreground">
                    Te redirigimos a WhatsApp para que envíes tu solicitud. Te contactaremos pronto con la cotización.
                  </p>
                </div>
                <Button onClick={() => setSent(false)} variant="outline" className="font-cond uppercase tracking-wide">
                  Hacer otra solicitud
                </Button>
              </div>
            ) : (
              <form onSubmit={send} className="space-y-4">
                <div>
                  <h2 className="font-display text-2xl uppercase tracking-wide text-foreground">Reservar evento</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Paquete: <span className="text-foreground">{selectedLabel}</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="catering-name">Nombre completo</Label>
                  <Input
                    id="catering-name"
                    required
                    maxLength={100}
                    value={form.name}
                    onChange={update("name")}
                    placeholder="Tu nombre y apellido"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="catering-guests">Cantidad de personas</Label>
                  <Input
                    id="catering-guests"
                    required
                    type="number"
                    min={CATERING_MIN_PEOPLE}
                    value={form.guests}
                    onChange={update("guests")}
                    placeholder={`Mínimo ${CATERING_MIN_PEOPLE}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="catering-type">Tipo de churrasco</Label>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger id="catering-type">
                      <SelectValue placeholder="Elige un paquete" />
                    </SelectTrigger>
                    <SelectContent>
                      {cateringPackages.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {`${p.name} ${p.highlight ?? ""}`.trim()} — {p.price} Bs p/p
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="catering-date">Día</Label>
                    <Input id="catering-date" required type="date" value={form.date} onChange={update("date")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="catering-time">Hora para comer</Label>
                    <Input id="catering-time" required type="time" value={form.time} onChange={update("time")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="catering-location">Ubicación</Label>
                  <Input
                    id="catering-location"
                    required
                    maxLength={200}
                    value={form.location}
                    onChange={update("location")}
                    placeholder="Zona / dirección del evento"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="catering-people">Tipo de personas</Label>
                  <Input
                    id="catering-people"
                    required
                    maxLength={200}
                    value={form.people}
                    onChange={update("people")}
                    placeholder="Ej. 8 hombres, 6 mujeres, 3 niños"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="catering-notes">Notas (opcional)</Label>
                  <Textarea
                    id="catering-notes"
                    rows={3}
                    maxLength={1000}
                    value={form.notes}
                    onChange={update("notes")}
                    placeholder="Cortes preferidos, acompañamientos, restricciones, etc."
                  />
                </div>

                <Button type="submit" size="lg" className="w-full font-cond text-base font-bold uppercase tracking-wide">
                  <MessageCircle className="h-5 w-5" />
                  Enviar solicitud por WhatsApp
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Al enviar, te redirigiremos a WhatsApp para completar la reserva.
                </p>
              </form>
            )}
          </div>
        </div>
      </main>


      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-8 text-center">
          <p className="font-display text-2xl uppercase tracking-wide text-foreground">CHURRASQUEANDO</p>
          <p className="font-cond text-sm uppercase tracking-[0.3em] text-primary">Lo mejor para tu churrasco</p>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Churrasqueando</p>
        </div>
      </footer>
    </div>
  );
}
