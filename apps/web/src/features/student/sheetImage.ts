const IMAGE_NAME = /\.(avif|bmp|gif|heic|heif|jpe?g|png|webp)$/i;

export function isSheetImage(file: Pick<File, "name" | "type">): boolean {
  return file.type.startsWith("image/") || IMAGE_NAME.test(file.name);
}

/** Baja la foto a un JPEG de máximo 1600 px para que la lectura no se tarde ni rechace el archivo. */
export async function prepareSheetFile(file: File): Promise<File> {
  if (!isSheetImage(file)) throw new Error("Elige una foto de tu hoja.");
  if (typeof createImageBitmap !== "function") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    if (file.size > 8 * 1024 * 1024) throw new Error("Esa foto pesa más de 8 MB. Toma otra más de cerca.");
    return file;
  }
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "hoja";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
