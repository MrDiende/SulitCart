import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { MapPin, Menu, ShoppingCart, X } from "lucide-react";
import { useStore } from "../context/StoreContext";
import Alert from "../components/Alert";
import PageTransition from "../components/PageTransition";
import useAnimatedVisibility from "../hooks/useAnimatedVisibility";
import "../css/StoreLayout.css";

export function Brand({ light = false, onClick }) {
  return <Link to="/" onClick={onClick} className={`store-brand ${light ? "store-brand--light" : ""}`} aria-label="SulitCart home">
    <span>SulitCart<span className="store-brand__dot">.</span></span>
  </Link>;
}

const navLinks = [
  { to: "/", label: "Home", end: true },
  { to: "/categories", label: "Categories" },
  { to: "/products", label: "Products" },
  { to: "/orders", label: "Orders", requiresSignIn: true },
  { to: "/profile", label: "Profile", requiresSignIn: true },
];

export default function StoreLayout() {
  const [open, setOpen] = useState(false);
  const drawer = useAnimatedVisibility(open);
  const { cart, user, authLoading, storageError } = useStore();
  const location = useLocation();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const accountPath = user?.role === "admin" ? "/admin" : user?.role === "staff" ? "/staff/profile" : user ? "/profile" : "/login";
  const displayLinks = navLinks.filter((link) => !link.requiresSignIn || Boolean(user)).map((link) => {
    if (link.label === "Orders" && user?.role === "staff") return { ...link, to: "/staff/orders", label: "Online orders" };
    if (link.label === "Orders" && user?.role === "admin") return { ...link, to: "/admin/orders" };
    if (link.label === "Profile" && user?.role === "staff") return { ...link, to: "/staff/profile" };
    if (link.label === "Profile" && user?.role === "admin") return { ...link, to: "/admin" };
    return link;
  });
  const activeLink = (isActive) => `store-nav__link ${isActive ? "store-nav__link--active" : ""}`;

  if (authLoading) return <div className="portal-loading" role="status" aria-live="polite">
    <span className="portal-loading__spinner" aria-hidden="true" />
    <span className="portal-loading__brand">SulitCart<span>.</span></span>
  </div>;

  return <div className="store-layout">
    <header className="store-header">
      <div className="store-header__inner">
        <Brand />
        <nav className="store-nav" aria-label="Main navigation">
          {displayLinks.map((link) => <NavLink key={link.label} to={link.to} end={link.end} className={({ isActive }) => activeLink(isActive)}>{link.label}</NavLink>)}
        </nav>
        <div className="store-header__desktop-actions">
          <Link to="/cart" aria-label={`Cart with ${cartCount} items`} className={`store-header__cart ${location.pathname === "/cart" ? "store-header__cart--active" : ""}`}>
            <ShoppingCart size={20} aria-hidden="true" />
            {cartCount > 0 && <span className="store-header__count" aria-hidden="true">{cartCount}</span>}
          </Link>
          <Link to={user ? (user.role === "customer" ? "/profile" : user.role === "admin" ? "/admin" : "/staff") : "/login"} className="store-header__account">
            {user ? user.name.split(" ")[0] : "Sign in"}
          </Link>
        </div>
        <div className="store-header__mobile-actions">
          <Link to="/cart" aria-label={`Cart with ${cartCount} items`} className="store-header__cart store-header__cart--mobile">
            <ShoppingCart size={20} aria-hidden="true" />
            {cartCount > 0 && <span className="store-header__count store-header__count--mobile" aria-hidden="true">{cartCount}</span>}
          </Link>
          <button className="store-header__menu" onClick={() => setOpen(true)} aria-label="Open navigation" aria-expanded={open} aria-controls="store-mobile-navigation"><Menu size={21} aria-hidden="true" /></button>
        </div>
      </div>
    </header>

    {drawer.rendered && <div className={`store-drawer-overlay ${drawer.closing ? "store-drawer-overlay--closing" : ""}`} inert={drawer.closing ? true : undefined}>
      <button className="store-drawer-overlay__backdrop" onClick={() => setOpen(false)} aria-label="Close navigation overlay" />
      <aside className="store-drawer">
        <div className="store-drawer__header"><Brand onClick={() => setOpen(false)} /><button onClick={() => setOpen(false)} className="store-drawer__close" aria-label="Close menu"><X size={20} aria-hidden="true" /></button></div>
        <nav id="store-mobile-navigation" className="store-drawer__nav" aria-label="Mobile navigation">
          {displayLinks.map((link) => <NavLink key={link.label} to={link.to} end={link.end} onClick={() => setOpen(false)} className={({ isActive }) => `store-drawer__link ${isActive ? "store-drawer__link--active" : ""}`}>{link.label}</NavLink>)}
          <NavLink to="/cart" onClick={() => setOpen(false)} className="store-drawer__link">Cart {cartCount > 0 && <span className="store-drawer__count">({cartCount})</span>}</NavLink>
        </nav>
        <div className="store-drawer__footer">
          <Link to={accountPath} onClick={() => setOpen(false)} className="store-drawer__account">{user ? "My account" : "Sign in"}</Link>
          <p>Serving Cabanatuan City and Nueva Ecija</p>
        </div>
      </aside>
    </div>}

    <main>
      <Alert message={storageError} type="warning" duration={0} />
      <PageTransition><Outlet /></PageTransition>
    </main>
    <footer className="store-footer">
      <div className="store-footer__inner">
        <div><Brand /><p className="store-footer__tagline">Quality products. Simple shopping.</p></div>
        <div className="store-footer__address"><MapPin size={15} />Cabanatuan City, Nueva Ecija</div>
        <p className="store-footer__coverage">Delivery across Nueva Ecija only.</p>
      </div>
    </footer>
  </div>;
}