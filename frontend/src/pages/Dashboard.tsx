import { Link, Outlet } from "react-router-dom";
import { useState } from "react";
import { useDevice } from "../context/DeviceContext";
import { api } from "../api/client";

export function Dashboard() {
  const { device, refresh } = useDevice();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(device?.label || "");

  async function saveLabel() {
    if (label.trim()) {
      await api.patch("/devices/me", { label: label.trim() });
      await refresh();
    }
    setEditing(false);
  }

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <h1>Classync</h1>

        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={saveLabel}
            onKeyDown={(e) => e.key === "Enter" && saveLabel()}
            style={{ fontSize: "0.85rem" }}
          />
        ) : (
          <p className="muted" onClick={() => setEditing(true)} style={{ cursor: "pointer" }} title="Click to rename this device">
            {device?.label} ✎
          </p>
        )}
        {device?.is_owner && <p className="role-tag">owner</p>}

        <Link to="/">Share files</Link>
        {device?.is_owner && <Link to="/devices">Manage devices</Link>}
        <Link to="/receive">Receive files</Link>
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
