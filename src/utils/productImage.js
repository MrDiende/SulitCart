export const PRODUCT_IMAGE_PLACEHOLDER = "/images/product-placeholder.svg";
export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

export async function prepareProductImage(file) {
  const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
  const supportedExtension = /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!supportedTypes.includes(file.type) && !(file.type === "" && supportedExtension)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }
  if (!file.size || file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error("Choose an image smaller than 5 MB.");
  }

  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("This image could not be read. Try another file."));
    reader.onabort = () => reject(new Error("The image upload was interrupted. Try again."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const preview = new Image();
    preview.onload = () => resolve(preview);
    preview.onerror = () => reject(new Error("This file is not a readable image. Choose another file."));
    preview.src = source;
  });

  // Resize uploads so product photos can persist in the browser-only prototype.
  const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is unavailable in this browser.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let encodedImage = "";
  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    encodedImage = canvas.toDataURL("image/jpeg", quality);
    if (encodedImage.length <= 350000) return encodedImage;
  }
  throw new Error("This image is too large to save locally. Choose a smaller image.");
}