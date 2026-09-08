import cursoFuego from "@/assets/club/curso-fuego.jpg";
import cursoCortes from "@/assets/club/curso-cortes.jpg";
import cursoBbq from "@/assets/club/curso-bbq.jpg";
import cursoLena from "@/assets/club/curso-lena.jpg";

export type ClubCurso = {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  // Imagen real (si ya existe). Si es null, la tarjeta usa un placeholder oscuro
  // con la descripción de la foto pendiente (ver `photoBrief`).
  image: string | null;
  photoBrief: string;
  description: string;
  bullets: string[];
};

// Imágenes provisionales — reemplazar por fotos/videos reales cuando estén listos.
export const CLUB_CURSOS: ClubCurso[] = [
  {
    id: "maestro-churrasquero",
    title: "Maestro Churrasquero",
    subtitle: "De cero al fuego perfecto",
    tag: "Curso insignia",
    image: cursoFuego,
    photoBrief: "Parrilla llena sellándose, brasas rojas, humo · fondo negro",
    description:
      "Si cada asado te sale distinto y estás cansado de depender de la suerte, este curso es para vos. De los fundamentos del fuego al punto perfecto de cada corte.",
    bullets: [
      "Fundamentos del calor, brasas y manejo por zonas",
      "El punto exacto de cada corte",
      "Sellado, reposo y timing",
      "De los cortes finos a las piezas grandes",
    ],
  },
  {
    id: "amos-del-humo",
    title: "Amos del Humo",
    subtitle: "Ahumados y BBQ estilo USA",
    tag: "BBQ & ahumados",
    image: cursoBbq,
    photoBrief: "Brisket cortado con anillo de humo · ahumador detrás",
    description:
      "¿Viste esos ahumados que se deshacen solos y pensaste que eran imposibles en casa? No lo son. Dominá el BBQ norteamericano con control real de humo.",
    bullets: [
      "Tipos de ahumadores y maderas",
      "Control de tiempo y temperatura: bajo y lento",
      "Brisket, costillas, short ribs y pulled pork",
      "Rubs, salsas y el anillo de humo",
    ],
  },
  {
    id: "fuego-ancestral",
    title: "Fuego Ancestral",
    subtitle: "Asado a la leña, a la cruz y al baral",
    tag: "Curso en línea",
    image: cursoLena,
    photoBrief: "Costillar a la cruz junto al fuego de leña · hora dorada",
    description:
      "Cocinar con fuego vivo es la técnica más ancestral y la más emocionante. Asá piezas completas a la cruz y al baral, como en las grandes celebraciones del sur.",
    bullets: [
      "Elección y manejo de la leña",
      "Encendido y administración del fuego",
      "Costillares y piezas enteras a la cruz",
      "Cómo adaptarte al clima y al viento",
    ],
  },
  {
    id: "maestria-caja-china",
    title: "Maestría en Caja China",
    subtitle: "El secreto del cerdo crocante",
    tag: "Curso en línea",
    image: null,
    photoBrief: "Cerdo dorado saliendo de la caja · vapor · manos",
    description:
      "La forma más segura de sacar un cerdo entero crocante por fuera y jugoso por dentro. Aprendé los cortes, tiempos y temperaturas para nunca más arruinar una pieza grande.",
    bullets: [
      "Armado y manejo de la caja china",
      "Cortes recomendados y su preparación",
      "Tiempos y temperaturas según el peso",
      "El punto crocante de la piel",
    ],
  },
  {
    id: "dry-age-en-casa",
    title: "Dry Age en Casa",
    subtitle: "Maduración en seco, hecha por vos",
    tag: "Técnica premium",
    image: null,
    photoBrief: "Corte madurado sobre tabla · luz lateral dura · fondo negro",
    description:
      "La maduración en seco transforma tus cortes en otro nivel de suavidad y sabor. Aprendé a hacerlo de forma segura y precisa en casa. Sabor de restaurante, sin el precio.",
    bullets: [
      "La ciencia de la maduración, simple",
      "Cómo hacerlo seguro en casa",
      "Tiempos y qué cortes sirven",
      "Cómo evaluar el punto y cortar",
    ],
  },
  {
    id: "conoce-la-res",
    title: "Conocé la Res",
    subtitle: "Cortes y desposte completo",
    tag: "Clase maestra",
    image: cursoCortes,
    photoBrief: "Cuchillo sobre cortes ordenados · carnicería premium",
    description:
      "Dejá de comprar a ciegas. Conocé la res entera, corte por corte, con clases de desposte: qué es cada pieza, para qué sirve y cómo elegir la mejor calidad.",
    bullets: [
      "Anatomía completa de la res con desposte",
      "Nombre y ubicación de cada corte",
      "Qué técnica le va mejor a cada uno",
      "Cómo reconocer y elegir calidad",
    ],
  },
];
