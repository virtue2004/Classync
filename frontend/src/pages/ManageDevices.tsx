import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useDevice } from "../context/DeviceContext";

interface DeviceRow {
  device_id: string;
  label: string;
  can_share: boolean;
  is_owner: boolean;
  last_seen: string;
}

export function ManageDevices() {
  const { device: myDevice } = useDevice();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [promoteId, setPromoteId] = useState("");
  const [promoteLabel, setPromoteLabel] = useState("");
  const [error, setError] = useState("");
  const [promoting, setPromoting] = useState(false);

  async function load() {
    const { data } = await api.get<DeviceRow[]>("/devices");
    setDevices(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPromoting(true);
    try {
      await api.post("/devices/promote", {
        device_id: promoteId.trim(),
        label: promoteLabel.trim() || undefined,
      });
      setPromoteId("");
      setPromoteLabel("");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Couldn't find that device.");
    } finally {
      setPromoting(false);
    }
  }

  async function handleRevoke(deviceId: string) {
    if (!confirm("Revoke sharing access for this device? It'll go back to receive-only.")) return;
    await api.post(`/devices/${deviceId}/revoke`);
    await load();
  }

  return (
    <div className="page">
      <h2>Devices</h2>
      <p className="muted">
        Only devices listed here as "can share" are allowed to publish files. Everyone else on
        the network can only receive. Ask the person for the device ID shown at the bottom of
        their app to add them.
      </p>

      <form className="inline-form" onSubmit={handlePromote}>
        <input
          placeholder="Device ID to promote"
          value={promoteId}
          onChange={(e) => setPromoteId(e.target.value)}
          required
          style={{ minWidth: 260, fontFamily: "monospace", fontSize: "0.8rem" }}
        />
        <input
          placeholder="Label (optional, e.g. 'Mrs Bello's laptop')"
          value={promoteLabel}
          onChange={(e) => setPromoteLabel(e.target.value)}
        />
        <button type="submit" disabled={promoting}>
          {promoting ? "Adding..." : "Add as sharer"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      <table className="table" style={{ marginTop: "1.5rem" }}>
        <thead>
          <tr>
            <th>Label</th>
            <th>Device ID</th>
            <th>Status</th>
            <th>Last seen</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.device_id}>
              <td>
                {d.label}
                {d.device_id === myDevice?.device_id && <span className="muted"> (this device)</span>}
              </td>
              <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{d.device_id}</td>
              <td>
                {d.is_owner ? (
                  <span className="badge badge-approved">owner</span>
                ) : d.can_share ? (
                  <span className="badge badge-approved">can share</span>
                ) : (
                  <span className="badge badge-pending">receive only</span>
                )}
              </td>
              <td>{new Date(d.last_seen).toLocaleString()}</td>
              <td>
                {d.can_share && !d.is_owner && (
                  <button onClick={() => handleRevoke(d.device_id)}>Revoke</button>
                )}
              </td>
            </tr>
          ))}
          {devices.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No devices have connected yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
