import { useState } from "react";
import { useDevice } from "../context/DeviceContext";

export function OwnerSetup({ recovery = false }: { recovery?: boolean }) {
  const { claimOwner, recoverRegistration } = useDevice();
  const [setupKey, setSetupKey] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (recovery) await recoverRegistration(setupKey);
      await claimOwner(setupKey, recovery);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not complete owner setup.");
    } finally {
      setSaving(false);
    }
  }

  return <form className="auth-card" onSubmit={submit}>
    <h2>{recovery ? "Recover owner access" : "Set up the owner device"}</h2>
    <p className="muted">Enter the setup key stored in the server's <code>.env</code> file.</p>
    <input type="password" value={setupKey} onChange={(e) => setSetupKey(e.target.value)} placeholder="Server setup key" required />
    {error && <p className="error">{error}</p>}
    <button disabled={saving}>{saving ? "Checking..." : recovery ? "Recover ownership" : "Become owner"}</button>
  </form>;
}
