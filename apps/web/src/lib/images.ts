const dataUrlFromBlob = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('无法读取图片'));
  reader.onerror = () => reject(new Error('无法读取图片'));
  reader.readAsDataURL(blob);
});

/** Shrinks camera photos before they enter localStorage during the Mock stage. */
export async function optimizeImageForLocalStorage(blob: Blob): Promise<string> {
  if (!blob.type.startsWith('image/')) throw new Error('只能选择图片文件');
  if (blob.size > 15 * 1024 * 1024) throw new Error('单张图片不能超过 15MB');
  if (!('createImageBitmap' in window)) return dataUrlFromBlob(blob);
  try {
    const bitmap = await createImageBitmap(blob);
    const maxSide = 1440;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78));
    return compressed ? dataUrlFromBlob(compressed) : dataUrlFromBlob(blob);
  } catch {
    return dataUrlFromBlob(blob);
  }
}
