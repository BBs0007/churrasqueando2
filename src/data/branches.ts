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
    id: "central-norte",
    name: "Churrasqueando Central",
    address: "Al frente del Condominio, Carretera Norte, 1/2 Km 10, Santa Cruz de la Sierra (8R8V+CW)",
    city: "Santa Cruz de la Sierra",
    lat: -17.6839375,
    lng: -63.15518750000001,
  },
  {
    id: "central",
    name: "Churrasqueando",
    // TODO: falta el nombre de la avenida exacta de este punto (Zona Sur) — avisa cual es y la actualizo
    address: "Zona Sur (17°48'29.7\"S 63°11'26.5\"W)",
    city: "Santa Cruz de la Sierra",
    lat: -17.80825,
    lng: -63.190694,
  },
  {
    id: "iberica",
    name: "Churrasqueando Av. Iberica",
    address: "5QVV+968, Av. Iberica, El Pari",
    city: "Santa Cruz de la Sierra",
    lat: -17.803564,
    lng: -63.2097863,
  },
  {
    id: "sur",
    name: "Churrasqueando Sur",
    address: "5QQQ+XW",
    city: "Santa Cruz de la Sierra",
    lat: -17.8100625,
    lng: -63.2101875,
  },
  {
    id: "norte",
    name: "Churrasqueando Norte",
    address: "6RQ7+56",
    city: "Santa Cruz de la Sierra",
    lat: -17.7620625,
    lng: -63.1869375,
  },
  {
    id: "montero",
    name: "Churrasqueando Montero",
    address: "MP2W+WQH, Calle Warnes 285",
    city: "Montero",
    lat: -17.3476718,
    lng: -63.252973,
  },
];
