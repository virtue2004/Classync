import { useState } from "react";
import { Link } from "react-router-dom";
import { useDevice } from "../context/DeviceContext";
import { decodeConnectionCode } from "../api/connectionCode";
import { QrScannerModal } from "../components/QrScannerModal";
import { InstallButton } from "../components/InstallButton";
import { canUseCamera, cameraUnavailableReason } from "../api/camera";
import { OwnerSetup } from "../components/OwnerSetup";

export function ConnectScreen() {
  const { connect, error } = useDevice();
  const [showScanner, setShowScanner] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [localError, setLocalError] = useState("");
  const [connecting, setConnecting] = useState(false);

  async function doConnect(url: string) {
    setConnecting(true);
    setLocalError("");
    await connect(url);
    setConnecting(false);
  }

  function handleScanned(value: string) {
    setShowScanner(false);
    try {
      const url = new URL(value);
      const server = url.searchParams.get("server");
      if (server) {
        doConnect(server);
        return;
      }
    } catch {
      // not a URL — fall through
    }
    setLocalError("That QR code doesn't look like a Classync server link.");
  }

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError("");
    try {
      const server = decodeConnectionCode(codeInput);
      doConnect(server);
    } catch (err: any) {
      setLocalError(err.message || "Couldn't read that code.");
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (manualUrl) doConnect(manualUrl);
  }

  return (
    <div className="receive-screen">
      <div className="receive-brand">
        <img src="/icon.svg" width={56} height={56} alt="" />
        <h1>Classync</h1>
        <p className="muted">Connect to a Classync server on this network.</p>
      </div>

      <div className="auth-card">
        {canUseCamera() ? (
          <>
            <button type="button" onClick={() => setShowScanner(true)}>
              📷 Scan QR code
            </button>
            <p className="muted" style={{ textAlign: "center" }}>— or —</p>
          </>
        ) : (
          <p className="muted">{cameraUnavailableReason()}</p>
        )}

        <form onSubmit={handleCodeSubmit}>
          <label>
            Connection code
            <input
              placeholder="e.g. R2M0-250Z-80"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              style={{ textTransform: "uppercase" }}
            />
          </label>
          <button type="submit" disabled={!codeInput || connecting} style={{ marginTop: "0.5rem" }}>
            Connect
          </button>
        </form>

        <p className="muted" style={{ textAlign: "center" }}>— or —</p>

        <form onSubmit={handleManualSubmit}>
          <label>
            Server address
            <input
              placeholder="http://192.168.1.20:8000"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
            />
          </label>
          <button type="submit" disabled={!manualUrl || connecting} style={{ marginTop: "0.5rem" }}>
            Connect
          </button>
        </form>

        {(localError || error) && <p className="error">{localError || error}</p>}
        {error.includes("already registered") && <OwnerSetup recovery />}

        <p className="muted">
          Just here to receive files? <Link to="/receive">Go to the receive page</Link> instead —
          no connection setup needed there.
        </p>
      </div>

      <InstallButton />

      {showScanner && (
        <QrScannerModal onDetected={handleScanned} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}
