
import cheddar from "@/assets/prod-cheddar.jpg";
import panLinguica from "@/assets/prod-pan-linguica.jpg";
import matambre from "@/assets/prod-matambre.jpg";
import salsa from "@/assets/prod-salsa.jpg";
import carbon from "@/assets/prod-carbon.jpg";
import imgPicana from "@/assets/cut-picana.jpg";
import imgPunta from "@/assets/cut-punta.jpg";
import imgFraldinha from "@/assets/cut-fraldinha.jpg";
import imgBifeChorizo from "@/assets/cut-bife-chorizo.jpg";
import imgOjoBife from "@/assets/cut-ojo-bife.jpg";
import imgPollerita from "@/assets/cut-pollerita.jpg";
import imgColitaCuadril from "@/assets/cut-colita-cuadril.jpg";
import imgMolleja from "@/assets/cut-molleja.jpg";
import imgEntrecostilla from "@/assets/cut-entrecostilla.jpg";
import imgAranita from "@/assets/cut-aranita.jpg";
import imgEntrana from "@/assets/cut-entrana.jpg";
import imgCorazonCuadril from "@/assets/cut-corazon-cuadril.jpg";
import imgBifeOjo from "@/assets/cut-bife-ojo.jpg";
import imgCostilla from "@/assets/cut-costilla.jpg";
import brisketMuzzaAsset from "@/assets/brisket-muzza.png.asset.json";
import cheddarJalaAsset from "@/assets/cheddar-jalapeno.png.asset.json";
import hierbaMuzzaAsset from "@/assets/hierba-muzza.png.asset.json";
import brisketAsset from "@/assets/brisket.png.asset.json";
import dulcePicanteAsset from "@/assets/dulce-picante.png.asset.json";
import tradicionalCerdoAsset from "@/assets/tradicional-cerdo.png.asset.json";
import packCompletoAsset from "@/assets/pack-completo.png.asset.json";
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

const imgBrisketMuzza = brisketMuzzaAsset.url;
const imgCheddarJala = cheddarJalaAsset.url;
const imgHierbaMuzza = hierbaMuzzaAsset.url;
const imgBrisket = brisketAsset.url;
const imgDulcePicante = dulcePicanteAsset.url;
const imgTradicionalCerdo = tradicionalCerdoAsset.url;
const imgPackCompleto = packCompletoAsset.url;
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

export type Product = {
  id: string;
  name: string;
  price: number;
  unit: string;
  description: string;
  image: string;
};

export type Category = {
  id: string;
  name: string;
  tagline: string;
  products: Product[];
};

export const CURRENCY = "Bs";

export const categories: Category[] = [
  {
    id: "cortes-beef-club",
    name: "Cortes de Beef Club",
    tagline: "Carne premium · Precio x kg",
    products: [
      { id: "bc-picana", name: "Picaña", price: 164, unit: "1 - 1,2 kg", description: "Corte premium Beef Club. Peso aprox. 1 a 1,2 kg.", image: imgPicana },
      { id: "bc-punta-s", name: "Punta de S", price: 139, unit: "1 - 1,5 kg", description: "Corte premium Beef Club. Peso aprox. 1 a 1,5 kg.", image: imgRealPuntaSBc },
      { id: "bc-fraldinha", name: "Fraldinha", price: 85, unit: "1,2 - 3 kg", description: "Corte premium Beef Club. Peso aprox. 1,2 a 3 kg.", image: imgRealFraldinha },
      { id: "bc-bife-chorizo", name: "Bife de Chorizo", price: 90, unit: "2 - 3,5 kg", description: "Corte premium Beef Club. Peso aprox. 2 a 3,5 kg.", image: imgBifeChorizo },
      { id: "bc-ojo-bife", name: "Ojo de Bife", price: 90, unit: "2 - 3,5 kg", description: "Corte premium Beef Club. Peso aprox. 2 a 3,5 kg.", image: imgRealBifeAncho },
      { id: "bc-pollerita", name: "Pollerita s/hueso", price: 80, unit: "2 - 4,5 kg", description: "Corte premium Beef Club. Peso aprox. 2 a 4,5 kg.", image: imgPollerita },
      { id: "bc-colita-cuadril", name: "Colita de Cuadril", price: 82, unit: "1 - 1,9 kg", description: "Corte premium Beef Club. Peso aprox. 1 a 1,9 kg.", image: imgRealColitaCuadril },
      { id: "bc-molleja", name: "Molleja", price: 57, unit: "1 - 1,5 kg", description: "Corte premium Beef Club. Peso aprox. 1 a 1,5 kg.", image: imgMolleja },
    ],
  },
  {
    id: "cortes-procarnes",
    name: "Cortes de Procarnes",
    tagline: "Carne premium · Precio x kg",
    products: [
      { id: "pc-bife-chorizo", name: "Bife de Chorizo", price: 107, unit: "2 - 3,5 kg", description: "Corte premium Procarnes. Peso aprox. 2 a 3,5 kg.", image: imgRealBifeChorizoPc },
      { id: "pc-punta-s", name: "Punta de S", price: 120, unit: "1 - 1,7 kg", description: "Corte premium Procarnes. Peso aprox. 1 a 1,7 kg.", image: imgPunta },
      { id: "pc-entrecostilla", name: "Entrecostilla", price: 90, unit: "1 - 1,7 kg", description: "Corte premium Procarnes. Peso aprox. 1 a 1,7 kg.", image: imgEntrecostilla },
      { id: "pc-aranita", name: "Arañita", price: 82, unit: "0,5 - 1 kg", description: "Corte premium Procarnes. Peso aprox. 0,5 a 1 kg.", image: imgAranita },
      { id: "pc-entranas", name: "Entrañas", price: 79, unit: "1 - 1,5 kg", description: "Corte premium Procarnes. Peso aprox. 1 a 1,5 kg.", image: imgEntrana },
      { id: "pc-pollerita-vacio", name: "Pollerita s/h o Vacío", price: 81, unit: "1 - 1,8 kg", description: "Corte premium Procarnes. Peso aprox. 1 a 1,8 kg.", image: imgPollerita },
    ],
  },
  {
    id: "cortes-churrasqueando",
    name: "Cortes de Churrasqueando",
    tagline: "Carne premium · Precio x kg",
    products: [
      { id: "ch-punta-s", name: "Punta de S", price: 120, unit: "1 - 1,7 kg", description: "Corte premium Churrasqueando. Peso aprox. 1 a 1,7 kg.", image: imgPunta },
      { id: "ch-entrana", name: "Entraña", price: 77, unit: "1 - 1,5 kg", description: "Corte premium Churrasqueando. Peso aprox. 1 a 1,5 kg.", image: imgEntrana },
      { id: "ch-corazon-cuadril", name: "Corazón de Cuadril", price: 75, unit: "1 - 1,8 kg", description: "Corte premium Churrasqueando. Peso aprox. 1 a 1,8 kg.", image: imgCorazonCuadril },
      { id: "ch-bife-ojo", name: "Bife y Ojo de Bife", price: 79, unit: "2 - 3,5 kg", description: "Corte premium Churrasqueando. Peso aprox. 2 a 3,5 kg.", image: imgBifeOjo },
      { id: "ch-costilla-1er", name: "Costilla 1er Corte", price: 62, unit: "1 - 1,5 kg", description: "Corte premium Churrasqueando. Peso aprox. 1 a 1,5 kg.", image: imgCostilla },
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
        description: "Sabor rústico y potente, ideal para los amantes de la carne de verdad.",
        image: imgBrisket,
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
        image: imgPackCompleto,
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
        id: "pan-picante",
        name: "Pan con Linguiça Picante Trato",
        price: 19,
        unit: "unidad",
        description: "Para los amantes del picante: linguiça con un toque ardiente irresistible.",
        image: panLinguica,
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
        image: matambre,
      },
      {
        id: "jiba-ajo-romero",
        name: "Jiba Ajo & Romero",
        price: 44,
        unit: "500 gr",
        description: "El aroma del ajo y el romero realzando una jiba tierna a la parrilla.",
        image: matambre,
      },
      {
        id: "matambre-tradicional",
        name: "Matambre de Cerdo Tradicional",
        price: 48,
        unit: "500 gr",
        description: "Matambre de cerdo tierno con el sabor tradicional del churrasco.",
        image: matambre,
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
        id: "pan-ajo-britos",
        name: "Pan de Ajo Britos",
        price: 25,
        unit: "unidad",
        description: "Pan de ajo crujiente, el acompañante perfecto para tu churrasco.",
        image: panLinguica,
      },
      {
        id: "llajua-trato",
        name: "Llajua Trato",
        price: 27,
        unit: "unidad",
        description: "Llajua boliviana tradicional, picante y fresca.",
        image: salsa,
      },
      {
        id: "llajua-byr",
        name: "Llajua Churras. B&R",
        price: 27,
        unit: "unidad",
        description: "Nuestra llajua especial de la casa para acompañar la parrilla.",
        image: salsa,
      },
      {
        id: "chimichurri-350",
        name: "Chimichurri 350 ml",
        price: 26,
        unit: "350 ml",
        description: "Chimichurri artesanal en frasco de 350 ml.",
        image: salsa,
      },
      {
        id: "carbon",
        name: "Carbón",
        price: 22,
        unit: "unidad",
        description: "Carbón de alta calidad para una parrilla perfecta.",
        image: carbon,
      },
      {
        id: "lena",
        name: "Leña",
        price: 8,
        unit: "unidad",
        description: "Leña seleccionada para dar ese sabor ahumado único.",
        image: carbon,
      },
      {
        id: "brasafast",
        name: "Brasafast",
        price: 6,
        unit: "unidad",
        description: "Encendedor rápido para tu churrasco sin complicaciones.",
        image: carbon,
      },
    ],
  },
];

export const allProducts: Product[] = categories.flatMap((c) => c.products);
