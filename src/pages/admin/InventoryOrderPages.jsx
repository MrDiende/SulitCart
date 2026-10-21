import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDate, formatPHP, getStockStatus, isOnlineOrder } from "../../utils";
import { useStore } from "../../context/StoreContext";
import { ArrowRight, ClipboardList, Eye, Plus, ReceiptText, Search, X } from "lucide-react";
import Alert from "../../components/Alert";
import InventoryTransactionHistory from "../../components/InventoryTransactionHistory";
import StockAdjustmentModal from "../../components/StockAdjustmentModal";
import WalkInSalesRecords from "./WalkInSalesRecords";
import { PRODUCT_IMAGE_PLACEHOLDER } from "../../utils/productImage";
import { Button, Field, Modal, PageTitle, SelectInput, StatusBadge, Surface, TableWrap, thClass, tdClass } from "../../components/UI";
import "../../css/InventoryOrderPages.css";

export function AdminInventoryPage() {
  const { products, categories, inventory, adjustStock } = useStore();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockDialog, setStockDialog] = useState(null);
  const [feedback, setFeedback] = useState("");
  const filtered = useMemo(() => products.filter((product) =>
    `${product.name} ${product.sku}`.toLowerCase().includes(query.trim().toLowerCase())
    && (categoryFilter === "all" || product.category === categoryFilter)
    && (statusFilter === "all" || getStockStatus(product) === statusFilter)
  ), [products, query, categoryFilter, statusFilter]);
  const lastChange = (id) => inventory.find((entry) => entry.productId === id)?.date;
  const saveStock = async (productId, quantity, note) => {
    const result = await adjustStock(productId, quantity, note);
    if (result?.error) return result;
    const product = products.find((item) => item.id === productId);
    setFeedback(`${Math.abs(quantity)} ${quantity > 0 ? "added to" : "removed from"} ${product.name}. New stock: ${result.product.stock}.`);
    return result;
  };

  return <>
    <PageTitle eyebrow="Stock on hand" title="Inventory" description={`${products.filter((product) => product.stock <= product.threshold).length} products at or below their low stock threshold.`} action={<div className="admin-inventory-filters">
      <Field label="Category" className="admin-inventory-filters__field">
        <SelectInput value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </SelectInput>
      </Field>
      <Field label="Status" className="admin-inventory-filters__field">
        <SelectInput value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="In Stock">In stock</option>
          <option value="Low Stock">Low stock</option>
        </SelectInput>
      </Field>
    </div>} />
    <Alert message={feedback} onDismiss={() => setFeedback("")} />
    <div className="admin-inventory-metrics"><div className="admin-inventory-metric"><p>In stock</p><p>{products.filter((product) => getStockStatus(product) === "In Stock").length}</p></div><div className="admin-inventory-metric admin-inventory-metric--low"><p>Low stock</p><p>{products.filter((product) => getStockStatus(product) === "Low Stock").length}</p></div><div className="admin-inventory-metric admin-inventory-metric--out"><p>Out of stock</p><p>{products.filter((product) => getStockStatus(product) === "Out of Stock").length}</p></div></div>
    <Surface className="admin-inventory-table"><div className="admin-inventory-table__toolbar"><p role="status">Showing {filtered.length} of {products.length} products.</p><label className="admin-inventory-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or product code" /></label></div>
      <TableWrap>
        <thead><tr>{["Product", "Product code", "Current stock", "Low stock at", "Status", "Last updated", "Actions"].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead>
        <tbody>{filtered.length ? filtered.map((product) => <tr key={product.id}>
          <td className={tdClass}><div className="admin-inventory-product"><img src={product.image || PRODUCT_IMAGE_PLACEHOLDER} alt="" /><span>{product.name}</span></div></td>
          <td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small ui-table-cell--muted`}>{product.sku}</td>
          <td className={`${tdClass} ui-table-cell--strong`}>{product.stock}</td>
          <td className={`${tdClass} ui-table-cell--muted`}>{product.threshold}</td>
          <td className={tdClass}><StatusBadge status={getStockStatus(product)} /></td>
          <td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small ui-table-cell--muted`}>{formatDate(lastChange(product.id))}</td>
          <td className={tdClass}><Button size="sm" variant="secondary" className="ui-button--nowrap" onClick={() => setStockDialog({ productId: product.id, addOnly: true })}><Plus size={13} />Add stock</Button></td>
        </tr>) : <tr><td colSpan="7" className={`${tdClass} ui-table-cell--empty`}>No products match your search and filters.</td></tr>}</tbody>
      </TableWrap>
    </Surface>
    <InventoryTransactionHistory transactions={inventory} products={products} />
    {stockDialog && <StockAdjustmentModal open onClose={() => setStockDialog(null)} products={products} categories={categories} onSave={saveStock} defaultProductId={stockDialog.productId} addOnly={stockDialog.addOnly} />}
  </>;
}

const nextOrderStatus = { Pending: "Confirmed", Confirmed: "Packed", Packed: "Shipped", Shipped: "Completed" };

function OrderDetailsModal({ order, onClose }) {
  if (!order) return null;
  return <Modal open={!!order} onClose={onClose} title={order.number} description={`${order.customer} · ${formatDate(order.date)}`}>
    <div className="admin-order-details__items">{order.items.map((item, index) => <div key={`${item.productId}-${index}`} className="admin-order-details__item"><img src={item.image} alt="" /><p>{item.name}<span>× {item.quantity}</span></p><span>{formatPHP(item.price * item.quantity)}</span></div>)}</div>
    <div className="admin-order-details__summary"><p><span>Payment</span><span>{order.payment}</span></p><p><span>Delivery to</span><span className="admin-order-details__address">{order.address}</span></p><p className="admin-order-details__total"><span>Total</span><span>{formatPHP(order.total)}</span></p></div>
    <div className="admin-order-details__actions"><StatusBadge status={order.status} /></div>
  </Modal>;
}

function OnlineOrdersPanel() {
  const { orders, changeOrderStatus } = useStore();
  const [status, setStatus] = useState("All orders");
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState("");
  const updateStatus = async (orderId, nextStatus) => {
    try {
      const result = await changeOrderStatus(orderId, nextStatus);
      setFeedback(result?.error || "");
    } catch (error) {
      setFeedback(error.message || "Could not update order status.");
    }
  };
  const onlineOrders = orders.filter(isOnlineOrder);
  const statuses = ["All orders", "Pending", "Confirmed", "Packed", "Shipped", "Completed", "Cancelled"];
  const filtered = onlineOrders.filter((order) => status === "All orders" || order.status === status).sort((a, b) => new Date(b.date) - new Date(a.date));
  return <>
    <div className="admin-online-orders__filter-wrap">
      <Field label="Status" className="admin-online-orders__filter">
        <SelectInput value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter online orders by status">
          {statuses.map((item) => <option key={item} value={item}>{item === "All orders" ? "All statuses" : item}</option>)}
        </SelectInput>
      </Field>
    </div>
    <Alert message={feedback} type="error" onDismiss={() => setFeedback("")} />
    <Surface className="admin-online-orders">
      <TableWrap><thead><tr>{["Order number", "Customer", "Date", "Items", "Total", "Payment", "Status", "Actions"].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead><tbody>{filtered.length ? filtered.map((order) => <tr key={order.id} className="ui-table-row"><td className={`${tdClass} ui-table-cell--strong`}>{order.number}</td><td className={tdClass}><div className="admin-online-orders__customer">{order.customer}</div><div className="admin-online-orders__phone">{order.phone}</div></td><td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small ui-table-cell--muted`}>{formatDate(order.date)}</td><td className={tdClass}>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td><td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--medium`}>{formatPHP(order.total)}</td><td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small`}>{order.payment || "COD"}</td><td className={tdClass}><StatusBadge status={order.status} /></td><td className={tdClass}><div className="admin-online-orders__actions"><button onClick={() => setSelected(order)} title="View order" className="admin-online-orders__icon-action"><Eye size={15} /></button>{nextOrderStatus[order.status] && <Button size="sm" className="admin-online-orders__advance" onClick={() => updateStatus(order.id, nextOrderStatus[order.status])}><span className="admin-online-orders__next-status">{nextOrderStatus[order.status]}</span><ArrowRight size={13} /></Button>}{["Pending", "Confirmed", "Packed"].includes(order.status) && <button onClick={() => window.confirm(`Cancel ${order.number}?`) && updateStatus(order.id, "Cancelled")} title="Cancel order" className="admin-online-orders__icon-action admin-online-orders__icon-action--cancel"><X size={15} /></button>}</div></td></tr>) : <tr><td className={`${tdClass} ui-table-cell--empty`} colSpan="8">No orders with this status.</td></tr>}</tbody></TableWrap>
    </Surface>
    <OrderDetailsModal order={selected} onClose={() => setSelected(null)} />
  </>;
}

export function AdminOrdersPage() {
  const { orders } = useStore();
  const [searchParams] = useSearchParams();
  const view = searchParams.get("type") === "walk-in" ? "walk-in" : "online";
  const onlineOrders = orders.filter(isOnlineOrder);
  const pendingCount = onlineOrders.filter((order) => ["Pending", "Confirmed", "Packed"].includes(order.status)).length;
  const tabs = [
    { id: "online", label: "Online orders", to: "/admin/orders", icon: ClipboardList, count: onlineOrders.length },
    { id: "walk-in", label: "Walk-in sales", to: "/admin/orders?type=walk-in", icon: ReceiptText, count: orders.length - onlineOrders.length },
  ];

  return <>
    <PageTitle eyebrow="Order management" title="Orders" description={view === "online"
      ? `${pendingCount} online orders need processing. Manage confirmations and delivery progress.`
      : "Read-only walk-in sale records. New sales are processed by staff."} />
    <nav aria-label="Order types" className="admin-order-tabs">
      {tabs.map(({ id, label, to, icon: Icon, count }) => <Link
        key={id}
        to={to}
        aria-current={view === id ? "page" : undefined}
        className={`admin-order-tabs__link ${view === id ? "admin-order-tabs__link--active" : ""}`}
      >
        <Icon size={16} />
        <span>{label}</span>
        <span className="admin-order-tabs__count">({count})</span>
      </Link>)}
    </nav>
    {view === "online" ? <OnlineOrdersPanel /> : <WalkInSalesRecords />}
  </>;
}