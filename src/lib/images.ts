import imageCompression from "browser-image-compression";
import { MAX_IMAGE_BYTES } from "@/lib/utils";

export async function compressImage(file: File): Promise<File> {
  if (file.size <= MAX_IMAGE_BYTES && file.type === "image/webp") {
    return file;
  }

  if (file.size > MAX_IMAGE_BYTES * 2) {
    throw new Error("Image must be 5MB or less before compression.");
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: 4.5,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.85,
  });

  if (compressed.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is still too large after compression (max 5MB).");
  }

  return new File([compressed], file.name.replace(/\.[^.]+$/, ".webp"), {
    type: "image/webp",
  });
}
