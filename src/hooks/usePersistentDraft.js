import { useCallback, useEffect, useState } from "react";

function readDraft(key, initialValue) {
  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) return { value: initialValue, error: "" };
    const parsed = JSON.parse(saved);
    if (initialValue === null) return { value: parsed, error: "" };
    if (Array.isArray(initialValue)) {
      if (!Array.isArray(parsed)) throw new Error("Saved draft has an invalid format.");
      return { value: parsed, error: "" };
    }
    if (typeof initialValue !== "object") {
      if (typeof parsed !== typeof initialValue) throw new Error("Saved draft has an invalid format.");
      return { value: parsed, error: "" };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Saved draft has an invalid format.");
    }
    return { value: { ...initialValue, ...parsed }, error: "" };
  } catch (error) {
    console.error(`Could not restore draft "${key}":`, error);
    return { value: initialValue, error: "Could not restore the saved draft from this browser." };
  }
}

export default function usePersistentDraft(key, initialValue) {
  const [initialDraft] = useState(() => readDraft(key, initialValue));
  const [value, setStoredValue] = useState(initialDraft.value);
  const [error, setError] = useState(initialDraft.error);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      setError((current) => current === "Could not save this draft on this device." ? "" : current);
    } catch (error) {
      console.error(`Could not save draft "${key}":`, error);
      setError("Could not save this draft on this device.");
    }
  }, [key, value]);

  const updateValue = useCallback((nextValue) => {
    setStoredValue((current) => typeof nextValue === "function" ? nextValue(current) : nextValue);
  }, []);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setError("");
    } catch (error) {
      console.error(`Could not clear draft "${key}":`, error);
      setError("Could not clear this saved draft from the browser.");
    }
  }, [key]);

  return [value, updateValue, clearDraft, error];
}
