import { Link } from "react-router-dom";
import { useDevice } from "../context/DeviceContext";
import { InstallButton } from "../components/InstallButton";
import { OwnerSetup } from "../components/OwnerSetup";

export function ReceiveOnlyHome() {
  const { device, ownerExists } = useDevice();

  return (
    <div className="receive-screen">
      <div className="receive-brand">
        <img src="/icon.svg" width={56} height={56} alt="" />
        <h1>Classync</h1>
      </div>

      <div className="auth-card">
        <p>
          This device is connected, but can only <strong>receive</strong> files right now.
        </p>
        <p className="muted">
          To share files from this device too, give the ID below to whoever owns this server and
          ask them to add it from their Devices page.
        </p>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "0.85rem",
            background: "#f1f5f9",
            padding: "0.75rem",
            borderRadius: 8,
            wordBreak: "break-all",
          }}
        >
          {device?.device_id}
        </div>

        <Link to="/receive">
          <button type="button" style={{ width: "100%", marginTop: "1rem" }}>
            Go to Receive files
          </button>
        </Link>
      </div>

      {ownerExists === false && <OwnerSetup />}
      {ownerExists === true && (
        <details style={{ width: "min(100% - 2rem, 480px)", marginTop: "1rem" }}>
          <summary className="muted" style={{ cursor: "pointer" }}>
            Already an owner? Link this phone or device
          </summary>
          <OwnerSetup recovery />
        </details>
      )}

      <InstallButton />
    </div>
  );
}
