// Reglas del Club Churrasqueando (editables)
export const CLUB = {
  name: "Club Churrasqueando",
  // Acumulación de Puntos Brasa: 1 Bs de compra = 1 punto
  bsPerPoint: 10,
  // Vencimiento de puntos sin comprar
  pointsExpireMonths: 10,
  // Suscripción
  monthlyPriceBs: 89,
  annualPriceBs: 699,
  planLabel: "Mensual",
  singleCoursePriceBs: 250,
  coursesCount: 6,
  // Cupos de Socio Fundador
  founders: {
    total: 30,
    remaining: 12,
  },
};

// Oferta de lanzamiento para socios fundadores: 450 Bs anual
export const CLUB_LAUNCH_OFFER = {
  annualPriceBs: 450,
  realAnnualPriceBs: 699,
  monthlyActivePriceBs: 89,
};

export const CLUB_BENEFITS = [
  {
    id: "fundador",
    icon: "lock",
    title: "Precio de fundador",
    badge: null,
    description:
      "Los primeros socios entran con precio congelado de por vida. No vuelve a subir nunca — y si cancelás, lo perdés.",
  },
  {
    id: "merch",
    icon: "shirt",
    title: "Merch exclusivo",
    badge: "Nuevo",
    description:
      "Kit físico de marca (mandil y más) que solo tienen los socios fundadores. Estatus e identidad de la tribu.",
  },
  {
    id: "puntos-brasa",
    icon: "hand",
    title: "Puntos Brasa",
    badge: "Cambia",
    description:
      "Sumás puntos con cada compra en la tienda y los canjeás por linguiças, chorizos y productos artesanales.",
  },
  {
    id: "grabaciones",
    icon: "video",
    title: "Grabaciones en vivo",
    badge: "Nuevo",
    description:
      "Estás en el rodaje de los cursos, preguntás en tiempo real y sos parte de cómo se hace cada clase.",
  },
];

export const PUNTOS_BRASA_STEPS = [
  {
    id: "1",
    title: "Comprás en la tienda",
    description: "Cada 1 Bs de compra suma 1 Punto Brasa a tu cuenta de socio.",
  },
  {
    id: "2",
    title: "Sumás puntos",
    description: "Se acumulan solos. Ganás bonos por reseñas, referidos y tu cumpleaños.",
  },
  {
    id: "3",
    title: "Canjeás productos",
    description: "Cambiás tus puntos por linguiças, chorizos y combos artesanales Churrasqueando.",
  },
];

export const FOUNDER_PERKS = [
  { id: "precio", icon: "lock", label: "Precio congelado de por vida", strong: "congelado de por vida" },
  { id: "merch", icon: "award", label: "Merch exclusivo de fundador", strong: "exclusivo" },
  { id: "numero", icon: "star", label: "Número de socio fundador", strong: "Número de socio" },
  { id: "grabaciones", icon: "video", label: "Acceso a grabaciones en vivo", strong: "grabaciones en vivo" },
];

export const CLUB_TESTIMONIALS = [
  {
    id: "marcelo",
    quote:
      "Antes cada asado me salía distinto. Con el curso del fuego dejé de improvisar. Ahora en casa me piden que cocine yo.",
    name: "Marcelo A.",
    role: "Socio desde el mes 1",
  },
  {
    id: "rodrigo",
    quote:
      "El brisket me salía seco siempre. Seguí el paso a paso de Amos del Humo y me salió como de competencia. Impresionante.",
    name: "Rodrigo V.",
    role: "Socio Fundador",
  },
  {
    id: "daniela",
    quote:
      "Los Puntos Brasa son lo mejor: compro seguido igual, y encima me llevo linguiças gratis. La comunidad es un plus.",
    name: "Daniela P.",
    role: "Socia desde el mes 2",
  },
];

export const CLUB_FAQS = [
  {
    id: "pago",
    question: "¿Cómo pago la membresía?",
    answer:
      "Por QR o transferencia. Te enviamos el acceso apenas confirmamos el pago. Podés elegir plan mensual o anual.",
  },
  {
    id: "cancelar",
    question: "¿Puedo cancelar cuando quiera?",
    answer: "Sí, sin permanencia. Ojo: si cancelás, perdés el precio congelado de fundador y no vuelve.",
  },
  {
    id: "disponibilidad",
    question: "¿Los cursos ya están disponibles?",
    answer:
      "Se liberan de forma progresiva. Como Socio Fundador entrás con acceso anticipado y precio bloqueado mientras se suben.",
  },
  {
    id: "puntos",
    question: "¿Cómo uso los Puntos Brasa?",
    answer:
      "Se acumulan solos con cada compra en la tienda y los canjeás por productos artesanales en tu próximo pedido.",
  },
];

export function pointsForAmount(totalBs: number): number {
  return Math.floor(totalBs / CLUB.bsPerPoint);
}
