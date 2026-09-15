/**
 * Extrae el peso base en kilos a partir del texto de "unit" del producto.
 * Ej: "1 - 1,2 kg" -> 1, "aprox. 1 kg" -> 1, "2 - 3,5 kg" -> 2
 * Devuelve null si el producto no se vende por kilo (ej. "500 gr", "unidad").
 */
export function getBaseKg(unit: string): number | null {
  if (!/kg/i.test(unit)) return null;
  const match = unit.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const n = parseFloat(match[1].replace(",", "."));
  if (!isFinite(n) || n <= 0) return null;
  return n;
}

export function isKgProduct(unit: string): boolean {
  return getBaseKg(unit) !== null;
}

/**
 * Extrae el peso en kilos a partir de un texto en gramos.
 * Ej: "500 gr" -> 0.5, "250 g" -> 0.25. Devuelve null si no aplica.
 */
function getGramsAsKg(unit: string): number | null {
  if (!/\bgr?\b/i.test(unit) || /kg/i.test(unit)) return null;
  const match = unit.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const n = parseFloat(match[1].replace(",", "."));
  if (!isFinite(n) || n <= 0) return null;
  return n / 1000;
}

/**
 * Estima el peso en kilos de una línea del carrito, para calcular el tamaño
 * de conservadora necesario en envíos a provincia.
 * - Productos por kg: la cantidad ya está en kilos.
 * - Productos por gramos: cantidad de paquetes × peso del paquete.
 * - Otros (unidad, paquete, docena, etc.): peso estimado conservador de 0.5 kg
 *   por unidad, ya que no se puede conocer el peso exacto.
 */
export function estimateItemWeightKg(unit: string, quantity: number): number {
  const kg = getBaseKg(unit);
  if (kg !== null) return quantity;
  const grams = getGramsAsKg(unit);
  if (grams !== null) return grams * quantity;
  return 0.5 * quantity;
}
