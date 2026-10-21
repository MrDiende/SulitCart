import { useState } from "react";
import Alert from "./Alert";
import ImageUpload from "./ImageUpload";
import { Button, Field, Modal, SelectInput, TextArea, TextInput } from "./UI";
import { PRODUCT_IMAGE_PLACEHOLDER } from "../utils/productImage";
import { generateProductCode } from "../utils/productCode";
import "../css/ProductForm.css";

const emptyProduct = { id: "", name: "", sku: "", category: "", description: "", price: "", stock: "0", threshold: "5", image: "", active: true };

export default function ProductForm({ open, onClose, initial, onSave, categories, products }) {
  const [form, setForm] = useState(() => ({ ...emptyProduct, ...initial }));
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const productCode = form.id && form.sku
    ? form.sku
    : generateProductCode(products, form.category, categories);

  const update = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "", form: "" }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (uploading || saving) return;
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Enter a product name.";
    if (!form.category) nextErrors.category = "Choose a category.";
    if (form.price === "" || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) nextErrors.price = "Enter a valid price.";
    if (form.stock === "" || !Number.isSafeInteger(Number(form.stock)) || Number(form.stock) < 0) nextErrors.stock = "Enter a non-negative whole number.";
    if (form.threshold === "" || !Number.isSafeInteger(Number(form.threshold)) || Number(form.threshold) < 0) nextErrors.threshold = "Enter a non-negative whole number.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const result = await onSave({ ...form, name: form.name.trim(), sku: productCode, price: Number(form.price), stock: Number(form.stock), threshold: Number(form.threshold), image: form.image || PRODUCT_IMAGE_PLACEHOLDER });
      if (result?.error) setErrors({ form: result.error });
    } catch (error) {
      setErrors({ form: error.message || "Could not save product." });
    } finally {
      setSaving(false);
    }
  };

  return <Modal open={open} onClose={onClose} title={initial?.id ? "Edit product" : "Add product"} description="Keep product details and stock information up to date." width="2xl">
    <form onSubmit={submit} className="product-form">
      <div className="product-form__identity">
        <Field label="Product name" error={errors.name}><TextInput value={form.name} onChange={update("name")} placeholder="e.g. Wireless headphones" required /></Field>
        <Field label="Product code" hint={form.id ? "Assigned automatically. This code stays unchanged." : "Generated automatically from the selected category."}>
          <TextInput value={productCode} readOnly placeholder="Select a category first" className="ui-input--readonly" />
        </Field>
      </div>
      <Field label="Category" error={errors.category}>
        <SelectInput value={form.category} onChange={update("category")} required><option value="">Choose category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</SelectInput>
      </Field>
      <Field label="Description"><TextArea value={form.description} onChange={update("description")} placeholder="A short description for shoppers" /></Field>
      <div className="product-form__numbers">
        <Field label="Price (PHP)" error={errors.price}><TextInput type="number" min="0" step="0.01" value={form.price} onChange={update("price")} required /></Field>
        <Field label="Stock" error={errors.stock}><TextInput type="number" min="0" step="1" value={form.stock} onChange={update("stock")} required /></Field>
        <Field label="Low stock threshold" error={errors.threshold}><TextInput type="number" min="0" step="1" value={form.threshold} onChange={update("threshold")} required /></Field>
      </div>
      <ImageUpload value={form.image} onChange={(image) => setForm((current) => ({ ...current, image }))} onBusyChange={setUploading} />
      <label className="product-form__active"><input type="checkbox" checked={!!form.active} onChange={update("active")} />Active and visible in the store</label>
      <Alert message={errors.form} type="error" trigger={errors} onDismiss={() => setErrors((current) => ({ ...current, form: "" }))} />
      <div className="product-form__actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={uploading || saving}>{uploading ? "Preparing image..." : saving ? "Saving..." : "Save product"}</Button>
      </div>
    </form>
  </Modal>;
}