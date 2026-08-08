// Reglas del Club Churrasqueando (editables)
export const CLUB = {
  name: "Club Churrasqueando",
  // Acumulación de puntos
  bsPerPoint: 10, // 10 Bs de compra = 1 punto
  // Canje
  redeemStep: 100, // se canjea desde 100 puntos
  redeemValueBs: 50, // 100 puntos = 50 Bs de descuento
  // Suscripción
  monthlyPriceBs: 50,
  planLabel: "Mensual",
};

export const CLUB_BENEFITS = [
  {
    id: "descuentos",
    title: "Descuentos exclusivos",
    description: "Precios especiales de socio en cortes premium, linguiças y combos.",
  },
  {
    id: "cursos",
    title: "Cursos y masterclass",
    description: "Acceso a los cursos de parrilla y cortes dictados por el equipo Churrasqueando.",
  },
  {
    id: "canjes",
    title: "Canje de puntos",
    description: `Cada ${CLUB.redeemStep} puntos equivalen a ${CLUB.redeemValueBs} Bs de descuento en tu pedido.`,
  },
  {
    id: "prioridad",
    title: "Acceso prioritario",
    description: "Reservas de catering y lanzamientos de nuevos productos antes que nadie.",
  },
];

export function pointsForAmount(totalBs: number): number {
  return Math.floor(totalBs / CLUB.bsPerPoint);
}
