/**
 * Automatic product SKU: [business initials]-[product initials]-[4 digit sequence].
 * Example: "Amani Stores" + "Sabuni ya Unga" -> AS-SU-0001
 * SKUs are generated on save and never typed by the user.
 */

const LETTERS = /[^A-Za-z0-9]+/g;

/** Skips filler words so "Sabuni ya Unga" becomes SU, not SYU. */
const FILLER = new Set(["ya", "wa", "za", "la", "cha", "vya", "na", "of", "the", "and", "a"]);

export function initialsOf(value: string, max = 3) {
  const words = value
    .replace(LETTERS, " ")
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length > 0 && !FILLER.has(word.toLowerCase()));
  const source = words.length ? words : value.replace(LETTERS, "").split("");
  const letters = source.map((word) => word[0]!.toUpperCase()).join("").slice(0, max);
  return letters || "XX";
}

const pad = (n: number) => String(n).padStart(4, "0");

/**
 * Builds a unique SKU for a new product. `existingSkus` guards against duplicates:
 * the sequence advances until the code is free.
 */
export function generateSku(businessName: string, productName: string, existingSkus: string[]) {
  const business = initialsOf(businessName || "Bizz", 3);
  const product = initialsOf(productName || "Product", 3);
  const prefix = `${business}-${product}-`;
  const taken = new Set(existingSkus.map((sku) => sku.trim().toUpperCase()).filter(Boolean));

  const used = existingSkus
    .map((sku) => sku.trim().toUpperCase())
    .filter((sku) => sku.startsWith(prefix))
    .map((sku) => Number(sku.slice(prefix.length)))
    .filter((n) => Number.isFinite(n));

  let next = (used.length ? Math.max(...used) : 0) + 1;
  while (taken.has(`${prefix}${pad(next)}`)) next += 1;
  return `${prefix}${pad(next)}`;
}
