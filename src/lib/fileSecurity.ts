import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = new Set([".webp", ".jpg", ".jpeg", ".png"]);
const ALLOWED_MIME_TYPES = new Set(["image/webp", "image/jpeg", "image/png", "image/jpg"]);

/**
 * Validates file buffer magic bytes against authentic image headers
 */
export function verifyImageMagicBytes(buffer: Buffer): { valid: boolean; format?: "webp" | "jpeg" | "png" } {
  if (buffer.length < 12) {
    return { valid: false };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, format: "jpeg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, format: "png" };
  }

  // 3. WebP: RIFF .... WEBP
  const isRiff = buffer.subarray(0, 4).toString("ascii") === "RIFF";
  const isWebp = buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (isRiff && isWebp) {
    return { valid: true, format: "webp" };
  }

  return { valid: false };
}

/**
 * Validates and securely saves an uploaded image file
 */
export async function validateAndSaveMenuImage(
  file: File | null
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!file || typeof file === "string" || file.size === 0) {
    return { success: false, error: "No image file selected." };
  }

  // 1. File size check
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      success: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB.`,
    };
  }

  // 2. Extension validation
  const ext = path.extname(file.name || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      success: false,
      error: "Unsupported file extension. Allowed formats are: .webp, .jpg, .jpeg, .png",
    };
  }

  // 3. MIME type validation (Enforce BOTH extension and MIME type)
  const mime = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    return {
      success: false,
      error: "Unsupported MIME type. Allowed formats are: image/webp, image/jpeg, image/png",
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. File signature / Magic bytes verification
    const magicCheck = verifyImageMagicBytes(buffer);
    if (!magicCheck.valid) {
      return {
        success: false,
        error: "Invalid file content. The file does not match an authentic WebP, JPEG, or PNG image signature.",
      };
    }

    // Verify format matches extension
    if (magicCheck.format === "png" && ext !== ".png") {
      return { success: false, error: "File content (PNG) does not match the provided extension." };
    }
    if (magicCheck.format === "jpeg" && ext !== ".jpg" && ext !== ".jpeg") {
      return { success: false, error: "File content (JPEG) does not match the provided extension." };
    }
    if (magicCheck.format === "webp" && ext !== ".webp") {
      return { success: false, error: "File content (WebP) does not match the provided extension." };
    }

    // 5. Destination directory setup
    const uploadDir = path.join(process.cwd(), "public", "uploads", "menu");
    await fs.mkdir(uploadDir, { recursive: true });

    // 6. Generate collision-resistant unique filename using UUID
    const uniqueId = crypto.randomUUID();
    const normalizedExt = ext === ".jpeg" ? ".jpg" : ext;
    const filename = `menu-${uniqueId}${normalizedExt}`;
    const filePath = path.join(uploadDir, filename);

    // 7. Write file to disk
    await fs.writeFile(filePath, buffer);

    return {
      success: true,
      url: `/uploads/menu/${filename}`,
    };
  } catch (err) {
    console.error("Secure image save error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while saving the image. Please try again.",
    };
  }
}
