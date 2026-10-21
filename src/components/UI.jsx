import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { X } from "lucide-react";
import "../css/UI.css";

export function Button({ children, variant = "primary", size = "md", className = "", type = "button", ...props }) {
  return <button type={type} className={`ui-button ui-button--${variant} ui-button--${size} ${className}`} {...props}>{children}</button>;
}

export function Field({ label, hint, error, children, className = "" }) {
  return <label className={`ui-field ${className}`}>
    {label && <span className="ui-field__label">{label}</span>}
    {children}
    {hint && !error && <span className="ui-field__hint">{hint}</span>}
    {error && <span className="ui-field__error">{error}</span>}
  </label>;
}

export function TextInput(props) {
  return <input {...props} className={`ui-input ${props.className || ""}`} />;
}

export function PasswordInput({ className = "", ...props }) {
  const [visible, setVisible] = useState(false);
  return <div className="ui-password-input">
    <input
      {...props}
      type={visible ? "text" : "password"}
      className={`ui-input ${className}`}
    />
    <button
      type="button"
      className="ui-password-input__toggle"
      onClick={() => setVisible((current) => !current)}
      aria-label={visible ? "Hide password" : "Show password"}
      title={visible ? "Hide password" : "Show password"}
    >
      {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
    </button>
  </div>;
}

export function SelectInput(props) {
  return <select {...props} className={`ui-input ${props.className || ""}`} />;
}

export function TextArea(props) {
  return <textarea {...props} className={`ui-input ui-input--textarea ${props.className || ""}`} />;
}

export function StatusBadge({ status }) {
  const tones = {
    Pending: "amber", Confirmed: "blue", Packed: "violet", Shipped: "cyan",
    Completed: "green", Cancelled: "neutral", "In Stock": "green",
    "Low Stock": "amber", "Out of Stock": "red", Active: "green", Inactive: "neutral",
  };
  return <span className={`ui-status ui-status--${tones[status] || "neutral"}`}>{status}</span>;
}

export function PageTitle({ eyebrow, title, description, action, className = "" }) {
  return <div className={`ui-page-title ${className}`}>
    <div>
      {eyebrow && <p className="ui-page-title__eyebrow">{eyebrow}</p>}
      <h1 className="ui-page-title__heading">{title}</h1>
      {description && <p className="ui-page-title__description">{description}</p>}
    </div>
    {action && <div className="ui-page-title__action">{action}</div>}
  </div>;
}

export function Surface({ children, className = "" }) {
  return <div className={`ui-surface ${className}`}>{children}</div>;
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return <div className="ui-empty-state">
    {Icon && <div className="ui-empty-state__icon"><Icon size={22} strokeWidth={1.8} /></div>}
    <h3 className="ui-empty-state__title">{title}</h3>
    {description && <p className="ui-empty-state__description">{description}</p>}
    {action && <div className="ui-empty-state__action">{action}</div>}
  </div>;
}

export function Modal({ open, onClose, title, description, children, width = "lg" }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const alreadyLocked = document.body.classList.contains("ui-modal-open");
    document.body.classList.add("ui-modal-open");
    dialogRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current?.();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      )).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (!alreadyLocked) document.body.classList.remove("ui-modal-open");
      if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return createPortal(<div className="ui-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
    <div ref={dialogRef} className={`ui-modal ui-modal--${width}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex={-1}>
      <div className="ui-modal__header">
        <div><h2 id={titleId} className="ui-modal__title">{title}</h2>{description && <p id={descriptionId} className="ui-modal__description">{description}</p>}</div>
        <button type="button" onClick={onClose} className="ui-modal__close" aria-label="Close dialog"><X size={18} aria-hidden="true" /></button>
      </div>
      {children}
    </div>
  </div>, document.body);
}

export function TableWrap({ children }) {
  return <div className="ui-table-wrap"><table className="ui-table">{children}</table></div>;
}

export const thClass = "ui-table-heading";
export const tdClass = "ui-table-cell";