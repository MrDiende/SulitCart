import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "../css/Alert.css";

const AlertContext = createContext(null);

function AlertMessage({ alert, dismiss }) {
  const [paused, setPaused] = useState(false);
  const close = useCallback(() => {
    dismiss(alert.id);
    alert.onDismiss?.();
  }, [alert, dismiss]);

  useEffect(() => {
    if (!alert.duration || paused) return;
    const timeout = window.setTimeout(close, alert.duration);
    return () => window.clearTimeout(timeout);
  }, [alert, close, paused]);

  return <div
    id={alert.id}
    role={alert.type === "success" ? "status" : "alert"}
    aria-atomic="true"
    onMouseEnter={() => setPaused(true)}
    onMouseLeave={() => setPaused(false)}
    onFocus={() => setPaused(true)}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
    className={`alert-message alert-message--${alert.type}`}
  >
    <p className="alert-message__text">{alert.message}</p>
    <button type="button" onClick={close} className="alert-message__dismiss" aria-label="Dismiss notification"><X size={16} aria-hidden="true" /></button>
  </div>;
}

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const nextId = useRef(0);
  const show = useCallback((alert) => {
    setAlerts((current) => [...current.filter((item) => item.id !== alert.id), alert].slice(-3));
  }, []);
  const dismiss = useCallback((id) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  }, []);
  const notify = useCallback((message, options = {}) => {
    if (!message) return;
    const id = options.id || `notification-${++nextId.current}`;
    const type = options.type || "success";
    show({ ...options, id, message, type, duration: options.duration ?? (type === "success" ? 4000 : 6000) });
    return id;
  }, [show]);
  const value = useMemo(() => ({ show, dismiss, notify }), [show, dismiss, notify]);

  return <AlertContext.Provider value={value}>
    {children}
    {alerts.length > 0 && createPortal(
      <div className="alert-region" aria-label="Notifications">
        {alerts.map((alert) => <AlertMessage key={alert.id} alert={alert} dismiss={dismiss} />)}
      </div>,
      document.body,
    )}
  </AlertContext.Provider>;
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) throw new Error("useAlert must be used inside AlertProvider");
  return context;
}

export default function Alert({ message, type = "success", duration, onDismiss, id, trigger }) {
  const context = useContext(AlertContext);
  if (!context) throw new Error("Alert must be used inside AlertProvider");
  const generatedId = useId();
  const alertId = id || generatedId;
  const callback = useRef(onDismiss);
  const { show, dismiss } = context;
  const lifetime = duration ?? (type === "success" ? 4000 : 6000);
  const handleDismiss = useCallback(() => callback.current?.(), []);

  useEffect(() => { callback.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
    if (!message) return;
    show({ id: alertId, message, type, duration: lifetime, onDismiss: handleDismiss });
    return () => dismiss(alertId);
  }, [alertId, message, type, lifetime, trigger, show, dismiss, handleDismiss]);

  return null;
}