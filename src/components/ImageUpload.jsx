import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";
import Alert from "./Alert";
import { prepareProductImage, PRODUCT_IMAGE_PLACEHOLDER } from "../utils/productImage";
import "../css/ImageUpload.css";

export default function ImageUpload({ value, onChange, onBusyChange }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const requestId = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { requestId.current += 1; }, []);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const currentRequest = ++requestId.current;
    setBusy(true);
    setError("");
    onBusyChange?.(true);
    try {
      const image = await prepareProductImage(file);
      if (requestId.current === currentRequest) onChange(image);
    } catch (uploadError) {
      if (requestId.current === currentRequest) {
        setError(uploadError.message || "The image could not be uploaded. Try another file.");
        if (inputRef.current) inputRef.current.value = "";
      }
    } finally {
      if (requestId.current === currentRequest) {
        setBusy(false);
        onBusyChange?.(false);
      }
    }
  };

  const remove = () => {
    onChange("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const hasImage = Boolean(value && value !== PRODUCT_IMAGE_PLACEHOLDER);

  return <div className="image-upload">
    <label htmlFor={inputId} className="image-upload__label">Upload image</label>
    <div className="image-upload__body">
      <div className="image-upload__preview">
        {hasImage ? <img src={value} alt="Product image preview" /> : <ImagePlus size={24} strokeWidth={1.5} />}
      </div>
      <div className="image-upload__controls">
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          disabled={busy}
          onChange={upload}
          aria-describedby={`${inputId}-help ${error ? `${inputId}-error` : ""}`}
          aria-invalid={!!error}
          className="image-upload__input"
        />
        <p id={`${inputId}-help`} className="image-upload__hint">JPG, PNG, or WebP. Up to 5 MB.</p>
        {busy && <p className="image-upload__progress" role="status"><LoaderCircle size={13} />Preparing image...</p>}
        <Alert id={`${inputId}-error`} message={error} type="error" onDismiss={() => setError("")} />
        {hasImage && !busy && <button type="button" onClick={remove} className="image-upload__remove">Remove image</button>}
      </div>
    </div>
  </div>;
}