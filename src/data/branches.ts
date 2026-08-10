export type Branch = {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
};

// Puntos de venta de Churrasqueando
export const BRANCHES: Branch[] = [
  {
    id: "SCZ - CENTRAL",
    name: "Churrasqueando Central",
    address: "Al frente del Condominio, Carretera Norte, 1/2 Km 10, Santa Cruz de la Sierra (8R8V+CW)",
    city: "Santa Cruz de la Sierra",
    lat: -17.6839375,
    lng: -63.15518750000001,
  },
  {
    id: "SCZ - SUR",
    name: "SOLO CARNES",
    // TODO: falta el nombre de la avenida exacta de este punto (Zona Sur) — avisa cual es y la actualizo
    address: "Zona Sur (17°48'29.7\"S 63°11'26.5\"W)",
    city: "Santa Cruz de la Sierra",
    lat: -17.80825,
    lng: -63.190694,
  },
  {
    id: "SCZ - SUR",
    name: "LAS PALMAS",
    address: "5QVV+968, Av. Iberica, El Pari",
    city: "Santa Cruz de la Sierra",
    lat: -17.803564,
    lng: -63.2097863,
  },
  {
    id: "SCZ - SUR",
    name: "SANTA VACA CARNE PREMIUM",
    address: "5QQQ+XW",
    city: "Santa Cruz de la Sierra",
    lat: -17.8100625,
    lng: -63.2101875,
  },
  {
    id: "SCZ - NORTE",
    name: "RED BEEF CARNICERIA",
    address: "6RQ7+56",
    city: "Santa Cruz de la Sierra",
    lat: -17.7620625,
    lng: -63.1869375,
  },
  {
    id: "SCZ - MONTERO",
    name: "BRASIL CARNICERIA",
    address: "MP2W+WQH, Calle Warnes 285",
    city: "Montero",
    lat: -17.3476718,
    lng: -63.252973,
  },
];
