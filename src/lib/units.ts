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
