import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Minus, Plus, Search, ShoppingCart, UserRound } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { formatDate, formatPHP } from "../../utils";
import Alert from "../../components/Alert";
import usePersistentDraft from "../../hooks/usePersistentDraft";
import { Button, EmptyState, Field, PageTitle, SelectInput, StatusBadge, Surface, TableWrap, TextInput, thClass, tdClass } from "../../components/UI";
import "../../css/StaffPages.css";

const nextStatus = { Pending: "Confirmed", Confirmed: "Packed", Packed: "Shipped", Shipped: "Completed" };

export function StaffDashboardPage() {
  const { orders } = useStore();
  const active = orders.filter((order) => ["Pending", "Confirmed", "Packed"].includes(order.status));
  const completed = orders.filter((order) => order.status === "Completed");
  const todaysSales = orders.filter((order) => order.status === "Completed" && new Date(order.date).toDateString() === new Date().toDateString()).reduce((sum, order) => sum + order.total, 0);
  const recent = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  return <>
    <PageTitle eyebrow="Store operations" title="Good day" description="Here is what needs attention in the shop today." />
    <div className="staff-metrics"><div className="staff-metric"><p className="staff-metric__label">Orders to process</p><p className="staff-metric__value">{active.length}</p><p className="staff-metric__note">Pending, confirmed, or packed</p></div><div className="staff-metric"><p className="staff-metric__label">Completed orders</p><p className="staff-metric__value">{completed.length}</p><p className="staff-metric__note">Store orders fulfilled</p></div><div className="staff-metric staff-metric--sales"><p className="staff-metric__label">Today's completed sales</p><p className="staff-metric__value">{formatPHP(todaysSales)}</p><p className="staff-metric__note">Including walk-in sales</p></div></div>
    <Surface className="staff-recent-orders"><div className="staff-recent-orders__header"><div><h2>Recent orders</h2><p>Update an order as it moves through fulfilment.</p></div><Link to="/staff/orders">Online orders <ArrowRight size={13} /></Link></div>
      <TableWrap><thead><tr>{["Order", "Customer", "Date", "Total", "Status"].map((label) => <th className={thClass} key={label}>{label}</th>)}</tr></thead><tbody>{recent.map((order) => <tr key={order.id}><td className={`${tdClass} ui-table-cell--strong`}>{order.number}</td><td className={tdClass}>{order.customer}</td><td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small ui-table-cell--muted`}>{formatDate(order.date)}</td><td className={tdClass}>{formatPHP(order.total)}</td><td className={tdClass}><StatusBadge status={order.status} /></td></tr>)}</tbody></TableWrap>
    </Surface>
    <div className="staff-shortcuts"><Link to="/staff/orders" className="staff-shortcut"><span><span className="staff-shortcut__title">Process online orders</span><span className="staff-shortcut__description">Confirm, pack, and update deliveries</span></span><ArrowRight size={17} /></Link><Link to="/staff/walk-in-sales" className="staff-shortcut"><span><span className="staff-shortcut__title">Open walk-in sales</span><span className="staff-shortcut__description">Start a new in-store transaction</span></span><ArrowRight size={17} /></Link></div>
  </>;
}

export function StaffOrdersPage() {
  const { orders, changeOrderStatus, user } = useStore();
  const [status, setStatus] = usePersistentDraft(`sulitcart:staff-order-filter:${user?.id || "anonymous"}`, "Needs action");
  const [error, setError] = useState("");
  const updateStatus = async (orderId, next) => {
    try {
      const result = await changeOrderStatus(orderId, next);
      setError(result?.error || "");
    } catch (updateError) {
      setError(updateError.message || "Could not update order status.");
    }
  };
  const filtered = useMemo(() => orders.filter((order) => status === "All orders" || (status === "Needs action" ? ["Pending", "Confirmed", "Packed"].includes(order.status) : order.status === status)).sort((a, b) => new Date(b.date) - new Date(a.date)), [orders, status]);
  const filters = ["Needs action", "All orders", "Pending", "Confirmed", "Packed", "Shipped", "Completed", "Cancelled"];
  return <>
    <PageTitle eyebrow="Order fulfilment" title="Online orders" description="Process online deliveries and view completed walk-in sales." action={
      <Field label="Status" className="staff-orders__filter">
        <SelectInput value={status} onChange={(event) => setStatus(event.target.value)}>
          {filters.map((filter) => <option key={filter} value={filter}>{filter === "All orders" ? "All statuses" : filter}</option>)}
        </SelectInput>
      </Field>
    } />
    <Alert message={error} type="error" onDismiss={() => setError("")} />
    <Surface className="staff-orders">
      <TableWrap><thead><tr>{["Order", "Customer", "Date", "Items", "Total", "Status", "Update"].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead><tbody>{filtered.length ? filtered.map((order) => <tr key={order.id}><td className={`${tdClass} ui-table-cell--strong`}>{order.number}</td><td className={tdClass}><p className="staff-orders__customer">{order.customer}</p><p className="staff-orders__phone">{order.phone}</p></td><td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small ui-table-cell--muted`}>{formatDate(order.date)}</td><td className={tdClass}>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td><td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--medium`}>{formatPHP(order.total)}</td><td className={tdClass}><StatusBadge status={order.status} /></td><td className={tdClass}>{nextStatus[order.status] ? <Button size="sm" onClick={() => updateStatus(order.id, nextStatus[order.status])}>Mark {nextStatus[order.status]} <ArrowRight size={13} /></Button> : <span className="staff-orders__no-action">No action</span>}</td></tr>) : <tr><td colSpan="7" className={`${tdClass} ui-table-cell--empty`}>No orders in this view.</td></tr>}</tbody></TableWrap>
    </Surface>
  </>;
}

export function WalkInSalesPage() {
  const { products, categories, commitSale, user } = useStore();
  const [filters, setFilters] = usePersistentDraft(`sulitcart:walk-in-sale-filters:${user?.id || "anonymous"}`, { query: "", categoryFilter: "all" });
  const { query, categoryFilter } = filters;
  const setQuery = (value) => setFilters((current) => ({ ...current, query: value }));
  const setCategoryFilter = (value) => setFilters((current) => ({ ...current, categoryFilter: value }));
  const [saleDraft, setSaleDraft, clearSaleDraft, draftError] = usePersistentDraft(
    `sulitcart:walk-in-sale-draft:${user?.id || "anonymous"}`,
    { saleItems: [], customerName: "", payment: "Cash" },
  );
  const { saleItems, customerName, payment } = saleDraft;
  const setSaleItems = (nextItems) => setSaleDraft((current) => ({
    ...current,
    saleItems: typeof nextItems === "function" ? nextItems(current.saleItems) : nextItems,
  }));
  const setCustomerName = (nextName) => setSaleDraft((current) => ({ ...current, customerName: nextName }));
  const setPayment = (nextPayment) => setSaleDraft((current) => ({ ...current, payment: nextPayment }));
  const [message, setMessage] = useState("");
  const filtered = useMemo(() => products.filter((product) => product.active
    && product.stock > 0
    && (categoryFilter === "all" || product.category === categoryFilter)
    && `${product.name} ${product.sku}`.toLowerCase().includes(query.trim().toLowerCase())
  ), [products, categoryFilter, query]);
  const subtotal = saleItems.reduce((sum, item) => sum + (products.find((product) => product.id === item.productId)?.price || 0) * item.quantity, 0);
  const addItem = (product) => setSaleItems((current) => {
    const match = current.find((item) => item.productId === product.id);
    if (match) return current.map((item) => item.productId === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
    return [...current, { productId: product.id, quantity: 1 }];
  });
  const setQuantity = (productId, quantity) => {
    const available = products.find((product) => product.id === productId)?.stock || 0;
    if (quantity < 1) setSaleItems((current) => current.filter((item) => item.productId !== productId));
    else setSaleItems((current) => current.map((item) => item.productId === productId ? { ...item, quantity: Math.min(quantity, available) } : item));
  };
  const [savingSale, setSavingSale] = useState(false);
  const complete = async () => {
    if (!saleItems.length) return;
    if (savingSale) return;
    setSavingSale(true);
    try {
      const sale = await commitSale({ items: saleItems, customerName: customerName.trim() || "Walk-in customer", payment });
      if (!sale) { setMessage("Some items are no longer available in this quantity."); return; }
      if (sale.error) { setMessage(sale.error); return; }
      clearSaleDraft();
      setSaleDraft({ saleItems: [], customerName: "", payment });
      setMessage(`${sale.number} completed. Stock has been updated.`);
    } catch (error) {
      setMessage(error.message || "Could not save this sale.");
    } finally {
      setSavingSale(false);
    }
  };
  if (user?.role !== "staff" || user.active === false) return <EmptyState icon={UserRound} title="Staff sign-in required" description="Walk-in sales are processed using an active staff account." action={<Link to="/login"><Button>Sign in as staff</Button></Link>} />;
  const saleSucceeded = message.startsWith("POS-");
  return <>
    <PageTitle eyebrow="Point of sale" title="Walk-in sales" description="Build a basket, choose a payment method, and complete the sale." />
    <Alert message={message} type={saleSucceeded ? "success" : "warning"} duration={5000} onDismiss={() => setMessage("")} />
    <Alert message={draftError} type="warning" />
    <div className="pos-grid">
      <div className="pos-catalog">
        <div className="pos-filters">
          <Field label="Search products" className="pos-filters__search">
            <div className="pos-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or product code" /></div>
          </Field>
          <Field label="Category" className="pos-filters__category">
            <SelectInput value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="ui-input--touch">
              <option value="all">All categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </SelectInput>
          </Field>
        </div>
        {filtered.length ? <div className="pos-products-grid">{filtered.map((product) => {
          const inSale = saleItems.find((item) => item.productId === product.id)?.quantity || 0;
          return <button key={product.id} onClick={() => addItem(product)} className="pos-product">
            <div className="pos-product__media"><img src={product.image} alt="" />{inSale > 0 && <span className="pos-product__count">{inSale}</span>}</div>
            <div className="pos-product__body"><p className="pos-product__name">{product.name}</p><p className="pos-product__details"><span>{formatPHP(product.price)}</span><span>{product.stock} left</span></p><span className="pos-product__add"><Plus size={14} /> Add</span></div>
          </button>;
        })}</div> : <Surface className="pos-empty"><p>No products match your search and category.</p>{(query || categoryFilter !== "all") && <Button variant="secondary" size="sm" className="pos-empty__clear" onClick={() => { setQuery(""); setCategoryFilter("all"); }}>Clear filters</Button>}</Surface>}
      </div>
      <Surface className="pos-basket"><div className="pos-basket__header"><ShoppingCart size={16} /><h2>Current sale</h2><span>{saleItems.reduce((sum, item) => sum + item.quantity, 0)} items</span></div>
        <div className="pos-basket__items">{saleItems.length ? saleItems.map((item) => { const product = products.find((entry) => entry.id === item.productId); if (!product) return null; return <div key={item.productId} className="pos-basket__item"><img src={product.image} alt="" /><div className="pos-basket__item-info"><p>{product.name}</p><p>{formatPHP(product.price)}</p></div><div className="pos-basket__quantity"><button onClick={() => setQuantity(product.id, item.quantity - 1)} aria-label="Decrease quantity"><Minus size={12} /></button><span>{item.quantity}</span><button onClick={() => setQuantity(product.id, item.quantity + 1)} disabled={item.quantity >= product.stock} aria-label="Increase quantity"><Plus size={12} /></button></div></div>; }) : <p className="pos-basket__empty">Choose a product to start a sale.</p>}</div>
        <div className="pos-basket__form"><Field label="Customer name"><TextInput value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Walk-in customer" /></Field><Field label="Payment method"><SelectInput value={payment} onChange={(event) => setPayment(event.target.value)}><option>Cash</option><option>Card</option><option>Other</option></SelectInput></Field><div className="pos-basket__total"><span>Subtotal / total</span><span>{formatPHP(subtotal)}</span></div><Button onClick={complete} className="ui-button--full" disabled={!saleItems.length || savingSale}>{savingSale ? "Saving sale..." : "Complete sale"} <ArrowRight size={15} /></Button></div>
      </Surface>
    </div>
  </>;
}

export function StaffProfilePage() {
  const { user } = useStore();
  if (!user) return <EmptyState icon={UserRound} title="Staff profile" description="Sign in with a staff account to view profile details." action={<Link to="/login"><Button>Sign in</Button></Link>} />;
  return <div className="staff-profile-page">
    <PageTitle eyebrow="Your account" title="Staff profile" description="Your staff account and contact details." />
    <Surface className="staff-profile">
      <div className="staff-profile__header">
        <div className="staff-profile__avatar"><UserRound size={20} /></div>
        <div className="staff-profile__identity"><h2>{user.name}</h2><p>{user.role} account</p></div>
      </div>
      <dl className="staff-profile__details">
        {[["Email", user.email], ["Phone", user.phone]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not added"}</dd></div>)}
      </dl>
    </Surface>
  </div>;
}