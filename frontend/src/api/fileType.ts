export type PreviewKind = "image" | "pdf" | "video" | "audio" | "text" | "none";

export function previewKind(contentType: string): PreviewKind {
  if (contentType.startsWith("image/")) return "image";
  if (contentType === "application/pdf") return "pdf";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("text/")) return "text";
  return "none";
}

/** A simple emoji-based icon so the UI doesn't need an icon font or image assets. */
export function fileIcon(contentType: string, filename: string): string {
  const kind = previewKind(contentType);
  if (kind === "image") return "🖼️";
  if (kind === "pdf") return "📄";
  if (kind === "video") return "🎬";
  if (kind === "audio") return "🎵";
  if (kind === "text") return "📝";

  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "zip" || ext === "rar" || ext === "7z") return "🗜️";
  if (ext === "doc" || ext === "docx") return "📘";
  if (ext === "xls" || ext === "xlsx" || ext === "csv") return "📊";
  if (ext === "ppt" || ext === "pptx") return "📽️";
  return "📁";
}
