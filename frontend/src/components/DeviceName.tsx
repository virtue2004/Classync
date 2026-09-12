import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useDevice } from "../context/DeviceContext";

export function DeviceName() {
  const { device, loading, refresh } = useDevice();
  const [label, setLabel] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (device) setLabel(device.label === "Unnamed device" ? "" : device.label);
  }, [device]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    await api.patch("/devices/me", { label: label.trim() });
    await refresh();
    setSaved(true);
  }

  if (loading || !device) return null;

  return (
    <form className="device-name-card" onSubmit={save} autoComplete="off">
      <label>
        Your device name
        <input
          value={label}
          onChange={(e) => { setLabel(e.target.value); setSaved(false); }}
          placeholder="e.g. Ada's laptop"
          maxLength={120}
          autoComplete="off"
        />
      </label>
      <button type="submit" disabled={!label.trim()}>Save name</button>
      {saved && <span className="safety-clean">Saved</span>}
      <p className="muted">The owner uses this name to identify your device.</p>
    </form>
  );
}
