import { categories, type Category } from "./products";

export type Section = {
  id: string;
  title: string;
  categoryIds: string[];
};

export const sections: Section[] = [
  {
    id: "cortes-carne-res",
    title: "Cortes de Carne de Res",
    categoryIds: ["cortes-beef-club", "cortes-procarnes", "cortes-churrasqueando"],
  },
  {
    id: "productos-churrasqueando",
    title: "Productos Churrasqueando",
    categoryIds: ["linguicas", "pan-linguica", "jibas-matambres"],
  },
  {
    id: "cortes-para-casa-seccion",
    title: "Cortes para Casa",
    categoryIds: ["cortes-para-casa"],
  },
  {
    id: "extras-seccion",
    title: "Extras",
    categoryIds: ["extras"],
  },
];

export function getSectionCategories(section: Section): Category[] {
  return section.categoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is Category => Boolean(c));
}
