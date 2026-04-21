/**
 * Compresses an image file using Canvas API.
 * Resizes to maxWidth (maintaining aspect ratio) and re-encodes as JPEG.
 * Falls back to original file if compression fails.
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.82
): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".jpg"),
            { type: "image/jpeg" }
          );
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}
