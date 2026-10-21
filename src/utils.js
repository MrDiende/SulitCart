export const formatPHP = (value) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value) || 0);

export const formatDate = (value, options = { month: "short", day: "numeric", year: "numeric" }) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-PH", options);
};

export const getStockStatus = (product) => {
  if (Number(product.stock) <= 0) return "Out of Stock";
  if (Number(product.stock) <= Number(product.threshold)) return "Low Stock";
  return "In Stock";
};

// Recognize older POS records that were saved before the channel field existed.
export const isOnlineOrder = (order) => order.channel !== "walk-in"
  && order.customerId !== "walk-in"
  && !String(order.id || "").startsWith("sale-")
  && !String(order.number || "").startsWith("POS-");

export const readStorage = (key, fallback) => {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};