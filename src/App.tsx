import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { StoreProvider } from "./context/StoreContext";
import { AlertProvider } from "./components/Alert";
import RequireCustomerCheckout from "./components/RequireCustomerCheckout";
import StoreLayout from "./layouts/StoreLayout";
import { AdminLayout, StaffLayout } from "./layouts/PortalLayouts";
import { HomePage, CategoriesPage, ProductsPage, ProductDetailsPage } from "./pages/customer/CatalogPages";
import { CartPage, CheckoutPage, OrdersPage, OrderDetailsPage } from "./pages/customer/CartCheckoutPages";
import { LoginPage, RegisterPage, ProfilePage, AdminProfilePage } from "./pages/customer/AccountPages";
import { AdminDashboardPage, AnalyticsPage, ReportsPage } from "./pages/admin/OverviewPages";
import { AdminProductsPage, AdminCategoriesPage } from "./pages/admin/CatalogManagementPages";
import { AdminInventoryPage, AdminOrdersPage } from "./pages/admin/InventoryOrderPages";
import { AdminAuditPage, AdminCustomersPage, AdminShippingPage, AdminStaffPage } from "./pages/admin/PeopleShippingPages";
import { StaffDashboardPage, StaffOrdersPage, StaffProfilePage, WalkInSalesPage } from "./pages/staff/StaffPages";

function AppRoutes() {
  return <Routes>
    <Route element={<StoreLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:id" element={<ProductDetailsPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<RequireCustomerCheckout><CheckoutPage /></RequireCustomerCheckout>} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/orders/:id" element={<OrderDetailsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Route>

    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<AdminDashboardPage />} />
      <Route path="profile" element={<AdminProfilePage />} />
      <Route path="products" element={<AdminProductsPage />} />
      <Route path="categories" element={<AdminCategoriesPage />} />
      <Route path="inventory" element={<AdminInventoryPage />} />
      <Route path="orders" element={<AdminOrdersPage />} />
      <Route path="customers" element={<AdminCustomersPage />} />
      <Route path="staff" element={<AdminStaffPage />} />
      <Route path="shipping" element={<AdminShippingPage />} />
      <Route path="walk-in-sales" element={<Navigate to="/admin/orders?type=walk-in" replace />} />
      <Route path="audit-logs" element={<AdminAuditPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="analytics" element={<AnalyticsPage />} />
    </Route>

    <Route path="/staff" element={<StaffLayout />}>
      <Route index element={<StaffDashboardPage />} />
      <Route path="orders" element={<StaffOrdersPage />} />
      <Route path="walk-in-sales" element={<WalkInSalesPage />} />
      <Route path="profile" element={<StaffProfilePage />} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

export default function App() {
  return <StoreProvider><AlertProvider><BrowserRouter><AppRoutes /></BrowserRouter></AlertProvider></StoreProvider>;
}