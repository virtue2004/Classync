import { ShareCreateResponse } from "../types";

interface Props {
  info: ShareCreateResponse;
  onClose?: () => void;
}

export function ShareConnectCard({ info, onClose }: Props) {
  const statuses = info.share.files.map((file) => file.scan_status || "unscanned");
  const suspicious = statuses.filter((status) => status === "suspicious").length;
  const unscanned = statuses.filter((status) => status === "unscanned").length;

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

      {suspicious > 0 ? (
        <p className="safety-status safety-suspicious">
          Warning: {suspicious} file{suspicious === 1 ? "" : "s"} failed a safety check. Receivers must review the risk before downloading.
        </p>
      ) : unscanned > 0 ? (
        <p className="safety-status safety-unscanned">
          {unscanned} file{unscanned === 1 ? " was" : "s were"} not verified by antivirus. Receivers will be warned.
        </p>
      ) : (
        <p className="safety-status safety-clean">All files passed integrity and antivirus checks.</p>
      )}

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
