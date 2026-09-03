import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { Share, ShareFile } from "../types";
import { decodeConnectionCode } from "../api/connectionCode";
import { recordShareViewed } from "../api/receiveHistory";
import { fileIcon, previewKind } from "../api/fileType";
import { FilePreviewModal } from "../components/FilePreviewModal";
import { InstallButton } from "../components/InstallButton";
import { QrScannerModal } from "../components/QrScannerModal";
import { canUseCamera, cameraUnavailableReason } from "../api/camera";

const RETRY_DELAY_MS = 4000;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function Receive() {
  const [searchParams] = useSearchParams();

  const [combinedInput, setCombinedInput] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [share, setShare] = useState<Share | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [previewFile, setPreviewFile] = useState<ShareFile | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const cancelRetryRef = useRef(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  async function fetchShare(server: string, code: string, isRetryAttempt = false) {
    if (!isRetryAttempt) {
      setError("");
      setLoading(true);
      cancelRetryRef.current = false;
    }
    try {
      const { data } = await axios.get<Share>(`${server}/shares/${code}`, { timeout: 6000 });
      setShare(data);
      setServerUrl(server);
      setShareCode(code);
      setError("");
      setRetrying(false);
      recordShareViewed(server, data);
    } catch (err: any) {
      if (!err.response) {
        // No response at all — the network dropped mid-request (hotspot cut
        // out, tutor's laptop went to sleep, etc). The data itself is safe
        // on the tutor's disk regardless; this just means we can't reach it
        // RIGHT NOW. Keep retrying instead of dead-ending on an error.
        if (cancelRetryRef.current) return;
        setRetrying(true);
        setError("Connection lost — retrying automatically...");
        retryTimeoutRef.current = setTimeout(() => fetchShare(server, code, true), RETRY_DELAY_MS);
        return;
      }
      setRetrying(false);
      setShare(null);
      if (err.response.status === 404) {
        setError("No share found with that code — check it and try again.");
      } else if (err.response.status === 410) {
        setError("This share has expired or been closed.");
      } else {
        setError("Something went wrong reaching the server. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function cancelRetry() {
    cancelRetryRef.current = true;
    setRetrying(false);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
  }

  useEffect(() => {
    const qsServer = searchParams.get("server");
    const qsCode = searchParams.get("code");
    if (qsServer && qsCode) {
      fetchShare(qsServer, qsCode);
    }
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const lastDot = combinedInput.lastIndexOf(".");
    if (lastDot === -1) {
      setError("That doesn't look like a full code — it should have a network part and a share part separated by a dot.");
      return;
    }
    const networkPart = combinedInput.slice(0, lastDot);
    const sharePart = combinedInput.slice(lastDot + 1).trim();
    try {
      const server = decodeConnectionCode(networkPart);
      fetchShare(server, sharePart);
    } catch (err: any) {
      setError(err.message || "Couldn't read that code.");
    }
  }

  function handleScanned(value: string) {
    setShowScanner(false);
    try {
      const url = new URL(value);
      const server = url.searchParams.get("server");
      const code = url.searchParams.get("code");
      if (server && code) {
        fetchShare(server, code);
        return;
      }
    } catch {
      // not a URL — fall through to the error below
    }
    setError("That QR code doesn't look like a Classync code.");
  }

  function downloadUrl(fileId: number) {
    return `${serverUrl}/shares/${shareCode}/files/${fileId}/download`;
  }

  function previewUrl(fileId: number) {
    return `${serverUrl}/shares/${shareCode}/files/${fileId}/preview`;
  }

  function downloadAllUrl() {
    return `${serverUrl}/shares/${shareCode}/download-all`;
  }

  // ---- Code entry screen ----
  if (!share) {
    return (
      <div className="receive-screen">
        <div className="receive-brand">
          <img src="/icon.svg" width={56} height={56} alt="" />
          <h1>Classync</h1>
          <p className="muted">Receive files from your tutor — no account needed.</p>
        </div>

        <form className="auth-card" onSubmit={handleManualSubmit}>
          {canUseCamera() ? (
            <>
              <button type="button" onClick={() => setShowScanner(true)}>
                📷 Scan QR code
              </button>
              <p className="muted" style={{ textAlign: "center" }}>— or type it —</p>
            </>
          ) : (
            <p className="muted">{cameraUnavailableReason()}</p>
          )}

          <label>
            Share code
            <input
              placeholder="e.g. R2M0-250Z-80.7KX2Q9"
              value={combinedInput}
              onChange={(e) => setCombinedInput(e.target.value)}
              style={{ textTransform: "uppercase" }}
            />
          </label>

          {error && <p className={retrying ? "muted" : "error"}>{error}</p>}
          {retrying && (
            <button type="button" onClick={cancelRetry}>
              Stop retrying
            </button>
          )}

          <button type="submit" disabled={loading || !combinedInput}>
            {loading ? "Looking for it..." : "Get files"}
          </button>

          <Link to="/history" className="muted">
            View previously received files →
          </Link>
        </form>

        <InstallButton />

        {showScanner && (
          <QrScannerModal onDetected={handleScanned} onClose={() => setShowScanner(false)} />
        )}
      </div>
    );
  }

  // ---- File browser screen ----
  return (
    <div className="receive-screen">
      <div className="receive-brand receive-brand-compact">
        <img src="/icon.svg" width={32} height={32} alt="" />
        <span>Classync</span>
      </div>

      <div className="share-card">
        <div className="page-header">
          <h2>{share.label}</h2>
          {share.files.length > 1 && (
            <a className="button" href={downloadAllUrl()}>
              Download all (.zip)
            </a>
          )}
        </div>

        <div className="file-grid">
          {share.files.map((f) => {
            const kind = previewKind(f.content_type);
            return (
              <div key={f.id} className="file-card">
                <div
                  className="file-card-thumb"
                  onClick={() => kind !== "none" && setPreviewFile(f)}
                  style={{ cursor: kind !== "none" ? "pointer" : "default" }}
                >
                  {kind === "image" ? (
                    <img src={previewUrl(f.id)} alt={f.original_name} />
                  ) : (
                    <span className="file-card-icon">{fileIcon(f.content_type, f.original_name)}</span>
                  )}
                </div>
                <div className="file-card-info">
                  <span className="file-card-name" title={f.original_name}>
                    {f.original_name}
                  </span>
                  <span className="muted">{formatSize(f.size_bytes)}</span>
                </div>
                <div className="file-card-actions">
                  {kind !== "none" && (
                    <button onClick={() => setPreviewFile(f)}>Preview</button>
                  )}
                  <a href={downloadUrl(f.id)}>Download</a>
                </div>
              </div>
            );
          })}
        </div>

        <p className="muted" style={{ marginTop: "1.5rem" }}>
          This share is saved to your <Link to="/history">history</Link> — find it again later
          without re-entering the code.
        </p>
      </div>

      <InstallButton />

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          previewUrl={previewUrl(previewFile.id)}
          downloadUrl={downloadUrl(previewFile.id)}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
