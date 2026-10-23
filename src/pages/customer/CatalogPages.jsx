import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ChevronDown, MapPin, Minus, Plus, Search, ShoppingBag, SlidersHorizontal } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { formatPHP, getStockStatus } from "../../utils";
import ProductCard from "../../components/ProductCard";
import CategoryLink from "../../components/CategoryLink";
import { Button, EmptyState, PageTitle, StatusBadge } from "../../components/UI";
import "../../css/CatalogPages.css";

export function HomePage() {
  const { categories, products, user } = useStore();
  const customerName = user?.role === "customer" && user.active !== false ? user.name?.trim() : "";
  const dashboardPath = user?.role === "admin" ? "/admin" : user?.role === "staff" ? "/staff" : null;
  const featured = products.filter((item) => item.active && item.stock > 0).slice(0, 4);
  const heroBackgrounds = [
    "/images/hero-realistic/electronics.jpg",
    "/images/hero-realistic/home-living.jpg",
    "/images/hero-realistic/clothing-apparel.jpg",
    "/images/hero-realistic/shoes-footwear.jpg",
    "/images/hero-realistic/beauty-personal-care.jpg",
  ];
  const [heroBackgroundIndex, setHeroBackgroundIndex] = useState(0);

  useEffect(() => {
    heroBackgrounds.forEach((src) => {
      const image = new Image();
      image.src = src;
    });

    const timer = window.setInterval(() => {
      setHeroBackgroundIndex((current) => (current + 1) % heroBackgrounds.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const heroBackground = heroBackgrounds[heroBackgroundIndex];


  return <>
    <section className="catalog-hero">
      <div
        className="catalog-hero__image"
        style={{ backgroundImage: `url(${heroBackground})` }}
        aria-hidden="true"
      />
      <div className="catalog-hero__shade" />
      <div className="catalog-hero__inner">
        <div className="catalog-hero__content">
          <p className="catalog-hero__greeting">
            <span className="catalog-hero__greeting-line" aria-hidden="true" />
            <span className="catalog-hero__greeting-text">{customerName ? <>Welcome to SulitCart, <span className="catalog-hero__customer">{customerName}</span>!</> : "Your neighborhood shop, online"}</span>
          </p>
          <h1 className="catalog-hero__brand">SulitCart<span>.</span></h1>
          <p className="catalog-hero__tagline">Quality products. Simple shopping.</p>
          <div className="catalog-hero__actions">
            <div className="catalog-hero__primary-actions">
              <Link to="/products"><Button variant="light" size="lg" className="catalog-hero__shop">Shop now <ArrowRight size={16} /></Button></Link>
              {dashboardPath && <Link to={dashboardPath}><Button variant="secondary" size="lg" className="catalog-hero__browse"><ArrowLeft size={16} />Back to Dashboard</Button></Link>}
            </div>
            <Link to="/categories"><Button variant="secondary" size="lg" className="catalog-hero__browse">Browse categories</Button></Link>
          </div>
        </div>
      </div>
      <div className="catalog-hero__underline" />
    </section>

    <section className="catalog-section catalog-section--categories">
      <div className="catalog-section__header">
        <div><p className="catalog-section__eyebrow">Browse the store</p><h2 className="catalog-section__heading">A little bit of everything</h2></div>
        <Link to="/categories" className="catalog-section__link catalog-section__link--desktop">All categories <ArrowRight size={15} /></Link>
      </div>
      <div className="catalog-categories-grid">
        {categories.slice(0, 6).map((category) => <CategoryLink key={category.id} category={category} />)}
      </div>
    </section>

    <section className="catalog-section">
      <div className="catalog-section__header">
        <div><p className="catalog-section__eyebrow">Picked for your everyday</p><h2 className="catalog-section__heading">Everyday favorites</h2></div>
        <Link to="/products" className="catalog-section__link">See all <ArrowRight size={15} /></Link>
      </div>
      <div className="catalog-featured-grid">{featured.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </section>

    <section className="catalog-section">
      <div className="catalog-delivery">
        <div className="catalog-delivery__content"><p className="catalog-section__eyebrow">Close to home</p><h2 className="catalog-section__heading">Local delivery, made simple.</h2><p className="catalog-delivery__description">Order everyday essentials from SulitCart and have them delivered across Nueva Ecija.</p></div>
        <div className="catalog-delivery__location"><span className="catalog-delivery__icon"><MapPin size={21} /></span><div><p className="catalog-delivery__city">Cabanatuan City</p><p className="catalog-delivery__province">Nueva Ecija, Philippines</p></div></div>
      </div>
    </section>
  </>;
}

export function CategoriesPage() {
  const { categories } = useStore();
  return <div className="catalog-page">
    <PageTitle eyebrow="A good place to start" title="Shop by category" description="Find your next favorite, from useful tech to everyday home essentials." />
    <div className="catalog-category-page-grid">
      {categories.map((category) => <CategoryLink key={category.id} category={category} />)}
    </div>
  </div>;
}

export function ProductsPage() {
  const { products, categories } = useStore();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");
  const selected = categories.some((category) => category.id === params.get("category")) ? params.get("category") : "all";
  const filtered = useMemo(() => {
    let results = products.filter((product) => product.active && product.name.toLowerCase().includes(query.toLowerCase()) && (selected === "all" || product.category === selected));
    if (sort === "price-low") results = [...results].sort((a, b) => a.price - b.price);
    if (sort === "price-high") results = [...results].sort((a, b) => b.price - a.price);
    if (sort === "name") results = [...results].sort((a, b) => a.name.localeCompare(b.name));
    return results;
  }, [products, query, selected, sort]);
  return <div className="catalog-page">
    <PageTitle eyebrow="Find your everyday favorites" title="All products" description="Thoughtful picks from the neighborhood, ready for your basket." />
    <div className="catalog-filters">
      <label className="catalog-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" /></label>
      <div className="catalog-filters__selects">
        <label className="catalog-select catalog-select--category"><span className="catalog-visually-hidden">Category</span><SlidersHorizontal size={14} className="catalog-select__leading-icon" /><select value={selected} onChange={(event) => setParams(event.target.value === "all" ? {} : { category: event.target.value })}>
          <option value="all">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select><ChevronDown size={14} className="catalog-select__trailing-icon" /></label>
        <label className="catalog-select"><span className="catalog-visually-hidden">Sort products</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select><ChevronDown size={14} className="catalog-select__trailing-icon" /></label>
      </div>
    </div>
    <p className="catalog-results-count">Showing {filtered.length} {filtered.length === 1 ? "product" : "products"}</p>
    {filtered.length ? <div className="catalog-products-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyState icon={Search} title="No products found" description="Try another search or choose a different category." action={<Button variant="secondary" onClick={() => { setQuery(""); setParams({}); }}>Clear filters</Button>} />}
  </div>;
}

export function ProductDetailsPage() {
  const { id } = useParams();
  const { products, categories, addToCart } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const product = products.find((item) => item.id === id);
  if (!product) return <div className="catalog-not-found"><EmptyState icon={ShoppingBag} title="Product not found" description="This product may have been removed from the shelves." action={<Link to="/products"><Button>Back to products</Button></Link>} /></div>;
  const category = categories.find((item) => item.id === product.category)?.name || "General";
  const stock = getStockStatus(product);
  const handleAdd = () => {
    if (addToCart(product.id, quantity)) {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1400);
    }
  };
  return <div className="product-details-page">
    <Link to="/products" className="product-details__back"><ArrowLeft size={16} /> Back to products</Link>
    <div className="product-details">
      <div className="product-details__media"><img src={product.image} alt={product.name} /></div>
      <div className="product-details__content">
        <p className="product-details__category">{category}</p>
        <h1 className="product-details__name">{product.name}</h1>
        <div className="product-details__price"><span>{formatPHP(product.price)}</span><span>/ {product.unit || "item"}</span></div>
        <p className="product-details__description">{product.description}</p>
        <div className="product-details__metadata">
          <div><p className="product-details__label">Product code</p><p className="product-details__code">{product.sku}</p></div>
          <div><p className="product-details__label">Availability</p><div className="product-details__stock"><StatusBadge status={stock} /><span>{product.stock} available</span></div></div>
        </div>
        <div className="product-details__purchase">
          <div className="product-details__quantity">
            <button onClick={() => setQuantity((current) => Math.max(1, current - 1))} disabled={quantity <= 1} aria-label="Decrease quantity"><Minus size={15} /></button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity((current) => Math.min(product.stock, current + 1))} disabled={quantity >= product.stock} aria-label="Increase quantity"><Plus size={15} /></button>
          </div>
          <Button className="product-details__add" size="lg" disabled={stock === "Out of Stock"} onClick={handleAdd}>{added ? <><Check size={17} /> Added to cart</> : <><ShoppingBag size={17} /> Add to cart</>}</Button>
        </div>
        <p className="product-details__delivery-note">Local delivery available within Nueva Ecija.</p>
      </div>
    </div>
  </div>;
}