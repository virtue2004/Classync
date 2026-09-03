import { useState } from "react";
import { Link } from "react-router-dom";
import { getReceiveHistory, clearReceiveHistory } from "../api/receiveHistory";
import { InstallButton } from "../components/InstallButton";

export function History() {
  const [history, setHistory] = useState(getReceiveHistory());

  function handleClear() {
    if (!confirm("Clear your locally saved receive history? This won't affect the tutor's server.")) return;
    clearReceiveHistory();
    setHistory([]);
  }

  return (
    <div className="page" style={{ maxWidth: 700, margin: "0 auto", paddingTop: "2rem" }}>
      <div className="page-header">
        <h2>Previously received</h2>
        {history.length > 0 && <button onClick={handleClear}>Clear history</button>}
      </div>

      <p className="muted">
        Saved on this device only. Reopening a share only works if you're still on the
        same network as the tutor's computer and the share hasn't been closed or expired.
      </p>

      {history.length === 0 && <p className="muted">Nothing received yet.</p>}

      {history.map((h) => (
        <div key={`${h.serverUrl}-${h.code}`} className="table" style={{ padding: "1rem", marginBottom: "0.75rem" }}>
          <strong>{h.label}</strong>
          <p className="muted">
            {h.fileNames.length} file{h.fileNames.length !== 1 ? "s" : ""} · first opened{" "}
            {new Date(h.firstViewedAt).toLocaleString()}
          </p>
          <Link to={`/receive?server=${encodeURIComponent(h.serverUrl)}&code=${h.code}`}>
            Open again
          </Link>
        </div>
      ))}

      <div style={{ marginTop: "1.5rem" }}>
        <InstallButton />
      </div>
    </div>
  );
}
