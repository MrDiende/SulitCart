import { useMemo, useState } from "react";
import { Eye, Plus, Search, UserPlus, Edit2, Trash2, ToggleLeft, ToggleRight, Truck } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { formatDate, formatPHP } from "../../utils";
import usePersistentDraft from "../../hooks/usePersistentDraft";
import Alert, { useAlert } from "../../components/Alert";
import { Button, Field, Modal, PageTitle, SelectInput, StatusBadge, Surface, TableWrap, TextInput, thClass, tdClass } from "../../components/UI";
import "../../css/PeopleShippingPages.css";

function CustomerInfoModal({ customer, onClose }) {
  return <Modal open={!!customer} onClose={onClose} title={customer?.name || "Customer details"} description="Customer contact and account details.">
    {customer && <div className="people-details"><div><p className="people-details__label">Email address</p><p className="people-details__value">{customer.email}</p></div><div><p className="people-details__label">Phone number</p><p className="people-details__value">{customer.phone}</p></div><div><p className="people-details__label">Address</p><p className="people-details__value">{customer.address}</p></div><div><p className="people-details__label">Date joined</p><p className="people-details__value">{formatDate(customer.joined)}</p></div><div className="people-details__actions"><StatusBadge status={customer.active ? "Active" : "Inactive"} /></div></div>}
  </Modal>;
}

export function AdminCustomersPage() {
  const { customers, toggleCustomer, user } = useStore();
  const [query, setQuery] = usePersistentDraft(`sulitcart:customer-search:${user?.id || "anonymous"}`, "");
  const [selected, setSelected] = usePersistentDraft(`sulitcart:customer-details:${user?.id || "anonymous"}`, null);
  const [feedback, setFeedback] = useState("");
  const filtered = useMemo(() => customers.filter((person) => `${person.name} ${person.email} ${person.phone}`.toLowerCase().includes(query.toLowerCase())), [customers, query]);
  const toggle = async (person) => {
    try {
      const result = await toggleCustomer(person.id);
      setFeedback(result?.error || "");
    } catch (error) {
      setFeedback(error.message || "Could not update customer status.");
    }
  };
  return <>
    <PageTitle eyebrow="Your shoppers" title="Customers" description={`${customers.length} customer accounts.`} />
    <Alert message={feedback} type="error" onDismiss={() => setFeedback("")} />
    <Surface className="people-table"><div className="people-table__search-toolbar"><label className="people-search people-search--customers"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers" /></label></div>
      <TableWrap><thead><tr>{["Customer", "Phone", "Address", "Status", "Date joined", "Actions"].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead><tbody>{filtered.map((person) => <tr key={person.id}><td className={tdClass}><p className="people-table__name">{person.name}</p><p className="people-table__email">{person.email}</p></td><td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small`}>{person.phone}</td><td className={`${tdClass} people-table__address`}>{person.address}</td><td className={tdClass}><StatusBadge status={person.active ? "Active" : "Inactive"} /></td><td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small ui-table-cell--muted`}>{formatDate(person.joined)}</td><td className={tdClass}><div className="people-row-actions"><button title="View customer" onClick={() => setSelected(person)} className="people-icon-action"><Eye size={15} /></button><button title={person.active ? "Deactivate" : "Activate"} onClick={() => toggle(person)} className={`people-icon-action ${person.active ? "people-icon-action--deactivate" : "people-icon-action--activate"}`}>{person.active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}</button></div></td></tr>)}</tbody></TableWrap>
    </Surface>
    <CustomerInfoModal customer={selected} onClose={() => setSelected(null)} />
  </>;
}

function StaffForm({ open, onClose, initial, onSave }) {
  const { user } = useStore();
  const draftKey = `sulitcart:staff-account-draft:${user?.id || "anonymous"}:${initial?.id || "new"}`;
  const [form, setForm, clearDraft, draftError] = usePersistentDraft(draftKey, { id: "", name: "", email: "", phone: "", active: true, ...initial });
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const update = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    if (key === "password") setPassword(value);
    else setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "", form: "" }));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Enter the staff member's full name.";
    if (!form.phone.trim()) nextErrors.phone = "Enter a phone number.";
    if (!initial?.id && (password.length < 8 || !password.trim())) nextErrors.password = "Use at least 8 characters.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      const result = await onSave({ ...form, password });
      if (result?.error) setErrors({ form: result.error });
      else clearDraft();
    } catch {
      setErrors({ form: "Could not save this staff account. Please try again." });
    } finally {
      setSaving(false);
    }
  };
  return <Modal open={open} onClose={onClose} title={initial?.id ? "Edit staff member" : "Add staff member"} description="Manage the people helping run your store.">
    <form onSubmit={submit} className="people-form">
      <Alert message={draftError} type="warning" />
      <Field label="Full name" error={errors.name}><TextInput value={form.name} onChange={update("name")} required /></Field>
      <Field label="Email address"><TextInput type="email" value={form.email} onChange={update("email")} autoComplete="off" required /></Field>
      {!initial?.id &&       <Field label="Password" error={errors.password} hint="At least 8 characters. The staff member can change it after signing in.">
        <TextInput type="password" value={password} onChange={update("password")} minLength={8} autoComplete="new-password" placeholder="Create a staff password" required />
      </Field>}
      <Field label="Phone number" error={errors.phone}><TextInput type="tel" value={form.phone} onChange={update("phone")} required /></Field>
      {initial?.id && <label className="people-form__active"><input type="checkbox" checked={!!form.active} onChange={update("active")} />Active</label>}
      <Alert message={errors.form} type="error" trigger={errors} onDismiss={() => setErrors((current) => ({ ...current, form: "" }))} />
      <div className="people-form__actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save staff member"}</Button>
      </div>
    </form>
  </Modal>;
}

export function AdminStaffPage() {
  const { staff, upsertStaff, toggleStaff, user } = useStore();
  const { notify } = useAlert();
  const [editor, setEditor] = usePersistentDraft(`sulitcart:staff-editor:${user?.id || "anonymous"}`, { open: false, selected: null });
  const { open, selected } = editor;
  const [feedback, setFeedback] = useState("");
  const close = () => setEditor({ open: false, selected: null });
  const save = async (person) => {
    const result = await upsertStaff(person);
    if (result?.error) return result;
    notify(person.id ? "Staff details updated." : "Staff account created. They can sign in with their email and password.");
    close();
    return result;
  };
  const toggle = async (person) => {
    try {
      const result = await toggleStaff(person.id);
      setFeedback(result?.error || "");
    } catch (error) {
      setFeedback(error.message || "Could not update staff status.");
    }
  };
  return <>
    <PageTitle eyebrow="Store team" title="Staff" description={`${staff.length} staff accounts.`} action={<Button onClick={() => setEditor({ open: true, selected: null })}><UserPlus size={16} /> Add staff</Button>} />
    <Alert message={feedback} type="error" onDismiss={() => setFeedback("")} />
    <Surface className="people-table"><TableWrap><thead><tr>{["Staff member", "Phone", "Status", "Date created", "Actions"].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead><tbody>{staff.map((person) => <tr key={person.id}><td className={tdClass}><p className="people-table__name">{person.name}</p><p className="people-table__email">{person.email}</p></td><td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small`}>{person.phone}</td><td className={tdClass}><StatusBadge status={person.active ? "Active" : "Inactive"} /></td><td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small ui-table-cell--muted`}>{formatDate(person.created)}</td><td className={tdClass}><div className="people-row-actions"><button title="Edit" onClick={() => setEditor({ open: true, selected: person })} className="people-icon-action"><Edit2 size={15} /></button><button title={person.active ? "Deactivate" : "Activate"} onClick={() => toggle(person)} className="people-icon-action">{person.active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}</button></div></td></tr>)}</tbody></TableWrap></Surface>
    {open && <StaffForm open onClose={close} initial={selected} onSave={save} />}
  </>;
}

const municipalities = ["Cabanatuan City", "Gapan City", "Palayan City", "San Jose City", "Santa Rosa", "Talavera", "Bongabon"];

function ShippingForm({ open, onClose, initial, onSave }) {
  const { user } = useStore();
  const draftKey = `sulitcart:shipping-rate-draft:${user?.id || "anonymous"}:${initial?.id || "new"}`;
  const [form, setForm, clearDraft, draftError] = usePersistentDraft(draftKey, { id: "", municipality: "Cabanatuan City", barangay: "*", fee: "50", active: true, ...initial });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await onSave(form);
      if (result?.error) setError(result.error);
      else clearDraft();
    } catch (saveError) {
      setError(saveError.message || "Could not save shipping rate.");
    } finally {
      setSaving(false);
    }
  };
  return <Modal open={open} onClose={onClose} title={initial?.id ? "Edit delivery rate" : "Add delivery rate"} description="Set a delivery fee for a configured service location.">
    <form onSubmit={submit} className="people-form"><Alert message={draftError} type="warning" /><Field label="Municipality / city"><SelectInput value={form.municipality} onChange={update("municipality")}>{municipalities.map((place) => <option key={place}>{place}</option>)}</SelectInput></Field><Field label="Barangay" hint="Use * for the municipality's default rate."><TextInput value={form.barangay} onChange={update("barangay")} required /></Field><Field label="Shipping fee (PHP)"><TextInput type="number" min="0" value={form.fee} onChange={update("fee")} required /></Field>{initial?.id && <label className="people-form__active"><input type="checkbox" checked={!!form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} /> Active</label>}<Alert message={error} type="error" onDismiss={() => setError("")} /><div className="people-form__actions"><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save rate"}</Button></div></form>
  </Modal>;
}

export function AdminShippingPage() {
  const { shipping, upsertShippingRate, deleteShippingRate, user } = useStore();
  const [editor, setEditor] = usePersistentDraft(`sulitcart:shipping-editor:${user?.id || "anonymous"}`, { open: false, selected: null });
  const { open, selected } = editor;
  const [feedback, setFeedback] = useState("");
  const [municipalityFilter, setMunicipalityFilter] = usePersistentDraft(`sulitcart:shipping-filter:${user?.id || "anonymous"}`, "All municipalities");
  const municipalityOptions = useMemo(() => [...new Set(shipping.map((rate) => rate.municipality))].sort((a, b) => a.localeCompare(b)), [shipping]);
  const visibleShipping = useMemo(() => municipalityFilter === "All municipalities"
    ? shipping
    : shipping.filter((rate) => rate.municipality === municipalityFilter), [shipping, municipalityFilter]);
  const close = () => setEditor({ open: false, selected: null });
  const save = async (rate) => {
    const result = await upsertShippingRate(rate);
    if (result?.error) return result;
    close();
    return result;
  };
  const toggle = async (rate) => {
    try {
      const result = await upsertShippingRate({ ...rate, active: !rate.active });
      setFeedback(result?.error || "");
    } catch (error) {
      setFeedback(error.message || "Could not update shipping rate.");
    }
  };
  const remove = async (rate) => {
    try {
      const result = await deleteShippingRate(rate.id);
      setFeedback(result?.error || "");
    } catch (error) {
      setFeedback(error.message || "Could not delete shipping rate.");
    }
  };
  return <>
    <PageTitle eyebrow="Nueva Ecija only" title="Shipping" description="Manage delivery fees by municipality and barangay." action={<Button onClick={() => setEditor({ open: true, selected: null })}><Plus size={16} /> Add rate</Button>} />
    <Alert message={feedback} type="error" onDismiss={() => setFeedback("")} />
    <div className="shipping-notice"><Truck size={16} /><span>Checkout uses active location rates. Barangay-specific fees take priority over the default rate.</span></div>
    <Surface className="people-table">
      <div className="shipping-toolbar">
        <p>Showing {visibleShipping.length} {visibleShipping.length === 1 ? "rate" : "rates"}</p>
        <label className="shipping-filter">
          Municipality
          <SelectInput className="shipping-filter__select" value={municipalityFilter} onChange={(event) => setMunicipalityFilter(event.target.value)}>
            <option>All municipalities</option>
            {municipalityOptions.map((municipality) => <option key={municipality}>{municipality}</option>)}
          </SelectInput>
        </label>
      </div>
      <TableWrap><thead><tr>{["Municipality", "Barangay", "Shipping fee", "Status", "Actions"].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead><tbody>{visibleShipping.length ? visibleShipping.map((rate) => <tr key={rate.id}><td className={`${tdClass} ui-table-cell--medium`}>{rate.municipality}</td><td className={tdClass}>{rate.barangay === "*" ? <span className="shipping-table__default">All barangays</span> : rate.barangay}</td><td className={`${tdClass} ui-table-cell--strong`}>{formatPHP(rate.fee)}</td><td className={tdClass}><StatusBadge status={rate.active ? "Active" : "Inactive"} /></td><td className={tdClass}><div className="people-row-actions"><button title="Edit" onClick={() => setEditor({ open: true, selected: rate })} className="people-icon-action"><Edit2 size={15} /></button><button title={rate.active ? "Deactivate" : "Activate"} onClick={() => toggle(rate)} className="people-icon-action">{rate.active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}</button><button title="Delete" onClick={() => window.confirm("Delete this delivery rate?") && remove(rate)} className="people-icon-action people-icon-action--danger"><Trash2 size={15} /></button></div></td></tr>) : <tr><td colSpan="5" className={`${tdClass} ui-table-cell--empty`}>No rates for this municipality.</td></tr>}</tbody></TableWrap>
    </Surface>
    {open && <ShippingForm open onClose={close} initial={selected} onSave={save} />}
  </>;
}

export function AdminAuditPage() {
  const { auditLogs, user } = useStore();
  const [filters, setFilters] = usePersistentDraft(`sulitcart:audit-filters:${user?.id || "anonymous"}`, { query: "", role: "All roles" });
  const { query, role } = filters;
  const setQuery = (value) => setFilters((current) => ({ ...current, query: value }));
  const setRole = (value) => setFilters((current) => ({ ...current, role: value }));
  const filtered = useMemo(() => auditLogs.filter((log) => (role === "All roles" || log.role === role) && `${log.user} ${log.action} ${log.description}`.toLowerCase().includes(query.toLowerCase())), [auditLogs, role, query]);
  return <>
    <PageTitle eyebrow="Store activity" title="Audit logs" description="A persistent history of changes made across the store." />
    <Surface className="people-table"><div className="audit-toolbar"><label className="people-search people-search--audit"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search action, user, or description" /></label><SelectInput className="audit-toolbar__role" value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filter audit logs by role"><option>All roles</option><option>Staff</option></SelectInput></div>
      <TableWrap><thead><tr>{["Date / time", "User", "Role", "Action", "Description"].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead><tbody>{filtered.length ? filtered.map((log) => <tr key={log.id}><td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small ui-table-cell--muted`}>{formatDate(log.date, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</td><td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--medium`}>{log.user}</td><td className={tdClass}><StatusBadge status={log.role} /></td><td className={`${tdClass} ui-table-cell--nowrap`}>{log.action}</td><td className={`${tdClass} audit-table__description`}>{log.description}</td></tr>) : <tr><td colSpan="5" className={`${tdClass} ui-table-cell--empty`}>No activity matches these filters.</td></tr>}</tbody></TableWrap>
    </Surface>
  </>;
}