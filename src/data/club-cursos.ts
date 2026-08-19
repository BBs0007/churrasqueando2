import cursoFuego from "@/assets/club/curso-fuego.jpg";
import cursoCortes from "@/assets/club/curso-cortes.jpg";
import cursoLinguicas from "@/assets/club/curso-linguicas.jpg";
import cursoBbq from "@/assets/club/curso-bbq.jpg";
import cursoLena from "@/assets/club/curso-lena.jpg";

export type ClubCurso = {
  id: string;
  title: string;
  tag: string;
  image: string;
  description: string;
  bullets: string[];
};

// Imágenes provisionales generadas con IA — reemplazar por fotos/videos reales.
export const CLUB_CURSOS: ClubCurso[] = [
  {
    id: "domina-el-fuego",
    title: "Domina el fuego",
    tag: "Curso insignia",
    image: cursoFuego,
    description:
      "Nuestro curso más completo para quienes quieren llevar su parrilla al máximo: desde los fundamentos del calor hasta técnicas avanzadas como el sellado inverso y piezas completas.",
    bullets: [
      "Fundamentos del calor, brasas y manejo de la parrilla",
      "Cortes delgados y gruesos: picaña, ojo de bife, cowboy, tomahawk",
      "Sellado inverso y cocción de piezas enteras",
      "Retos prácticos por niveles con soporte de instructores",
    ],
  },
  {
    id: "cortes",
    title: "Cortes de res y cerdo",
    tag: "Incluido",
    image: cursoCortes,
    description:
      "Aprende a identificar cada corte, entender sus características y elegir carne de buena calidad. Una receta para cada corte, más clases maestras de despiece.",
    bullets: [
      "Cómo reconocer y elegir carne de calidad",
      "Qué técnica le va mejor a cada corte",
      "Recetas dedicadas para res y cerdo",
      "2 clases maestras de cortes",
    ],
  },
  {
    id: "linguicas",
    title: "Linguiças artesanales",
    tag: "Estilo Churrasqueando",
    image: cursoLinguicas,
    description:
      "Crea tus propias linguiças y salchichas frescas desde cero, con ingredientes naturales y técnicas artesanales, sin conservantes ni rellenos industriales.",
    bullets: [
      "Selección de carne, grasa y formulaciones",
      "Molienda, mezclado y embutido paso a paso",
      "Tipos de tripa y curado en frío",
      "Recetas clásicas y de autor",
    ],
  },
  {
    id: "bbq",
    title: "BBQ y ahumados",
    tag: "Incluido",
    image: cursoBbq,
    description:
      "Domina el BBQ norteamericano: brisket, costillas, short ribs y pulled pork, con control preciso de tiempo, temperatura y humo.",
    bullets: [
      "Tipos de ahumadores y maderas",
      "Control de tiempo y temperatura",
      "Brisket, costillas y pulled pork",
      "Salsas, rubs y fusiones de sabores",
    ],
  },
  {
    id: "lena",
    title: "Asado a la leña",
    tag: "Incluido",
    image: cursoLena,
    description:
      "La técnica del fuego vivo: elegir la leña, administrar el fuego y asar piezas completas como en las grandes celebraciones del sur del continente.",
    bullets: [
      "Elección y manejo de la leña",
      "Encendido y administración del fuego",
      "Costillares y piezas enteras a la cruz",
      "Cómo adaptarte al clima y al viento",
    ],
  },
];
