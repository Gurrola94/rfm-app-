import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

// Reduce la foto (máx. 800px, JPEG) para guardarla como texto dentro del reporte
export function compressImage(file: File, maxSize = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la foto"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Foto no válida"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Abre la cámara (o el selector de fotos) y devuelve la foto como texto, ya reducida
export async function takePhoto(
  source: "camera" | "prompt" = "camera",
  width = 800,
  quality = 70
): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      quality,
      width,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: source === "camera" ? CameraSource.Camera : CameraSource.Prompt,
    });
    return photo.dataUrl ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/cancel/i.test(msg)) return null; // el usuario cerró la cámara
    throw err;
  }
}