import { Link } from "react-router-dom";
import "../css/CategoryLink.css";

export default function CategoryLink({ category }) {
  return <Link
    to={`/products?category=${encodeURIComponent(category.id)}`}
    className="category-link"
  >
    {category.name}
  </Link>;
}