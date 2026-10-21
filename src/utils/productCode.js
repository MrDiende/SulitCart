const categoryPrefixes = {
  electronics: "ELE",
  "home-living": "HOM",
  "clothing-apparel": "CLO",
  "shoes-footwear": "SHO",
  "beauty-personal-care": "BEA",
};

export function generateProductCode(products, categoryId, categories = []) {
  if (!categoryId) return "";
  const category = categories.find((item) => item.id === categoryId);
  const prefix = categoryPrefixes[categoryId]
    || (category?.name || categoryId).replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase()
    || "GEN";
  const codePrefix = `SC-${prefix}-`;
  const existingCodes = new Set(products.map((product) => (product.sku || "").trim().toUpperCase()));
  let highestSequence = 0;

  existingCodes.forEach((code) => {
    if (!code.startsWith(codePrefix)) return;
    const suffix = code.slice(codePrefix.length);
    const sequence = Number(suffix);
    if (/^\d+$/.test(suffix) && Number.isSafeInteger(sequence)) {
      highestSequence = Math.max(highestSequence, sequence);
    }
  });

  return `${codePrefix}${String(highestSequence + 1).padStart(3, "0")}`;
}