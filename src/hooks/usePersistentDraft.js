import { useCallback, useEffect, useState } from "react";

export default function usePersistentDraft(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const saved = window.localStorage.getItem(key);
      if (!saved) return { value: initialValue, error: "" };
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Saved draft has an invalid format.");
      }
      return { value: { ...initialValue, ...parsed }, error: "" };
    } catch (error) {
      console.error(`Could not restore draft "${key}":`, error);
      return { value: initialValue, error: "Could not restore the saved draft from this browser." };
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state.value));
      setState((current) => current.error === "Could not save this draft on this device."
        ? { ...current, error: "" }
        : current);
    } catch (error) {
      console.error(`Could not save draft "${key}":`, error);
      setState((current) => ({ ...current, error: "Could not save this draft on this device." }));
    }
  }, [key, state.value]);

  const setValue = useCallback((nextValue) => {
    setState((current) => ({
      ...current,
      value: typeof nextValue === "function" ? nextValue(current.value) : nextValue,
    }));
  }, []);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setState((current) => ({ ...current, error: "" }));
    } catch (error) {
      console.error(`Could not clear draft "${key}":`, error);
      setState((current) => ({ ...current, error: "Could not clear this saved draft from the browser." }));
    }
  }, [key]);

  return [state.value, setValue, clearDraft, state.error];
}
