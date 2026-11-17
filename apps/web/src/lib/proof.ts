export const PROOF_BUCKET = "payment-proofs";
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const PROOF_ACCEPT = Object.keys(EXTENSIONS).join(",");

export function isProofType(type: string) {
  return type in EXTENSIONS;
}

/** A message for the person when the image cannot be used, or null when it is fine. */
export function checkProofFile(file: { size: number; type: string } | null) {
  if (!file || file.size === 0) return "Choose a photo or screenshot of your payment first.";
  if (!isProofType(file.type)) return "Use a JPG, PNG or WebP image.";
  if (file.size > MAX_PROOF_BYTES) return "That image is too large. Please use one under 5 MB.";
  return null;
}

/** Files live in <student>/<invoice>/ so that storage rules can tell whose file it is. */
export function proofPath(studentId: string, invoiceId: string, type: string, fileId: string) {
  return `${studentId}/${invoiceId}/${fileId}.${EXTENSIONS[type]}`;
}

/** The address of the proof image. The version stops a replaced image from being served from cache. */
export function proofUrl(invoiceId: string, uploadedAt: string) {
  return `/proofs/${invoiceId}?v=${Date.parse(uploadedAt)}`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
