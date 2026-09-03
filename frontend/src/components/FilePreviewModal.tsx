import { ShareFile } from "../types";
import { previewKind } from "../api/fileType";

interface Props {
  file: ShareFile;
  previewUrl: string;
  downloadUrl: string;
  onClose: () => void;
}

export function FilePreviewModal({ file, previewUrl, downloadUrl, onClose }: Props) {
  const kind = previewKind(file.content_type);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <strong>{file.original_name}</strong>
          <button className="modal-close" onClick={onClose} aria-label="Close preview">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {kind === "image" && <img src={previewUrl} alt={file.original_name} className="preview-image" />}

          {kind === "pdf" && (
            <iframe src={previewUrl} title={file.original_name} className="preview-frame" />
          )}

          {kind === "video" && (
            <video src={previewUrl} controls className="preview-video" />
          )}

          {kind === "audio" && (
            <audio src={previewUrl} controls className="preview-audio" />
          )}

          {kind === "text" && (
            <iframe src={previewUrl} title={file.original_name} className="preview-frame" />
          )}

          {kind === "none" && (
            <div className="preview-unavailable">
              <p>No preview available for this file type.</p>
              <p className="muted">Download it to view it on your device.</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <a className="button" href={downloadUrl}>
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
