import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Minus, PackageCheck, Plus, ShoppingBag, Trash2, XCircle } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { formatDate, formatPHP, isOnlineOrder } from "../../utils";
import Alert, { useAlert } from "../../components/Alert";
import { checkoutLoginPath, checkoutSignInMessage } from "../../components/RequireCustomerCheckout";
import usePersistentDraft from "../../hooks/usePersistentDraft";
import { Button, EmptyState, Field, PageTitle, SelectInput, StatusBadge, Surface, TextArea, TextInput } from "../../components/UI";
import "../../css/CartCheckoutPages.css";

export function CartPage() {
  const { cart, cartStorageError, products, updateCartQuantity, getShippingFee, canCheckout } = useStore();
  const { notify } = useAlert();
  const navigate = useNavigate();
  const lines = cart.map((line) => ({ ...line, product: products.find((item) => item.id === line.productId) })).filter((line) => line.product);
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const estimate = getShippingFee("Cabanatuan City", "");
  const proceedToCheckout = () => {
    if (canCheckout) { navigate("/checkout"); return; }
    notify(checkoutSignInMessage, { id: "checkout-sign-in", type: "warning" });
    navigate(checkoutLoginPath);
  };

  if (!lines.length) return <div className="cart-page cart-page--empty"><Alert message={cartStorageError} type="warning" /><PageTitle eyebrow="Your basket" title="Shopping cart" /><Surface><EmptyState icon={ShoppingBag} title="Your cart is empty" description="Find something good for your home and add it to your basket." action={<Link to="/products"><Button>Browse products <ArrowRight size={16} /></Button></Link>} /></Surface></div>;
  return <div className="cart-page">
    <Alert message={cartStorageError} type="warning" />
    <PageTitle eyebrow="Your basket" title={`Shopping cart (${lines.reduce((sum, line) => sum + line.quantity, 0)})`} description="A few everyday favorites, ready for checkout." />
    <div className="cart-grid">
      <Surface className="cart-lines">
        <div className="cart-lines__head"><span>Product</span><span>Price</span><span>Quantity</span><span className="cart-lines__total-label">Total</span><span /></div>
        <div className="cart-lines__list">
          {lines.map(({ product, quantity }) => <div key={product.id} className="cart-line">
            <div className="cart-line__identity"><Link to={`/products/${product.id}`} className="cart-line__image"><img src={product.image} alt={product.name} /></Link>
            <div className="cart-line__info"><Link to={`/products/${product.id}`} className="cart-line__name">{product.name}</Link><p className="cart-line__mobile-price">{formatPHP(product.price)}</p><div className="cart-line__mobile-controls">
              <div className="cart-quantity cart-quantity--mobile"><button onClick={() => updateCartQuantity(product.id, quantity - 1)} aria-label="Decrease quantity"><Minus size={13} /></button><span>{quantity}</span><button onClick={() => updateCartQuantity(product.id, quantity + 1)} disabled={quantity >= product.stock} aria-label="Increase quantity"><Plus size={13} /></button></div>
            </div></div></div>
            <div className="cart-line__price">{formatPHP(product.price)}</div>
            <div className="cart-quantity cart-quantity--desktop"><button onClick={() => updateCartQuantity(product.id, quantity - 1)} aria-label="Decrease quantity"><Minus size={13} /></button><span>{quantity}</span><button onClick={() => updateCartQuantity(product.id, quantity + 1)} disabled={quantity >= product.stock} aria-label="Increase quantity"><Plus size={13} /></button></div>
            <p className="cart-line__total">{formatPHP(product.price * quantity)}</p>
            <button onClick={() => updateCartQuantity(product.id, 0)} className="cart-line__remove" aria-label={`Remove ${product.name}`}><Trash2 size={16} /></button>
          </div>)}
        </div>
        <div className="cart-lines__footer"><Link to="/products"><ArrowLeft size={15} /> Continue shopping</Link></div>
      </Surface>
      <Surface className="purchase-summary">
        <h2 className="purchase-summary__title">Order summary</h2>
        <div className="purchase-summary__costs purchase-summary__costs--cart"><div><span>Subtotal</span><span>{formatPHP(subtotal)}</span></div><div><span>Delivery</span><span>From {formatPHP(estimate)}</span></div><p>Final delivery fee is based on your Nueva Ecija address.</p></div>
        <div className="purchase-summary__total"><span>Total</span><span>{formatPHP(subtotal + estimate)}</span></div>
        <Button className="ui-button--full" onClick={proceedToCheckout}>Proceed to checkout <ArrowRight size={16} /></Button>
      </Surface>
    </div>
  </div>;
}

const municipalities = [
  { name: "Cabanatuan City", code: "034903000" },
  { name: "Gapan City", code: "034908000" },
  { name: "Palayan City", code: "034919000" },
  { name: "San Jose City", code: "034926000" },
  { name: "Science City of Muñoz", code: "034917000" },
  { name: "Aliaga", code: "034901000" },
  { name: "Bongabon", code: "034902000" },
  { name: "Cabiao", code: "034904000" },
  { name: "Carranglan", code: "034905000" },
  { name: "Cuyapo", code: "034906000" },
  { name: "Gabaldon", code: "034907000" },
  { name: "General Mamerto Natividad", code: "034909000" },
  { name: "General Tinio", code: "034910000" },
  { name: "Guimba", code: "034911000" },
  { name: "Jaen", code: "034912000" },
  { name: "Laur", code: "034913000" },
  { name: "Licab", code: "034914000" },
  { name: "Llanera", code: "034915000" },
  { name: "Lupao", code: "034916000" },
  { name: "Nampicuan", code: "034918000" },
  { name: "Pantabangan", code: "034920000" },
  { name: "Peñaranda", code: "034921000" },
  { name: "Quezon", code: "034922000" },
  { name: "Rizal", code: "034923000" },
  { name: "San Antonio", code: "034924000" },
  { name: "San Isidro", code: "034925000" },
  { name: "San Leonardo", code: "034927000" },
  { name: "Santa Rosa", code: "034928000" },
  { name: "Santo Domingo", code: "034929000" },
  { name: "Talavera", code: "034930000" },
  { name: "Talugtug", code: "034931000" },
  { name: "Zaragoza", code: "034932000" },
];

export function CheckoutPage() {
  const { cart, cartStorageError, products, getShippingFee, placeOrder, user } = useStore();
  const { notify } = useAlert();
  const navigate = useNavigate();
  const draftKey = `sulitcart:checkout-draft:${user?.id || "anonymous"}`;
  const [form, setForm, clearDraft, draftError] = usePersistentDraft(draftKey, { fullName: user?.name || "", phone: user?.phone || "", province: "Nueva Ecija", municipality: "Cabanatuan City", barangay: "", address: "", notes: "" });
  const [errors, setErrors] = useState({});
  const [barangays, setBarangays] = useState([]);
  const [barangaysLoading, setBarangaysLoading] = useState(true);
  const [barangaysLoadError, setBarangaysLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lines = cart.map((line) => ({ ...line, product: products.find((product) => product.id === line.productId) })).filter((line) => line.product);
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const shippingFee = getShippingFee(form.municipality, form.barangay);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const updateMunicipality = (event) => {
    const municipality = event.target.value;
    setForm((current) => ({ ...current, municipality, barangay: "" }));
    setErrors((current) => ({ ...current, municipality: undefined, barangay: undefined }));
  };

  useEffect(() => {
    const selectedMunicipality = municipalities.find((place) => place.name === form.municipality);
    if (!selectedMunicipality) {
      setBarangays([]);
      setBarangaysLoading(false);
      setBarangaysLoadError("");
      return undefined;
    }

    const controller = new AbortController();
    setBarangays([]);
    setBarangaysLoading(true);
    setBarangaysLoadError("");

    fetch(`https://psgc.gitlab.io/api/cities-municipalities/${selectedMunicipality.code}/barangays/`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load barangays. Please try changing the municipality and selecting it again.");
        const data = await response.json();
        if (!Array.isArray(data) || !data.every((barangay) => barangay && typeof barangay.name === "string")) {
          throw new Error("The barangay list returned an unexpected response. Please try again later.");
        }
        setBarangays(data.map((barangay) => barangay.name).sort((a, b) => a.localeCompare(b)));
      })
      .catch((error) => {
        if (error.name !== "AbortError") setBarangaysLoadError(error.message || "Unable to load barangays. Please try again later.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setBarangaysLoading(false);
      });

    return () => controller.abort();
  }, [form.municipality]);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const nextErrors = {};
    if (form.fullName.trim().length < 2) nextErrors.fullName = "Enter your full name.";
    if (!/^\+?[\d ()-]{7,18}$/.test(form.phone.trim())) nextErrors.phone = "Enter a valid phone number.";
    if (!form.municipality) nextErrors.municipality = "Choose a municipality.";
    if (!barangays.includes(form.barangay)) nextErrors.barangay = "Choose a barangay from the list.";
    if (form.address.trim().length < 5) nextErrors.address = "Enter your complete address.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSubmitting(true);
    try {
      const order = await placeOrder({ customer: form.fullName.trim(), phone: form.phone.trim(), municipality: form.municipality, barangay: form.barangay.trim(), address: form.address.trim(), notes: form.notes.trim() });
      if (order?.requiresSignIn) {
        notify(checkoutSignInMessage, { id: "checkout-sign-in", type: "warning" });
        navigate(checkoutLoginPath, { replace: true });
        return;
      }
      if (!order) setErrors({ form: "One or more products are no longer available in the selected quantity." });
      else if (order.error) setErrors({ form: order.error });
      else {
        clearDraft();
        navigate(`/orders/${order.id}?placed=1`);
      }
    } catch (error) {
      setErrors({ form: error.message || "Could not place your order." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!lines.length) return <div className="purchase-empty-page"><EmptyState icon={ShoppingBag} title="Your cart is empty" description="Add a few products to your cart before checking out." action={<Link to="/products"><Button>Browse products</Button></Link>} /></div>;

  return <div className="checkout-page">
    <Alert message={cartStorageError || draftError} type="warning" />
    <PageTitle eyebrow="Almost there" title="Checkout" description="Your order will be delivered within Nueva Ecija." />
    <form onSubmit={submit} className="checkout-grid">
      <div className="checkout-sections">
        <Surface className="checkout-section">
          <div className="checkout-section__header"><span className="checkout-section__number">01</span><div><h2>Customer information</h2><p>Who should we deliver your order to?</p></div></div>
          <div className="checkout-fields">
            <Field label="Full name" error={errors.fullName}><TextInput value={form.fullName} onChange={update("fullName")} placeholder="e.g. Jamie Rivera" autoComplete="name" /></Field>
            <Field label="Phone number" error={errors.phone}><TextInput value={form.phone} onChange={update("phone")} placeholder="09XX XXX XXXX" type="tel" autoComplete="tel" /></Field>
          </div>
        </Surface>
        <Surface className="checkout-section">
          <div className="checkout-section__header"><span className="checkout-section__number">02</span><div><h2>Delivery address</h2><p>Delivery available across Nueva Ecija only.</p></div></div>
          <div className="checkout-fields">
            <Field label="Province"><SelectInput value={form.province} disabled><option value="Nueva Ecija">Nueva Ecija</option></SelectInput></Field>
            <Field label="Municipality / city" error={errors.municipality}><SelectInput value={form.municipality} onChange={updateMunicipality}><option value="">Choose municipality</option>{municipalities.map((place) => <option key={place.code} value={place.name}>{place.name}</option>)}</SelectInput></Field>
            <Field label="Barangay" error={errors.barangay || barangaysLoadError}>
              <SelectInput value={form.barangay} onChange={update("barangay")} disabled={!form.municipality || barangaysLoading || !!barangaysLoadError} required>
                <option value="">{barangaysLoading ? "Loading barangays..." : form.municipality ? "Choose barangay" : "Choose municipality first"}</option>
                {barangays.map((barangay) => <option key={barangay} value={barangay}>{barangay}</option>)}
              </SelectInput>
            </Field>
            <Field label="Complete address" error={errors.address} className="checkout-fields__wide"><TextInput value={form.address} onChange={update("address")} placeholder="House number, street, landmark" autoComplete="street-address" /></Field>
            <Field label="Delivery notes" hint="Optional. Add a landmark or delivery preference." className="checkout-fields__wide"><TextArea value={form.notes} onChange={update("notes")} placeholder="Anything that will help us find you" /></Field>
          </div>
        </Surface>
        <Surface className="checkout-section">
          <div className="checkout-section__header checkout-section__header--payment"><span className="checkout-section__number">03</span><div><h2>Payment</h2><p>Pay when your order arrives.</p></div></div>
          <label className="checkout-payment"><input type="radio" checked readOnly /><span className="checkout-payment__name">Cash on Delivery</span><span className="checkout-payment__code">COD</span></label>
        </Surface>
      </div>

      <div className="checkout-summary-wrap"><Surface className="purchase-summary">
        <h2 className="purchase-summary__title">Order summary</h2>
        <div className="purchase-summary__items">
          {lines.map(({ product, quantity }) => <div key={product.id} className="purchase-summary__item"><img src={product.image} alt="" /><div className="purchase-summary__item-info"><p>{product.name}</p><p>Qty {quantity} · {formatPHP(product.price)} each</p></div><span>{formatPHP(product.price * quantity)}</span></div>)}
        </div>
        <div className="purchase-summary__costs"><div><span>Subtotal</span><span>{formatPHP(subtotal)}</span></div><div><span>Shipping fee</span><span>{form.municipality ? formatPHP(shippingFee) : "Choose location"}</span></div><p>{form.municipality ? `Delivery to ${form.municipality}` : "Select a municipality to calculate delivery."}</p></div>
        <div className="purchase-summary__total"><span>Total</span><span>{formatPHP(subtotal + shippingFee)}</span></div>
        <Alert message={errors.form} type="error" trigger={errors} onDismiss={() => setErrors((current) => ({ ...current, form: "" }))} />
        <Button type="submit" className="ui-button--full" size="lg" disabled={submitting}>{submitting ? "Placing order..." : "Place order"} <ArrowRight size={16} /></Button>
        <p className="purchase-summary__agreement">By placing your order, you agree to pay the total on delivery.</p>
      </Surface></div>
    </form>
  </div>;
}

export function OrdersPage() {
  const { orders, user } = useStore();
  const [status, setStatus] = usePersistentDraft(`sulitcart:customer-order-filter:${user?.id || "anonymous"}`, "All orders");
  const visible = useMemo(() => orders.filter(isOnlineOrder).filter((order) => status === "All orders" || order.status === status), [orders, status]);
  const statuses = ["All orders", "Pending", "Confirmed", "Packed", "Shipped", "Completed", "Cancelled"];
  return <div className="customer-orders-page">
    <PageTitle eyebrow="Your account" title="Your orders" description="Check the latest progress on your SulitCart orders." action={<Link to="/products"><Button variant="secondary">Shop products</Button></Link>} />
    <div className="customer-orders-filters">{statuses.map((item) => <button key={item} onClick={() => setStatus(item)} className={`customer-orders-filters__button ${status === item ? "customer-orders-filters__button--active" : ""}`}>{item}</button>)}</div>
    <Surface className="customer-orders">
      {visible.length ? <div className="customer-orders__list">{visible.map((order) => <div key={order.id} className="customer-order">
        <div className="customer-order__identity"><div className="customer-order__images">{order.items.slice(0, 3).map((item, index) => <img key={`${item.productId}-${index}`} src={item.image} alt="" />)}</div><div className="customer-order__info"><p>{order.number}</p><p>{formatDate(order.date)} <span>·</span> {order.items.length} {order.items.length === 1 ? "item" : "items"}</p></div></div>
        <div className="customer-order__actions"><div className="customer-order__summary"><p>{formatPHP(order.total)}</p><div><StatusBadge status={order.status} /></div></div><Link to={`/orders/${order.id}`} aria-label={`View order ${order.number}`} className="customer-order__details"><ChevronRight size={18} /></Link></div>
      </div>)}</div> : <EmptyState icon={PackageCheck} title="No orders in this view" description="Try another order status." />}
    </Surface>
  </div>;
}

export function OrderDetailsPage() {
  const { id } = useParams();
  const { orders, user, cancelCustomerOrder } = useStore();
  const { notify } = useAlert();
  const order = orders.find((item) => isOnlineOrder(item) && (item.id === id || item.number === id));
  if (!order) return <div className="purchase-empty-page"><EmptyState icon={PackageCheck} title="Order not found" description="We could not find this order." action={<Link to="/orders"><Button>View all orders</Button></Link>} /></div>;
  const steps = ["Pending", "Confirmed", "Packed", "Shipped", "Completed"];
  const placed = new URLSearchParams(window.location.search).get("placed");
  const canCancel = Boolean(user && order.customerId === user.id && ["Pending", "Confirmed"].includes(order.status));
  const handleCancel = async () => {
    if (!window.confirm(`Are you sure you want to cancel order ${order.number}? This action cannot be undone.`)) return;
    const result = await cancelCustomerOrder(order.id);
    if (result === true) notify("Your order has been cancelled.", { id: `order-cancel-${order.id}`, type: "success" });
    else notify(result?.error || "Could not cancel this order.", { id: `order-cancel-${order.id}`, type: "error" });
  };
  return <div className="order-details-page">
    <Link to="/orders" className="order-details__back"><ArrowLeft size={15} /> All orders</Link>
    <Alert message={placed ? "Order placed. Thank you for shopping with SulitCart." : ""} />
    <PageTitle eyebrow="Order details" title={order.number} description={`Placed on ${formatDate(order.date)}`} action={<StatusBadge status={order.status} />} />
    {canCancel && <div className="order-cancel-action"><p>You can cancel this order before it is packed.</p><Button variant="secondary" onClick={handleCancel}><XCircle size={15} /> Cancel order</Button></div>}
    {order.status === "Cancelled" && <Surface className="order-cancelled-notice"><p>This order has been cancelled.</p></Surface>}
    <div className="order-details-grid">
      <div className="order-details-sections">
        {order.status !== "Cancelled" && <Surface className="order-progress"><h2>Order progress</h2><div className="order-progress__steps">{steps.map((step, index) => { const currentIndex = steps.indexOf(order.status); const completed = currentIndex >= index; return <div className={`order-progress__step ${completed ? "order-progress__step--complete" : ""}`} key={step}><div className="order-progress__number">{completed ? <Check size={14} /> : index + 1}</div>{index < steps.length - 1 && <div className={`order-progress__connector ${currentIndex > index ? "order-progress__connector--complete" : ""}`} />}<p>{step}</p></div>; })}</div></Surface>}
        <Surface className="order-items"><div className="order-items__header"><h2>Items in this order</h2></div><div className="order-items__list">{order.items.map((item, index) => <div key={`${item.productId}-${index}`} className="order-items__item"><img src={item.image} alt="" /><div className="order-items__info"><p>{item.name}</p><p>Qty {item.quantity} · {formatPHP(item.price)} each</p></div><span>{formatPHP(item.price * item.quantity)}</span></div>)}</div></Surface>
      </div>
      <div className="order-details-sections"><Surface className="order-delivery"><h2>Delivery details</h2><p className="order-delivery__customer">{order.customer}</p><p className="order-delivery__address">{order.address}</p><p className="order-delivery__phone">{order.phone}</p><p className="order-delivery__payment">{order.payment || "Cash on Delivery"}</p></Surface>
        <Surface className="order-payment-summary"><h2>Payment summary</h2><div className="purchase-summary__costs"><div><span>Subtotal</span><span>{formatPHP(order.subtotal)}</span></div><div><span>Shipping fee</span><span>{formatPHP(order.shipping)}</span></div></div><div className="order-payment-summary__total"><span>Total</span><span>{formatPHP(order.total)}</span></div></Surface></div>
    </div>
  </div>;
}