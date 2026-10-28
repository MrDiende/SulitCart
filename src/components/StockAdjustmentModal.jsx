import { useState } from "react";
import { useStore } from "../context/StoreContext";
import usePersistentDraft from "../hooks/usePersistentDraft";
import Alert from "./Alert";
import { Button, Field, Modal, SelectInput, TextInput } from "./UI";
import { generateProductCode } from "../utils/productCode";
import "../css/StockAdjustmentModal.css";

export default function StockAdjustmentModal({ open, onClose, products, categories = [], onSave, defaultProductId = "", addOnly = false }) {
  const { user } = useStore();
  const initialForm = (() => {
    const selected = products.find((item) => item.id === defaultProductId);
    return {
      categoryId: selected && categories.some((category) => category.id === selected.category) ? selected.category : "all",
      productId: selected?.id || "",
      quantity: "",
      type: "received",
      note: "",
    };
  })();
  const draftKey = `sulitcart:stock-adjustment-draft:${user?.id || "anonymous"}:${defaultProductId || "all"}:${addOnly ? "add" : "adjust"}`;
  const [form, setForm, clearDraft, draftError] = usePersistentDraft(draftKey, initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const filteredProducts = products.filter((item) => form.categoryId === "all" || item.category === form.categoryId);
  const product = filteredProducts.find((item) => item.id === form.productId);
  const productCode = product
    ? product.sku || generateProductCode(products, product.category, categories)
    : "";
  const adding = addOnly || form.type === "received";
  const quantity = Number(form.quantity);
  const validQuantity = Number.isSafeInteger(quantity) && quantity > 0;

  const update = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value, ...(key === "productId" ? { quantity: "" } : {}) }));
    setError("");
  };

  const filterCategory = (event) => {
    const categoryId = event.target.value;
    setForm((current) => ({ ...current, categoryId, productId: "", quantity: "" }));
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!product || !validQuantity) {
      setError("Choose a product and enter a positive whole-number quantity.");
      return;
    }
    if (!adding && quantity > product.stock) {
      setError(`Only ${product.stock} are in stock. Enter a smaller quantity.`);
      return;
    }
    setSaving(true);
    try {
      const result = await onSave(product.id, adding ? quantity : -quantity, form.note.trim() || (adding ? "Stock received" : "Manual stock adjustment"));
      if (result?.error) {
        setError(result.error);
        return;
      }
      clearDraft();
      onClose();
    } catch (saveError) {
      setError(saveError.message || "Could not save stock adjustment.");
    } finally {
      setSaving(false);
    }
  };

  return <Modal open={open} onClose={onClose} title={addOnly ? "Add stock" : "Adjust stock"} description={addOnly ? "Add received stock to an existing product." : "Record received stock or remove stock from inventory."}>
    <form onSubmit={submit} className="stock-form">
      <Alert message={draftError} type="warning" />
      <Field label="Category filter">
        <SelectInput value={form.categoryId} onChange={filterCategory}>
          <option value="all">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </SelectInput>
      </Field>
      <Field label="Product">
        <SelectInput value={form.productId} onChange={update("productId")} disabled={!filteredProducts.length} required>
          <option value="">{filteredProducts.length ? "Choose a product" : "No products in this category"}</option>
          {filteredProducts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </SelectInput>
      </Field>
      {!filteredProducts.length && <p className="stock-form__empty" role="status">No products match this category. Choose another category.</p>}
      <div className="stock-form__details">
        <Field label="Product code" hint="Filled automatically. Existing codes stay unchanged.">
          <TextInput value={productCode} readOnly placeholder="Choose a product" className="ui-input--readonly" />
        </Field>
        <Field label="Current stock"><TextInput value={product?.stock ?? ""} readOnly placeholder="-" className="ui-input--readonly" /></Field>
      </div>
      <div className={`stock-form__quantity ${addOnly ? "" : "stock-form__quantity--adjust"}`}>
        {!addOnly && <Field label="Transaction">
          <SelectInput value={form.type} onChange={update("type")}><option value="received">Add stock</option><option value="adjustment">Remove stock</option></SelectInput>
        </Field>}
        <Field label={adding ? "Quantity to add" : "Quantity to remove"}>
          <TextInput type="number" min="1" step="1" max={!adding ? product?.stock : undefined} value={form.quantity} onChange={update("quantity")} disabled={!product} placeholder="Enter quantity" required />
        </Field>
      </div>
      {product && validQuantity && <p className="stock-form__preview">Stock after this change: <span>{adding ? product.stock + quantity : Math.max(0, product.stock - quantity)}</span></p>}
      <Field label="Note (optional)"><TextInput value={form.note} onChange={update("note")} placeholder="Supplier delivery, damage, etc." /></Field>
      <Alert message={error} type="error" onDismiss={() => setError("")} />
      <div className="stock-form__actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={!product || saving}>{saving ? "Saving..." : addOnly ? "Add stock" : "Save stock change"}</Button>
      </div>
    </form>
  </Modal>;
}