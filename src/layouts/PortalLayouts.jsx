import { useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useStore } from "../context/StoreContext";
import Alert, { useAlert } from "../components/Alert";
import PageTransition from "../components/PageTransition";
import useAnimatedVisibility from "../hooks/useAnimatedVisibility";
import { Brand } from "./StoreLayout";
import "../css/PortalLayouts.css";

const adminLinks = [
  ["Dashboard", "/admin"],
  ["Products", "/admin/products"],
  ["Categories", "/admin/categories"],
  ["Inventory", "/admin/inventory"],
  ["Orders", "/admin/orders"],
  ["Customers", "/admin/customers"],
  ["Staff", "/admin/staff"],
  ["Shipping", "/admin/shipping"],
  ["Audit logs", "/admin/audit-logs"],
  ["Reports", "/admin/reports"],
  ["Analytics", "/admin/analytics"],
];

const staffLinks = [
  ["Dashboard", "/staff"],
  ["Online orders", "/staff/orders"],
  ["Walk-in sales", "/staff/walk-in-sales"],
  ["Profile", "/staff/profile"],
];

function SideMenu({ links, mode, onNavigate, user, onLogout }) {
  const label = mode === "admin" ? "Store administration" : "Store operations";
  return <div className="portal-sidebar">
    <div className="portal-sidebar__brand"><Brand light onClick={onNavigate} /></div>
    <div className="portal-sidebar__intro"><p className="portal-sidebar__label">{label}</p><p className="portal-sidebar__workspace">{mode === "admin" ? "Admin workspace" : "Staff workspace"}</p></div>
    <nav className="portal-sidebar__nav" aria-label={`${mode} navigation`}>
      {links.map(([labelText, to]) => <NavLink key={to} end={to === `/${mode}`} to={to} onClick={onNavigate} className={({ isActive }) => `portal-sidebar__link ${isActive ? "portal-sidebar__link--active" : ""}`}>
        {labelText}
      </NavLink>)}
    </nav>
    <div className="portal-sidebar__footer">
      <Link to="/" onClick={onNavigate} className="portal-sidebar__store">View customer store</Link>
      <div className="portal-sidebar__account">
        <div className="portal-sidebar__identity"><p className="portal-sidebar__name">{user?.name || (mode === "admin" ? "Lea Navarro" : "Marco Santos")}</p><p className="portal-sidebar__role">{user?.role || mode}</p></div>
        <button onClick={onLogout} className="portal-sidebar__logout">Log out</button>
      </div>
    </div>
  </div>;
}

function PortalShell({ mode, links }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawer = useAnimatedVisibility(mobileOpen);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authLoading, logout, storageError } = useStore();
  const { notify, dismiss } = useAlert();
  const routeLabel = links.find(([, to]) => to === location.pathname)?.[0] || mode;
  const handleLogout = () => {
    setMobileOpen(false);
    logout();
    dismiss("checkout-sign-in");
    notify("Signed out successfully.", { id: "account-session" });
    navigate("/", { replace: true });
  };
  if (authLoading) return <div className="portal-loading" role="status" aria-live="polite">
    <span className="portal-loading__spinner" aria-hidden="true" />
    <span className="portal-loading__brand">SulitCart<span>.</span></span>
  </div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "staff" && mode === "admin") return <Navigate to="/staff" replace />;
  if (user.role === "customer" && mode !== "customer") return <Navigate to="/profile" replace />;
  if (user?.role === "admin" && mode === "staff") return <Navigate to="/admin" replace />;
  return <div className="portal-layout">
    <aside className="portal-layout__desktop-sidebar"><SideMenu links={links} mode={mode} user={user} onLogout={handleLogout} /></aside>
    {drawer.rendered && <div className={`portal-drawer-overlay ${drawer.closing ? "portal-drawer-overlay--closing" : ""}`} inert={drawer.closing ? true : undefined}><button onClick={() => setMobileOpen(false)} className="portal-drawer-overlay__backdrop" aria-label="Close sidebar" /><aside id="portal-mobile-navigation" className="portal-drawer"><div className="portal-drawer__close-wrap"><button className="portal-drawer__close" aria-label="Close sidebar" onClick={() => setMobileOpen(false)}><X size={20} aria-hidden="true" /></button></div><SideMenu links={links} mode={mode} user={user} onLogout={handleLogout} onNavigate={() => setMobileOpen(false)} /></aside></div>}
    <div className="portal-layout__body">
      <header className="portal-header">
        <div className="portal-header__left"><button onClick={() => setMobileOpen(true)} className="portal-header__menu" aria-label="Open sidebar" aria-expanded={mobileOpen} aria-controls="portal-mobile-navigation"><Menu size={20} aria-hidden="true" /></button><div className="portal-header__title-wrap"><p className="portal-header__eyebrow">{mode} workspace</p><p className="portal-header__title">{routeLabel}</p></div></div>
        <div className="portal-header__account"><span className="portal-header__name">{user?.name?.split(" ")[0] || (mode === "admin" ? "Lea" : "Marco")}</span></div>
      </header>
      <main className="portal-content">
        <Alert message={storageError} type="warning" duration={0} />
        <PageTransition><Outlet /></PageTransition>
      </main>
    </div>
  </div>;
}

export function AdminLayout() { return <PortalShell mode="admin" links={adminLinks} />; }
export function StaffLayout() { return <PortalShell mode="staff" links={staffLinks} />; }