import { ShareCreateResponse } from "../types";

interface Props {
  info: ShareCreateResponse;
  onClose?: () => void;
}

export function ShareConnectCard({ info, onClose }: Props) {
  return (
    <div className="auth-card" style={{ maxWidth: 480, marginTop: "1.5rem" }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h1 style={{ fontSize: "1.1rem" }}>{info.share.label}</h1>
        {onClose && (
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
      </div>

      <img
        src={info.qr_url}
        alt="Scan to receive"
        width={220}
        height={220}
        style={{ background: "white", padding: "1rem", borderRadius: 12, alignSelf: "center" }}
      />
      <p className="muted">On a phone: scan this with the camera app.</p>
      <p className="muted">On a laptop: type this code into the Receive screen —</p>
      <div
        style={{
          fontFamily: "monospace",
          fontSize: "1.1rem",
          background: "#f1f5f9",
          padding: "0.75rem",
          borderRadius: 8,
          wordBreak: "break-all",
        }}
      >
        {info.combined_code}
      </div>
    </div>
  );
}
