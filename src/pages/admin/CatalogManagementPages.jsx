import { useMemo, useState } from "react";
import { Check, Edit2, Eye, Plus, Search, Tags, Trash2 } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { formatPHP } from "../../utils";
import Alert from "../../components/Alert";
import ProductForm from "../../components/ProductForm";
import StockAdjustmentModal from "../../components/StockAdjustmentModal";
import { PRODUCT_IMAGE_PLACEHOLDER } from "../../utils/productImage";
import { Button, EmptyState, Field, Modal, PageTitle, StatusBadge, Surface, TableWrap, TextArea, TextInput, thClass, tdClass } from "../../components/UI";
import "../../css/CatalogManagementPages.css";

export function AdminProductsPage() {
  const { products, categories, upsertProduct, deleteProduct, adjustStock } = useStore();
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [stockTarget, setStockTarget] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const filtered = useMemo(() => products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase())), [products, query]);
  const edit = (product) => { setSelected({ ...product }); setEditorOpen(true); };
  const close = () => { setEditorOpen(false); setSelected(null); };
  const save = async (product) => {
    const result = await upsertProduct(product);
    if (result?.error) return result;
    close();
    setFeedback({ text: `${result.name} saved.`, error: false });
    return result;
  };
  const saveStock = async (productId, quantity, note) => {
    const result = await adjustStock(productId, quantity, note);
    if (result?.error) return result;
    const product = products.find((item) => item.id === productId);
    setFeedback({ text: `${Math.abs(quantity)} ${quantity > 0 ? "added to" : "removed from"} ${product.name}. New stock: ${result.product.stock}.`, error: false });
    return result;
  };
  const toggle = async (product) => {
    try {
      const result = await upsertProduct({ ...product, active: !product.active });
      setFeedback(result?.error ? { text: result.error, error: true } : { text: `${product.name} ${product.active ? "deactivated" : "activated"}.`, error: false });
    } catch (error) {
      setFeedback({ text: error.message || "Could not update product status.", error: true });
    }
  };
  const remove = async (product) => {
    try {
      const result = await deleteProduct(product.id);
      setFeedback(result?.error ? { text: result.error, error: true } : { text: `${product.name} deleted.`, error: false });
    } catch (error) {
      setFeedback({ text: error.message || "Could not delete product.", error: true });
    }
  };

  return <>
    <PageTitle eyebrow="Catalog" title="Products" description={`${products.length} products in your store catalog.`} action={<div className="admin-catalog-actions">
      <Button variant="secondary" onClick={() => setStockTarget("")} disabled={!products.length}><Plus size={16} />Add stock</Button>
      <Button onClick={() => { setSelected(null); setEditorOpen(true); }}><Plus size={16} />Add product</Button>
    </div>} />
    <Alert message={feedback?.text} type={feedback?.error ? "error" : "success"} trigger={feedback} onDismiss={() => setFeedback(null)} />
    <Surface className="admin-catalog-table">
      <div className="admin-catalog-table__toolbar">
        <p>Search and update the items available in your store.</p>
        <label className="admin-catalog-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or product code" /></label>
      </div>
      <TableWrap>
        <thead><tr>{["Product", "Product code", "Category", "Price", "Stock", "Status", "Actions"].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead>
        <tbody>{filtered.length ? filtered.map((product) => <tr key={product.id} className="ui-table-row">
          <td className={tdClass}><div className="admin-catalog-product"><img src={product.image || PRODUCT_IMAGE_PLACEHOLDER} alt="" /><p>{product.name}</p></div></td>
          <td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small ui-table-cell--muted`}>{product.sku}</td>
          <td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small`}>{categories.find((item) => item.id === product.category)?.name || "-"}</td>
          <td className={`${tdClass} ui-table-cell--nowrap`}>{formatPHP(product.price)}</td>
          <td className={`${tdClass} ui-table-cell--strong`}>{product.stock}</td>
          <td className={tdClass}><StatusBadge status={product.active ? "Active" : "Inactive"} /></td>
          <td className={tdClass}><div className="admin-catalog-row-actions">
            <Button size="sm" variant="secondary" className="ui-button--nowrap" onClick={() => setStockTarget(product.id)}><Plus size={13} />Add stock</Button>
            <button title="Edit" aria-label={`Edit ${product.name}`} onClick={() => edit(product)} className="admin-catalog-icon-action"><Edit2 size={15} /></button>
            <button title={product.active ? "Deactivate" : "Activate"} aria-label={`${product.active ? "Deactivate" : "Activate"} ${product.name}`} onClick={() => toggle(product)} className="admin-catalog-icon-action">{product.active ? <Eye size={15} /> : <Check size={15} />}</button>
            <button title="Delete" aria-label={`Delete ${product.name}`} onClick={() => window.confirm(`Delete ${product.name}?`) && remove(product)} className="admin-catalog-icon-action admin-catalog-icon-action--danger"><Trash2 size={15} /></button>
          </div></td>
        </tr>) : <tr><td colSpan="7" className={`${tdClass} ui-table-cell--empty`}>No products match that search.</td></tr>}</tbody>
      </TableWrap>
    </Surface>
    {editorOpen && <ProductForm open onClose={close} initial={selected} onSave={save} categories={categories} products={products} />}
    {stockTarget !== null && <StockAdjustmentModal open onClose={() => setStockTarget(null)} products={products} categories={categories} onSave={saveStock} defaultProductId={stockTarget} addOnly />}
  </>;
}

function CategoryForm({ open, onClose, initial, onSave }) {
  const [form, setForm] = useState(initial || { id: "", name: "", description: "" });
  const [savedId, setSavedId] = useState(initial?.id || "new");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  if (open && savedId !== (initial?.id || "new")) { setForm(initial || { id: "", name: "", description: "" }); setSavedId(initial?.id || "new"); }
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await onSave(form);
      if (result?.error) setError(result.error);
    } catch (saveError) {
      setError(saveError.message || "Could not save category.");
    } finally {
      setSaving(false);
    }
  };
  return <Modal open={open} onClose={onClose} title={initial?.id ? "Edit category" : "Add category"} description="Organize products into easy-to-shop groups.">
    <form onSubmit={submit} className="admin-category-form"><Field label="Category name"><TextInput value={form.name} onChange={update("name")} required /></Field><Field label="Description"><TextArea value={form.description} onChange={update("description")} /></Field><Alert message={error} type="error" onDismiss={() => setError("")} /><div className="admin-category-form__actions"><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save category"}</Button></div></form>
  </Modal>;
}

export function AdminCategoriesPage() {
  const { categories, products, upsertCategory, deleteCategory } = useStore();
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const close = () => { setOpen(false); setSelected(null); };
  const save = async (form) => {
    const result = await upsertCategory({ ...form, name: form.name.trim() });
    if (result?.error) return result;
    close();
    return result;
  };
  const remove = async (category) => {
    try {
      const result = await deleteCategory(category.id);
      setFeedback(result?.error || "");
    } catch (error) {
      setFeedback(error.message || "Could not delete category.");
    }
  };
  return <>
    <PageTitle eyebrow="Catalog organization" title="Categories" description="Keep your product catalog easy to browse." action={<Button onClick={() => { setSelected(null); setOpen(true); }}><Plus size={16} /> Add category</Button>} />
    <Alert message={feedback} type="error" onDismiss={() => setFeedback("")} />
    <div className="admin-categories-grid">{categories.map((category) => <Surface key={category.id} className="admin-category">
      <div className="admin-category__body"><h2>{category.name}</h2><p className="admin-category__description">{category.description || "No description"}</p><p className="admin-category__count">{products.filter((item) => item.category === category.id).length} products</p></div>
      <div className="admin-category__actions"><Button size="sm" variant="ghost" onClick={() => { setSelected({ ...category }); setOpen(true); }}><Edit2 size={14} /> Edit</Button><Button size="sm" variant="ghost" className="admin-category__delete" onClick={() => window.confirm(`Delete ${category.name}?`) && remove(category)}><Trash2 size={14} /> Delete</Button></div>
    </Surface>)}</div>
    {!categories.length && <EmptyState icon={Tags} title="No categories yet" description="Add a category to help shoppers find products." />}
    <CategoryForm open={open} onClose={close} initial={selected} onSave={save} />
  </>;
}