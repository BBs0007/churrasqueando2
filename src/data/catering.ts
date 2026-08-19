// Paquetes de Catering Churrasquero (mínimo 17 personas)
export type CateringPackage = {
  id: string;
  name: string;
  highlight?: string;
  price: number; // Bs por persona
  portion: string;
  includesNote?: string;
  picada?: string;
  cortes: string[];
  guarniciones: string[];
  utencilios: string[];
};

export const CATERING_MIN_PEOPLE = 17;

export const cateringPackages: CateringPackage[] = [
  {
    id: "picada",
    name: "PICADA",
    price: 70,
    portion: "500 gr por persona",
    cortes: [
      "Punta de S, bife chorizo o ojo de bife",
      "Entrañas",
      "Pollerita s/h o colita de cuadril",
      "Costilla primer corte",
      "Linguiça tradicional y brisket",
      "Morcilla",
    ],
    guarniciones: ["Pan de ajo", "Yuca", "Salsa verde", "Llajua"],
    utencilios: ["Tabla para picar", "Tablitas pequeñas", "Parrilla (costo adicional)"],
  },
  {
    id: "picada-premium",
    name: "PICADA",
    highlight: "PREMIUM",
    price: 75,
    portion: "500 gr por persona",
    includesNote: "Todos los productos de Churrasqueando",
    cortes: [
      "Punta de S",
      "Bife chorizo o ojo de bife",
      "Pollerita s/h o colita de cuadril",
      "Jibas maceradas",
      "Matambres de cerdo macerados",
      "Linguiça con quesos y tradicional",
      "Pan con linguiça y morcilla",
    ],
    guarniciones: ["Pan de ajo", "Yuca", "Salsa verde", "Llajua"],
    utencilios: ["Tabla para picar", "Tablitas pequeñas", "Parrilla (costo adicional)"],
  },
  {
    id: "plato-servido",
    name: "PLATO SERVIDO",
    price: 80,
    portion: "500 gr por persona",
    cortes: ["Punta de S", "Bife chorizo / ojo de bife", "Costilla de res", "Vacío", "Linguiças"],
    guarniciones: [
      "Arroz (primavera o con queso)",
      "Yuca",
      "Ensalada de tomate y cebolla",
      "Ensalada de choclo",
      "Llajua",
      "Salsa verde",
    ],
    utencilios: ["Platos", "Cubiertos", "Fuentes", "Tablas y carbón", "Parrilla (costo adicional)"],
  },
  {
    id: "plato-servido-picada",
    name: "PLATO SERVIDO +",
    highlight: "PICADA",
    price: 85,
    portion: "500 gr por persona",
    picada: "Jibas maceradas, matambres de cerdo macerados, entrañas y pan con linguiça.",
    cortes: ["Punta de S", "Bife chorizo / ojo de bife", "Costilla de res", "Vacío", "Linguiças premium"],
    guarniciones: [
      "Arroz (primavera o con queso)",
      "Yuca",
      "Ensalada de tomate y cebolla",
      "Ensalada de choclo",
      "Llajua",
      "Salsa verde",
    ],
    utencilios: ["Platos", "Cubiertos", "Fuentes", "Tablas y carbón", "Parrilla (costo adicional)"],
  },
];

export const cateringNotes = [
  "Para reservar el día se adelanta 350 Bs del monto total (sin devoluciones, se puede cambiar la fecha).",
  "Se cobra transporte de parrillero de 70 Bs.",
  "Para cambios de fecha avisar con 2 días de anticipación.",
];

