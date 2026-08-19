import { useState } from "react";
import { Flame, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS } from "@/data/business";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ParrilladaDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    date: "",
    time: "",
    guests: "",
    location: "",
    notes: "",
  });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = [
      "*Solicitud de servicio de parrillero* 🔥",
      "",
      `*Nombre:* ${form.name}`,
      `*Teléfono:* ${form.phone}`,
      `*Fecha:* ${form.date}`,
      `*Hora:* ${form.time}`,
      `*Nº de personas:* ${form.guests}`,
      `*Lugar del evento:* ${form.location}`,
      form.notes ? `*Notas:* ${form.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const url = `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-2xl uppercase tracking-wide">
            <Flame className="h-6 w-6 text-primary" />
            ¿Quieres hacer tu parrillada?
          </DialogTitle>
          <DialogDescription>
            Llevamos el churrasco a tu casa o evento. Nuestro parrillero se encarga de todo y tú
            disfrutas con tus invitados. Cuéntanos los detalles y te enviamos la cotización por
            WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={send} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pd-name">Nombre</Label>
              <Input id="pd-name" required value={form.name} onChange={update("name")} placeholder="Tu nombre" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pd-phone">Teléfono</Label>
              <Input id="pd-phone" required type="tel" value={form.phone} onChange={update("phone")} placeholder="Ej. 78228446" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pd-date">Fecha</Label>
              <Input id="pd-date" required type="date" value={form.date} onChange={update("date")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pd-time">Hora</Label>
              <Input id="pd-time" required type="time" value={form.time} onChange={update("time")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pd-guests">Nº de personas</Label>
              <Input id="pd-guests" required type="number" min={1} value={form.guests} onChange={update("guests")} placeholder="Ej. 20" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pd-location">Lugar del evento</Label>
              <Input id="pd-location" required value={form.location} onChange={update("location")} placeholder="Zona / dirección" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd-notes">Notas (opcional)</Label>
            <Textarea
              id="pd-notes"
              rows={3}
              value={form.notes}
              onChange={update("notes")}
              placeholder="Cortes preferidos, acompañamientos, restricciones, etc."
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="font-cond font-semibold uppercase tracking-wide">
              <MessageCircle className="h-4 w-4" />
              Enviar por WhatsApp
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
