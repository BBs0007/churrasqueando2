// Solo fotos reales de producto. Los productos sin foto muestran un marcador
// hasta que se suba la imagen real.
import realCheddarJalaAsset from "@/assets/real-cheddar-jalapeno.jpg.asset.json";
import realBifeAnchoAsset from "@/assets/real-bife-ancho-bc.jpg.asset.json";
import realColitaCuadrilAsset from "@/assets/real-colita-cuadril-bc.jpg.asset.json";
import realCowboyAsset from "@/assets/real-cowboy-churras.jpg.asset.json";
import realFraldinhaAsset from "@/assets/real-fraldinha-bc.jpg.asset.json";
import realDulcePicanteAsset from "@/assets/real-dulce-picante.jpg.asset.json";
import realMatambreMielAsset from "@/assets/real-matambre-miel.jpg.asset.json";
import realBrisketMuzzaAsset from "@/assets/real-brisket-muzza.jpg.asset.json";
import realPanCheeseburgerAsset from "@/assets/real-pan-cheeseburger.jpg.asset.json";
import realPanTradicionalAsset from "@/assets/real-pan-tradicional.jpg.asset.json";
import realHierbaMuzzaAsset from "@/assets/real-hierba-muzza.jpg.asset.json";
import realAlbahacaProvoloneAsset from "@/assets/real-albahaca-provolone.jpg.asset.json";
import realTradicionalCerdoAsset from "@/assets/real-tradicional-cerdo.jpg.asset.json";
import realCapresseAsset from "@/assets/real-capresse.jpg.asset.json";
import realBifeChorizoPcAsset from "@/assets/real-bife-chorizo-pc.jpg.asset.json";
import realCarnePicadaAsset from "@/assets/real-carne-picada.jpg.asset.json";
import realCarneMolidaAsset from "@/assets/real-carne-molida.jpg.asset.json";
import realPuntaSBcAsset from "@/assets/real-punta-s-bc.jpg.asset.json";
import realCorazonCuadrilChAsset from "@/assets/real-corazon-cuadril-ch.jpg.asset.json";
import realCostilla1erChAsset from "@/assets/real-costilla-1er-ch.jpg.asset.json";
import realEntranaChAsset from "@/assets/real-entrana-ch.jpg.asset.json";
import realLomoGrandeBcAsset from "@/assets/real-lomo-grande-bc.jpg.asset.json";
import realLingBrisketChAsset from "@/assets/real-ling-brisket-ch.jpg.asset.json";
import realMatambreTradicionalAsset from "@/assets/real-matambre-tradicional.jpg.asset.json";
import realOjoBifeChAsset from "@/assets/real-ojo-bife-ch.jpg.asset.json";
import realPanesBritoAsset from "@/assets/real-panes-brito.jpg.asset.json";
import realPuntaSChAsset from "@/assets/real-punta-s-ch.jpg.asset.json";
import realBifeChorizoChAsset from "@/assets/real-bife-chorizo-ch.jpg.asset.json";
import realTapequeAsset from "@/assets/real-tapeque-carnes.jpg.asset.json";
import realLlajuaSuaveAsset from "@/assets/real-llajua-suave-trato.jpg.asset.json";
import realLlajuaExtraPicanteAsset from "@/assets/real-llajua-extra-picante-trato.jpg.asset.json";
import realPalAsauAsset from "@/assets/real-pal-asau.jpg.asset.json";
import realChimichurriAsset from "@/assets/real-chimichurri-churrasquero.jpg.asset.json";

const imgRealCheddarJala = realCheddarJalaAsset.url;
const imgRealBifeAncho = realBifeAnchoAsset.url;
const imgRealColitaCuadril = realColitaCuadrilAsset.url;
const imgRealCowboy = realCowboyAsset.url;
const imgRealFraldinha = realFraldinhaAsset.url;
const imgRealDulcePicante = realDulcePicanteAsset.url;
const imgRealMatambreMiel = realMatambreMielAsset.url;
const imgRealBrisketMuzza = realBrisketMuzzaAsset.url;
const imgRealPanCheeseburger = realPanCheeseburgerAsset.url;
const imgRealPanTradicional = realPanTradicionalAsset.url;
const imgRealHierbaMuzza = realHierbaMuzzaAsset.url;
const imgRealAlbahacaProvolone = realAlbahacaProvoloneAsset.url;
const imgRealTradicionalCerdo = realTradicionalCerdoAsset.url;
const imgRealCapresse = realCapresseAsset.url;
const imgRealBifeChorizoPc = realBifeChorizoPcAsset.url;
const imgRealCarnePicada = realCarnePicadaAsset.url;
const imgRealCarneMolida = realCarneMolidaAsset.url;
const imgRealPuntaSBc = realPuntaSBcAsset.url;
const imgRealCorazonCuadrilCh = realCorazonCuadrilChAsset.url;
const imgRealCostilla1erCh = realCostilla1erChAsset.url;
const imgRealEntranaCh = realEntranaChAsset.url;
const imgRealLomoGrandeBc = realLomoGrandeBcAsset.url;
const imgRealLingBrisketCh = realLingBrisketChAsset.url;
const imgRealMatambreTradicional = realMatambreTradicionalAsset.url;
const imgRealOjoBifeCh = realOjoBifeChAsset.url;
const imgRealPanesBrito = realPanesBritoAsset.url;
const imgRealPuntaSCh = realPuntaSChAsset.url;
const imgRealBifeChorizoCh = realBifeChorizoChAsset.url;
const imgRealTapeque = realTapequeAsset.url;
const imgRealLlajuaSuave = realLlajuaSuaveAsset.url;
const imgRealLlajuaExtraPicante = realLlajuaExtraPicanteAsset.url;
const imgRealPalAsau = realPalAsauAsset.url;
const imgRealChimichurri = realChimichurriAsset.url;

export type Product = {
  id: string;
  name: string;
  price: number;
  unit: string;
  description: string;
  image?: string;
  hoverImage?: string;
};

export type Category = {
  id: string;
  name: string;
  tagline: string;
  products: Product[];
};

export const CURRENCY = "Bs";

const rawCategories: Category[] = [
  {
    id: "cortes-beef-club",
    name: "Cortes de Beef Club",
    tagline: "Carne premium · Precio x kg",
    products: [
      { id: "bc-picana", name: "Picaña", price: 164, unit: "1 - 1,2 kg", description: "Corte premium Beef Club. Peso aprox. 1 a 1,2 kg." },
      { id: "bc-punta-s", name: "Punta de S", price: 139, unit: "1 - 1,5 kg", description: "Corte premium Beef Club. Peso aprox. 1 a 1,5 kg.", image: imgRealPuntaSBc },
      { id: "bc-fraldinha", name: "Fraldinha", price: 85, unit: "1,2 - 3 kg", description: "Corte premium Beef Club. Peso aprox. 1,2 a 3 kg.", image: imgRealFraldinha },
      { id: "bc-bife-chorizo", name: "Bife de Chorizo", price: 90, unit: "2 - 3,5 kg", description: "Corte premium Beef Club. Peso aprox. 2 a 3,5 kg." },
      { id: "bc-lomo-grande", name: "Lomo Grande", price: 90, unit: "2 - 3,5 kg", description: "Lomo grande Beef Club, un nuevo concepto en carnes. Peso aprox. 2 a 3,5 kg.", image: imgRealLomoGrandeBc },
      { id: "bc-ojo-bife", name: "Ojo de Bife", price: 90, unit: "2 - 3,5 kg", description: "Corte premium Beef Club. Peso aprox. 2 a 3,5 kg.", image: imgRealBifeAncho },
      { id: "bc-pollerita", name: "Pollerita s/hueso", price: 80, unit: "2 - 4,5 kg", description: "Corte premium Beef Club. Peso aprox. 2 a 4,5 kg." },
      { id: "bc-colita-cuadril", name: "Colita de Cuadril", price: 82, unit: "1 - 1,9 kg", description: "Corte premium Beef Club. Peso aprox. 1 a 1,9 kg.", image: imgRealColitaCuadril },
      { id: "bc-molleja", name: "Molleja", price: 57, unit: "1 - 1,5 kg", description: "Corte premium Beef Club. Peso aprox. 1 a 1,5 kg." },
    ],
  },
  {
    id: "cortes-procarnes",
    name: "Cortes de Procarnes",
    tagline: "Carne premium · Precio x kg",
    products: [
      { id: "pc-bife-chorizo", name: "Bife de Chorizo", price: 107, unit: "2 - 3,5 kg", description: "Corte premium Procarnes. Peso aprox. 2 a 3,5 kg.", image: imgRealBifeChorizoPc },
      { id: "pc-punta-s", name: "Punta de S", price: 120, unit: "1 - 1,7 kg", description: "Corte premium Procarnes. Peso aprox. 1 a 1,7 kg." },
      { id: "pc-entrecostilla", name: "Entrecostilla", price: 90, unit: "1 - 1,7 kg", description: "Corte premium Procarnes. Peso aprox. 1 a 1,7 kg." },
      { id: "pc-aranita", name: "Arañita", price: 82, unit: "0,5 - 1 kg", description: "Corte premium Procarnes. Peso aprox. 0,5 a 1 kg." },
      { id: "pc-entranas", name: "Entrañas", price: 79, unit: "1 - 1,5 kg", description: "Corte premium Procarnes. Peso aprox. 1 a 1,5 kg." },
      { id: "pc-pollerita-vacio", name: "Pollerita s/h o Vacío", price: 81, unit: "1 - 1,8 kg", description: "Corte premium Procarnes. Peso aprox. 1 a 1,8 kg." },
    ],
  },
  {
    id: "cortes-churrasqueando",
    name: "Cortes de Churrasqueando",
    tagline: "Carne premium · Precio x kg",
    products: [
      { id: "ch-punta-s", name: "Punta de S", price: 120, unit: "1 - 1,7 kg", description: "Corte premium Churrasqueando. Peso aprox. 1 a 1,7 kg.", image: imgRealPuntaSCh },
      { id: "ch-entrana", name: "Entraña Delgada", price: 77, unit: "1 - 1,5 kg", description: "Entraña delgada Churrasqueando, lo mejor para tu churrasco. Peso aprox. 1 a 1,5 kg.", image: imgRealEntranaCh },
      { id: "ch-corazon-cuadril", name: "Corazón de Cuadril", price: 75, unit: "1 - 1,8 kg", description: "Corte premium Churrasqueando. Peso aprox. 1 a 1,8 kg.", image: imgRealCorazonCuadrilCh },
      { id: "ch-bife-ojo", name: "Ojo de Bife", price: 79, unit: "2 - 3,5 kg", description: "Ojo de bife Churrasqueando. Peso aprox. 2 a 3,5 kg.", image: imgRealOjoBifeCh },
      { id: "ch-bife-chorizo", name: "Bife de Chorizo", price: 79, unit: "2 - 3,5 kg", description: "Bife de chorizo Churrasqueando, lo mejor para tu churrasco. Peso aprox. 2 a 3,5 kg.", image: imgRealBifeChorizoCh },
      { id: "ch-costilla-1er", name: "Costilla 1er Corte", price: 62, unit: "1 - 1,5 kg", description: "Costilla 1er corte Churrasqueando. Peso aprox. 1 a 1,5 kg.", image: imgRealCostilla1erCh },
      { id: "ch-cowboy", name: "Cowboy", price: 95, unit: "1 - 1,5 kg", description: "Corte Cowboy premium Churrasqueando, lo mejor para tu churrasco. Peso aprox. 1 a 1,5 kg.", image: imgRealCowboy },
    ],
  },
  {
    id: "linguicas",
    name: "Linguiças",
    tagline: "Precio x 500 gr",
    products: [
      {
        id: "ling-brisket-muzza",
        name: "Linguiça Brisket & Muzzarella",
        price: 39,
        unit: "500 gr",
        description:
          "Sabor rústico y potente, ideal para los amantes de la carne de verdad, con el toque del queso mozzarella.",
        image: imgRealBrisketMuzza,
      },
      {
        id: "ling-cheddar-jala",
        name: "Linguiça Cheddar & Jalapeños",
        price: 39,
        unit: "500 gr",
        description:
          "El sabor profundo de la carne de res con la cremosidad del cheddar y el carácter de los jalapeños encurtidos.",
        image: imgRealCheddarJala,
      },
      {
        id: "ling-hierba-muzza",
        name: "Linguiça Hierba Buena & Muzzarella",
        price: 39,
        unit: "500 gr",
        description:
          "La frescura de la hierbabuena se funde con la cremosidad del mozzarella y la linguiça tradicional.",
        image: imgRealHierbaMuzza,
      },
      {
        id: "ling-brisket-churras",
        name: "Linguiça Brisket (Churrasquera)",
        price: 35,
        unit: "500 gr",
        description: "Sabor rústico y potente, ideal para los amantes de la carne de verdad. Contiene 500 gr.",
        image: imgRealLingBrisketCh,
      },
      {
        id: "ling-dulce-picante",
        name: "Linguiça Dulce Picante",
        price: 35,
        unit: "500 gr",
        description:
          "Un inicio suavemente dulce que realza la carne de cerdo, seguido de un picante sutil. Para quienes buscan algo diferente.",
        image: imgRealDulcePicante,
      },
      {
        id: "ling-tradicional",
        name: "Linguiça Tradicional Cerdo",
        price: 35,
        unit: "500 gr",
        description: "La clásica linguiça de cerdo con el sabor tradicional del churrasco brasileño.",
        image: imgRealTradicionalCerdo,
      },
      {
        id: "ling-albahaca-provolone",
        name: "Linguiça Albahaca & Provolone",
        price: 39,
        unit: "500 gr",
        description:
          "El aroma fresco de la albahaca combinado con la intensidad del queso provolone en una linguiça inigualable.",
        image: imgRealAlbahacaProvolone,
      },
      {
        id: "ling-capresse",
        name: "Linguiça Capresse",
        price: 39,
        unit: "500 gr",
        description:
          "Inspirada en la clásica ensalada capresse: tomate, albahaca y mozzarella en una linguiça jugosa.",
        image: imgRealCapresse,
      },
      {
        id: "ling-pack-completo",
        name: "Pack Completo Linguiças",
        price: 230,
        unit: "8 unidades",
        description:
          "Todas nuestras variedades en un solo pack: Brisket, Brisket & Muzzarella, Hierba & Mozzarella, Tradicional, Dulce Picante, Cheddar & Jalapeños y más. Ideal para compartir.",
      },
    ],
  },
  {
    id: "pan-linguica",
    name: "Pan con Linguiça",
    tagline: "Precio x unidad",
    products: [
      {
        id: "pan-tradicional",
        name: "Pan con Linguiça Tradicional",
        price: 19,
        unit: "unidad",
        description: "Pan recién horneado con nuestra linguiça tradicional a la parrilla.",
        image: imgRealPanTradicional,
      },
      {
        id: "pan-cheeseburger",
        name: "Pan con Linguiça Cheeseburger",
        price: 19,
        unit: "unidad",
        description:
          "Linguiça de res acompañada de queso cheddar y tocino ahumado. El sabor de una burger premium.",
        image: imgRealPanCheeseburger,
      },
      {
        id: "pan-capresse",
        name: "Pan con Linguiça Capresse",
        price: 19,
        unit: "unidad",
        description:
          "Pan con linguiça capresse: tomate, albahaca y mozzarella recién salidos de la parrilla.",
        image: imgRealCapresse,
      },
      {
        id: "pan-dulce-picante",
        name: "Pan con Linguiça Dulce Picante",
        price: 19,
        unit: "unidad",
        description:
          "Pan con nuestra linguiça dulce picante: inicio dulce y un picante sutil al final.",
        image: imgRealDulcePicante,
      },
      {
        id: "pan-picante",
        name: "Pan con Linguiça Picante Trato",
        price: 19,
        unit: "unidad",
        description: "Para los amantes del picante: linguiça con un toque ardiente irresistible.",
      },
    ],
  },
  {
    id: "jibas-matambres",
    name: "Jibas & Matambres",
    tagline: "Precio x 500 gr",
    products: [
      {
        id: "jiba-chimi",
        name: "Jiba Chimichurri",
        price: 44,
        unit: "500 gr",
        description: "Jiba marinada en chimichurri fresco, jugosa y llena de sabor.",
      },
      {
        id: "jiba-ajo-romero",
        name: "Jiba Ajo & Romero",
        price: 44,
        unit: "500 gr",
        description: "El aroma del ajo y el romero realzando una jiba tierna a la parrilla.",
      },
      {
        id: "matambre-tradicional",
        name: "Matambre de Cerdo Tradicional",
        price: 48,
        unit: "500 gr",
        description: "Matambre de cerdo tierno con el sabor tradicional del churrasco.",
        image: imgRealMatambreTradicional,
      },
      {
        id: "matambre-miel-mostaza",
        name: "Matambre de Cerdo Miel & Mostaza",
        price: 48,
        unit: "500 gr",
        description:
          "El favorito: la ternura del matambre con un glaseado de miel y mostaza que se caramela en la parrilla.",
        image: imgRealMatambreMiel,
      },
    ],
  },
  {
    id: "cortes-para-casa",
    name: "Cortes para Casa",
    tagline: "Cocinando · Precio x kg",
    products: [
      {
        id: "casa-carne-picada",
        name: "Carne Picada",
        price: 45,
        unit: "aprox. 1 kg",
        description: "Carne de res picada, ideal para tus comidas caseras del día a día.",
        image: imgRealCarnePicada,
      },
      {
        id: "casa-carne-molida",
        name: "Carne Molida 1ra",
        price: 48,
        unit: "aprox. 1 kg",
        description: "Carne molida de primera calidad, perfecta para hamburguesas, salsas y guisos.",
        image: imgRealCarneMolida,
      },
    ],
  },
  {
    id: "extras",
    name: "Extras",
    tagline: "Precio x unidad",
    products: [
      {
        id: "panes-brito",
        name: "Panes Brito (8 unidades)",
        price: 25,
        unit: "8 unidades",
        description:
          "Panes Brito sabor original, con hierbas aromáticas. Asar al horno o en la parrilla hasta dorar. Contiene 8 unidades.",
        image: imgRealPanesBrito,
      },
      {
        id: "llajua-trato-extra-picante",
        name: "Llajua Ahumada Trato Extra Picante",
        price: 27,
        unit: "240 gr",
        description:
          "Llajua ahumada en leña, extra picante, a base de tomate y cebolla. Contenido neto 240 gr.",
        image: imgRealLlajuaExtraPicante,
      },
      {
        id: "llajua-trato-suave",
        name: "Llajua Ahumada Trato Picante Suave",
        price: 27,
        unit: "240 gr",
        description:
          "Llajua ahumada en leña, picante suave, a base de tomate y cebolla. Contenido neto 240 gr.",
        image: imgRealLlajuaSuave,
      },
      {
        id: "pal-asau",
        name: "Salsa Pal Asau",
        price: 27,
        unit: "unidad",
        description: "Salsa artesanal Pal Asau, el acompañante ideal para tu asado.",
        image: imgRealPalAsau,
      },
      {
        id: "chimichurri-375",
        name: "Chimichurri El Churrasquero 375 gr",
        price: 26,
        unit: "375 gr",
        description:
          "Chimichurri 100% artesanal, un sabor único. Peso neto 375 gr. Refrigerar una vez abierto.",
        image: imgRealChimichurri,
      },
      {
        id: "tapeque-carnes",
        name: "El Tapeque para Carnes 500 gr",
        price: 27,
        unit: "500 gr",
        description:
          "Condimento artesanal a base de ajo, cebolla y especias. Ideal para macerar carnes, papas al horno, arroz salteado o pan a la parrilla.",
        image: imgRealTapeque,
      },
    ],
  },
];


// Solo se muestran productos con foto real
export const categories: Category[] = rawCategories
  .map((category) => ({
    ...category,
    products: category.products.filter((p) => Boolean(p.image)),
  }))
  .filter((category) => category.products.length > 0);

export const allProducts: Product[] = categories.flatMap((c) => c.products);

export const bestSellerIds: string[] = [
  "pan-capresse",
  "ch-punta-s",
  "matambre-miel-mostaza",
  "ling-dulce-picante",
  "ling-cheddar-jala",
  "ling-capresse",
  "ling-brisket-muzza",
  "pan-cheeseburger",
  "pan-dulce-picante",
];

export const bestSellers: Product[] = bestSellerIds
  .map((id) => allProducts.find((p) => p.id === id))
  .filter((p): p is Product => Boolean(p));
