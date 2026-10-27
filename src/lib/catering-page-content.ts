import { cateringNotes } from "@/data/catering";

export const CATERING_PAGE_DEFAULTS: Record<string, string> = {
  catering_page_title: "CATERING CHURRASQUERO",
  catering_page_subtitle: "Mínimo {min} personas",
  catering_back_link: "Volver al menú",
  catering_options_label: "Opciones de catering",
  catering_price_label: "Precio x per.",
  catering_page_builder: "[]",
  catering_includes_label: "Incluye:",
  catering_cuts_label: "Cortes de carne",
  catering_sides_label: "Guarniciones",
  catering_tools_label: "Utensilios",
  catering_booking_title: "¿Desea reservar su evento?",
  catering_booking_description: "Haga su reserva y le enviaremos la cotización por WhatsApp.",
  catering_booking_button: "Reservar ahora",
  catering_notes_title: "Nota",
  catering_notes: cateringNotes.join("\n"),
  catering_footer_brand: "CHURRASQUEANDO",
  catering_footer_tagline: "Lo mejor para tu churrasco",
};

export function getCateringPageSections(value: string | undefined) {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}
