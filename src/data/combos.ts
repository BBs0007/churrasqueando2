import type { Product } from "./products";

import comboBrasuco from "@/assets/combos/combo-brasuco.jpeg";
import comboGaucho from "@/assets/combos/combo-gaucho.jpeg";
import comboGringo from "@/assets/combos/combo-gringo.jpeg";
import comboArgentina from "@/assets/combos/combo-argentina.jpeg";
import comboEspanolisimo from "@/assets/combos/combo-espanolisimo.jpeg";
import comboOraleGuey from "@/assets/combos/combo-orale-guey.jpeg";

export type Combo = Product & {
  people: number;
  items: string[];
};

export const combos: Combo[] = [
  {
    id: "combo-brasuco",
    name: "Combo Brasuco",
    price: 600,
    unit: "hasta 12 personas",
    people: 12,
    items: [
      "1.5 kg Bananinha",
      "1 kg Picaña",
      "1,5 kg Maminha (colita de cuadril)",
      "2 unid. Pan con Linguiça",
      "2 unid. Linguiças",
    ],
    description:
      "Bananinha, picaña, maminha, pan con linguiça y linguiças. Hasta para 12 personas.",
    image: comboBrasuco,
  },
  {
    id: "combo-gaucho",
    name: "Combo Gaucho",
    price: 919,
    unit: "hasta 20 personas",
    people: 20,
    items: [
      "3 kg Costilla 1er corte",
      "2 kg Entraña",
      "3 kg Corazón de cuadril",
      "1 kg Molleja",
      "1 kg Linguiças",
      "0.5 kg Morcilla y matambre",
    ],
    description:
      "El más grande: costilla, entraña, corazón de cuadril, molleja, linguiças, morcilla y matambre. Hasta para 20 personas.",
    image: comboGaucho,
  },
  {
    id: "combo-espanolisimo",
    name: "Combo Españolisimo",
    price: 719,
    unit: "hasta 15 personas",
    people: 15,
    items: [
      "1.5 kg Punta de S premium",
      "1.5 kg Tira",
      "1.5 kg Linguiças (a elección)",
      "1 kg Entraña",
      "1.5 kg Colita de cuadril",
      "1 paquete de Jiba maserada",
      "2 Panes con Linguiça XL",
      "1 Sal de 0.5 kg a elección",
    ],
    description:
      "Punta de S premium, tira, linguiças, entraña, colita de cuadril, jiba y panes XL. Hasta para 15 personas.",
    image: comboEspanolisimo,
  },
  {
    id: "combo-gringo",
    name: "Combo Gringo",
    price: 583,
    unit: "hasta 15 personas",
    people: 15,
    items: [
      "3 kg Ojo de bife",
      "1.5 kg Bife de chorizo",
      "1 kg Cowboy",
      "1 Sal ahumada",
      "1 kg Linguiças Brisket",
    ],
    description:
      "Ojo de bife, bife de chorizo, cowboy, sal ahumada y linguiças brisket. Hasta para 15 personas.",
    image: comboGringo,
  },
  {
    id: "combo-argentina",
    name: "Combo Argentina",
    price: 509,
    unit: "hasta 10 personas",
    people: 10,
    items: [
      "4 kg de Bife de chorizo premium",
      "1 kg Linguiças (a elección)",
      "2 Pan con Linguiça",
      "1 Sal de 0.5 kg a elección",
    ],
    description:
      "Bife de chorizo premium, linguiças a elección, pan con linguiça y sal. Hasta para 10 personas.",
    image: comboArgentina,
  },
  {
    id: "combo-orale-guey",
    name: "Combo Órale Guey",
    price: 419,
    unit: "hasta 10 personas",
    people: 10,
    items: [
      "3 kg de Ojo de bife",
      "1 kg de Entraña",
      "2 Panes con Linguiça",
      "1 Sal",
      "1 Salsa chimichurri",
    ],
    description:
      "Ojo de bife, entraña, panes con linguiça, sal y chimichurri. Hasta para 10 personas.",
    image: comboOraleGuey,
  },
];
