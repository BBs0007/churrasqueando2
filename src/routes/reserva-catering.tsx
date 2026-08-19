import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, MessageCircle } from "lucide-react";
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
} from "@/data/catering";

export const Route = createFileRoute("/reserva-catering")({
  head: () => ({
    meta: [
      { title: "Reserva tu Catering · Churrasqueando" },
      {
        name: "description",
        content:
          "Reserva tu catering churrasquero en Santa Cruz. Mínimo 17 personas. Cotización rápida por WhatsApp.",
      },
      { property: "og:title", content: "Reserva tu Catering · Churrasqueando" },
      {
        property: "og:description",
        content:
          "Catering churrasquero para tu evento. Mínimo 17 personas. Reserva por WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReservaCatering,
});

function ReservaCatering() {
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
          to="/reservar-catering"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a opciones de catering
        </Link>

        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-display text-4xl uppercase leading-none tracking-[0.08em] text-foreground sm:text-6xl">
            Reserva tu <span className="text-gradient-fire">evento</span>
          </h1>
          <p className="font-cond text-sm font-bold uppercase tracking-[0.25em] text-primary">
            Mínimo {CATERING_MIN_PEOPLE} personas
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_420px]">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
            <h2 className="font-display text-2xl uppercase tracking-wide text-foreground">
              Paquete seleccionado
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{selectedLabel}</p>
            <div className="mt-4 space-y-2">
              <p className="font-cond text-sm font-bold uppercase tracking-[0.2em] text-primary">Incluye:</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {selected.cortes.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> {c}
                  </li>
                ))}
                {selected.guarniciones.map((g) => (
                  <li key={g} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> {g}
                  </li>
                ))}
                {selected.utencilios.map((u) => (
                  <li key={u} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> {u}
                  </li>
                ))}
              </ul>
            </div>
          </section>

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

        <div className="mt-6 rounded-2xl border border-border bg-background/50 p-5">
          <p className="font-cond flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-primary">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" /> Nota
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
