import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3 } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import usePersistentDraft from "../../hooks/usePersistentDraft";
import { formatDate, formatPHP, getStockStatus } from "../../utils";
import { PageTitle, StatusBadge, Surface, TableWrap, thClass, tdClass } from "../../components/UI";
import SalesChart from "../../components/SalesChart";
import "../../css/OverviewPages.css";

function Metric({ label, value, note }) {
  return <div className="overview-metric"><div className="overview-metric__header"><p>{label}</p></div><p className="overview-metric__value">{value}</p>{note && <p className="overview-metric__note">{note}</p>}</div>;
}

function MiniTableHeading({ title, link, to }) {
  return <div className="overview-table-heading"><h2>{title}</h2>{link && <Link to={to}>{link}<ArrowRight size={13} /></Link>}</div>;
}

export function AdminDashboardPage() {
  const { products, orders, customers } = useStore();
  const lowStock = products.filter((product) => product.stock <= product.threshold);
  const pending = orders.filter((order) => order.status === "Pending").length;
  const complete = orders.filter((order) => order.status === "Completed");
  const sales = orders.filter((order) => order.status === "Completed").reduce((sum, order) => sum + order.total, 0);
  const recent = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const stats = [
    ["Total products", products.length, "Across the active catalog"],
    ["Pending orders", pending, "Ready for your attention"],
    ["Completed orders", complete.length, "Online and walk-in orders"],
    ["Customers", customers.length, "Registered shoppers"],
    ["Low stock", lowStock.length, "At or below low stock alert"],
    ["Total sales", formatPHP(sales), "Online and walk-in sales to date"],
  ];
  return <>
    <PageTitle eyebrow="A quick look at your store" title="Dashboard" description="Keep your shop moving, one good order at a time." action={<span className="overview-date">{new Date().toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })}</span>} />
    <div className="overview-metrics-grid">{stats.map(([label, value, note]) => <Metric key={label} {...{ label, value, note }} />)}</div>
    <div className="overview-dashboard-sections">
      <Surface className="overview-table"><MiniTableHeading title="Recent orders" link="All orders" to="/admin/orders" /><TableWrap><thead><tr>{["Order", "Customer", "Date", "Total", "Status"].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead><tbody>{recent.map((order) => <tr key={order.id} className="ui-table-row"><td className={`${tdClass} ui-table-cell--strong`}>{order.number}</td><td className={tdClass}>{order.customer}</td><td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small ui-table-cell--muted`}>{formatDate(order.date)}</td><td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--medium`}>{formatPHP(order.total)}</td><td className={tdClass}><StatusBadge status={order.status} /></td></tr>)}</tbody></TableWrap></Surface>
      <Surface className="overview-table"><MiniTableHeading title="Low stock products" link="Manage inventory" to="/admin/inventory" />
        {lowStock.length ? <div className="overview-stock-list">{lowStock.slice(0, 6).map((product) => <div key={product.id} className="overview-stock-item"><img src={product.image} alt="" /><div className="overview-stock-item__info"><p>{product.name}</p><p>Product code: {product.sku}</p></div><div className="overview-stock-item__quantity"><p>{product.stock}</p><p>Low stock alert: {product.threshold}</p></div></div>)}</div> : <p className="overview-empty">No low stock alerts. All products are well stocked.</p>}
      </Surface>
    </div>
  </>;
}

const periods = [{ label: "Today", days: 1 }, { label: "7 days", days: 7 }, { label: "30 days", days: 30 }, { label: "3 months", days: 90 }];

function periodOrders(orders, days) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days + 1);
  return orders.filter((order) => {
    const timestamp = new Date(order.date).getTime();
    return timestamp >= cutoff.getTime() && timestamp <= now.getTime();
  });
}

function DateFilter({ period, setPeriod }) {
  return <div className="overview-period-filter">{periods.map((item) => <button key={item.label} onClick={() => setPeriod(item.days)} className={`overview-period-filter__button ${period === item.days ? "overview-period-filter__button--active" : ""}`}>{item.label}</button>)}</div>;
}

export function ReportsPage() {
  const { orders, products, customers, user } = useStore();
  const [period, setPeriod] = usePersistentDraft(`sulitcart:report-period:${user?.id || "anonymous"}`, 30);
  const filtered = useMemo(() => periodOrders(orders, period), [orders, period]);
  const periodLabel = periods.find((item) => item.days === period)?.label || `${period} days`;
  const completed = filtered.filter((order) => order.status === "Completed");
  const sales = completed.reduce((sum, order) => sum + order.total, 0);
  const sold = completed.reduce((sum, order) => sum + order.items.reduce((quantity, item) => quantity + item.quantity, 0), 0);
  const inventoryValue = products.reduce((sum, product) => sum + product.price * product.stock, 0);
  const summary = [["Total sales", formatPHP(sales)], ["Orders", filtered.length], ["Products sold", sold], ["Inventory items", products.reduce((sum, product) => sum + product.stock, 0)], ["Customers", customers.length]];
  return <>
    <PageTitle eyebrow="Simple store performance" title="Reports" description="A useful snapshot of sales, orders, and inventory." action={<DateFilter period={period} setPeriod={setPeriod} />} />
    <div className="overview-report-metrics">{summary.map(([label, value], index) => <div className="overview-report-metric" key={label}><p>{label}</p><p>{value}</p><p>{index === 0 || index === 1 || index === 2 ? periodLabel : "Current snapshot"}</p></div>)}</div>
    <div className="overview-report-columns">
      <Surface className="overview-chart-panel"><div className="overview-chart-panel__header"><div><h2>Sales summary</h2><p>Completed orders in the selected period</p></div><BarChart3 size={18} /></div><div className="overview-sales-total"><p>{formatPHP(sales)}</p><span>{completed.length} completed</span></div><SalesChart orders={orders} days={period} /></Surface>
      <Surface className="overview-table"><div className="overview-panel-heading"><h2>Inventory summary</h2><p>Current catalog health</p></div><div className="overview-inventory-summary"><div><span>Total products</span><span>{products.length}</span></div><div><span>Units in stock</span><span>{products.reduce((sum, product) => sum + product.stock, 0)}</span></div><div><span>Low or out of stock</span><span className="overview-inventory-summary__low">{products.filter((product) => product.stock <= product.threshold).length}</span></div><div className="overview-inventory-summary__value"><span>Estimated inventory value</span><span>{formatPHP(inventoryValue)}</span></div></div></Surface>
    </div>
    <Surface className="overview-table overview-table--report"><div className="overview-panel-heading"><h2>Orders in this period</h2></div><TableWrap><thead><tr>{["Order", "Customer", "Date", "Items", "Total", "Status"].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead><tbody>{filtered.length ? filtered.slice(0, 10).map((order) => <tr key={order.id}><td className={`${tdClass} ui-table-cell--strong`}>{order.number}</td><td className={tdClass}>{order.customer}</td><td className={`${tdClass} ui-table-cell--small ui-table-cell--muted`}>{formatDate(order.date)}</td><td className={tdClass}>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td><td className={tdClass}>{formatPHP(order.total)}</td><td className={tdClass}><StatusBadge status={order.status} /></td></tr>) : <tr><td className={`${tdClass} ui-table-cell--empty`} colSpan="6">No orders in the selected period.</td></tr>}</tbody></TableWrap></Surface>
  </>;
}

export function AnalyticsPage() {
  const { orders, products } = useStore();
  const completed = orders.filter((order) => order.status === "Completed");
  const statusNames = ["Pending", "Confirmed", "Packed", "Shipped", "Completed", "Cancelled"];
  const topProducts = Object.values(orders.flatMap((order) => order.items.map((item) => ({ ...item, status: order.status }))).filter((item) => item.status !== "Cancelled").reduce((acc, item) => {
    const product = acc[item.productId] || { ...item, quantity: 0 };
    product.quantity += item.quantity;
    acc[item.productId] = product;
    return acc;
  }, {})).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const statusTotal = Math.max(orders.length, 1);
  const lowStock = products.filter((product) => product.stock <= product.threshold).length;
  return <>
    <PageTitle eyebrow="Patterns at a glance" title="Analytics" description="A lightweight overview of sales, order flow, and stock." />
    <div className="overview-analytics-columns">
      <Surface className="overview-chart-panel"><div className="overview-chart-panel__header"><div><h2>Sales overview</h2><p>Completed orders · last 7 days</p></div><span className="overview-chart-panel__sales"><span>{formatPHP(completed.reduce((sum, order) => sum + order.total, 0))}</span><span>total completed sales</span></span></div><SalesChart orders={orders} days={7} /></Surface>
      <Surface className="overview-chart-panel"><h2 className="overview-panel-title">Order status overview</h2><p className="overview-panel-description">All current orders</p><div className="overview-status-chart">{statusNames.map((status) => { const count = orders.filter((order) => order.status === status).length; return <div key={status} className="overview-status-chart__row"><span className="overview-status-chart__label">{status}</span><progress className="overview-status-chart__bar" value={count} max={statusTotal} aria-label={`${status}: ${count} orders`}>{count}</progress><span className="overview-status-chart__count">{count}</span></div>; })}</div></Surface>
    </div>
    <div className="overview-product-columns">
      <Surface className="overview-table"><div className="overview-panel-heading"><h2>Top-selling products</h2><p>Based on units in non-cancelled orders</p></div>{topProducts.length ? <div className="overview-product-list">{topProducts.map((item, index) => <div className="overview-product-item" key={item.productId}><span className="overview-product-item__rank">0{index + 1}</span><img src={item.image} alt="" /><p>{item.name}</p><span className="overview-product-item__sold">{item.quantity} sold</span></div>)}</div> : <p className="overview-empty">No product sales to report.</p>}</Surface>
      <Surface className="overview-table"><div className="overview-panel-heading"><h2>Inventory overview</h2><p>Current available units by product</p></div><div className="overview-product-list">{products.slice(0, 5).map((product) => <div key={product.id} className="overview-product-item overview-product-item--inventory"><img src={product.image} alt="" /><p>{product.name}</p><span className="overview-product-item__stock">{product.stock}</span><StatusBadge status={getStockStatus(product)} /></div>)}</div><div className="overview-inventory-footer"><span>{lowStock} product{lowStock === 1 ? "" : "s"} need attention</span><Link to="/admin/inventory">Open inventory</Link></div></Surface>
    </div>
  </>;
}