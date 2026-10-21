import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useStore } from "../context/StoreContext";
import { formatPHP, getStockStatus } from "../utils";
import { Button, StatusBadge } from "./UI";
import "../css/ProductCard.css";

export default function ProductCard({ product }) {
  const { categories, addToCart } = useStore();
  const [added, setAdded] = useState(false);
  const category = categories.find((item) => item.id === product.category)?.name || "General";
  const stockStatus = getStockStatus(product);
  const add = (event) => {
    event.preventDefault();
    const success = addToCart(product.id);
    setAdded(success);
    window.setTimeout(() => setAdded(false), 1300);
  };

  return <article className="product-card">
    <Link to={`/products/${product.id}`} className="product-card__media">
      <div className="product-card__image-wrap">
        <img src={product.image} alt={product.name} loading="lazy" className="product-card__image" />
      </div>
      <span className="product-card__status"><StatusBadge status={stockStatus} /></span>
      <span className="product-card__details-arrow"><ArrowUpRight size={16} /></span>
    </Link>
    <div className="product-card__body">
      <p className="product-card__category">{category}</p>
      <Link to={`/products/${product.id}`} className="product-card__name">{product.name}</Link>
      <div className="product-card__purchase">
        <div><span className="product-card__price">{formatPHP(product.price)}</span><span className="product-card__unit">/ {product.unit || "item"}</span></div>
        <Button size="sm" variant="secondary" className="product-card__add" aria-label={`Add ${product.name} to cart`} onClick={add} disabled={stockStatus === "Out of Stock"}>
          {added ? <span className="product-card__added">Added</span> : <ShoppingBag size={15} />}
        </Button>
      </div>
    </div>
  </article>;
}