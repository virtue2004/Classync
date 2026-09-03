import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { Share, ShareCreateResponse } from "../types";
import { ShareConnectCard } from "../components/ShareConnectCard";

export function Shares() {
  const [shares, setShares] = useState<Share[]>([]);
  const [label, setLabel] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [activeConnectInfo, setActiveConnectInfo] = useState<ShareCreateResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  async function loadShares() {
    const { data } = await api.get<Share[]>("/shares/mine");
    setShares(data);
  }

  useEffect(() => {
    loadShares();
  }, []);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setSelectedFiles((prev) => [...prev, ...Array.from(list)]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setError("Choose at least one file first.");
      return;
    }
    setError("");
    setCreating(true);
    try {
      const form = new FormData();
      selectedFiles.forEach((f) => {
        // webkitRelativePath preserves folder structure in the name when a
        // whole folder was selected (e.g. "Week4/slides.pptx") — falls back
        // to the plain filename for individually picked files.
        const name = (f as any).webkitRelativePath || f.name;
        form.append("uploads", f, name);
      });
      form.append("label", label || "Shared files");

      const { data } = await api.post<ShareCreateResponse>("/shares", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setActiveConnectInfo(data);
      setLabel("");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
      await loadShares();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Couldn't create the share — check the files and try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleShowCode(code: string) {
    const { data } = await api.get<ShareCreateResponse>(`/shares/${code}/connect-info`);
    setActiveConnectInfo(data);
  }

  async function handleClose(code: string) {
    if (!confirm("Close this share? Students will no longer be able to access it.")) return;
    await api.delete(`/shares/${code}`);
    if (activeConnectInfo?.share.code === code) setActiveConnectInfo(null);
    await loadShares();
  }

  return (
    <div className="page">
      <h2>Share files</h2>

      <form className="auth-card" style={{ maxWidth: 480 }} onSubmit={handleCreate}>
        <label>
          Label (what students will see)
          <input
            placeholder="e.g. Week 4 slides"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>

        <label>
          Files
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>

        <label>
          Or a whole folder
          <input
            ref={folderInputRef}
            type="file"
            // @ts-ignore — non-standard attribute, but supported by every major browser
            webkitdirectory=""
            directory=""
            multiple
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>

        {selectedFiles.length > 0 && (
          <p className="muted">
            {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected —{" "}
            <button
              type="button"
              onClick={() => setSelectedFiles([])}
              style={{ background: "none", color: "var(--danger)", padding: 0 }}
            >
              clear
            </button>
          </p>
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={creating}>
          {creating ? "Sharing..." : "Share"}
        </button>
      </form>

      {activeConnectInfo && (
        <ShareConnectCard info={activeConnectInfo} onClose={() => setActiveConnectInfo(null)} />
      )}

      <h2 style={{ marginTop: "2.5rem" }}>Your shares</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Label</th>
            <th>Code</th>
            <th>Files</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {shares.map((s) => (
            <tr key={s.id}>
              <td>{s.label}</td>
              <td style={{ fontFamily: "monospace" }}>{s.code}</td>
              <td>{s.files.length}</td>
              <td>
                <span className={`badge ${s.is_active ? "badge-approved" : "badge-rejected"}`}>
                  {s.is_active ? "active" : "closed"}
                </span>
              </td>
              <td className="actions">
                {s.is_active && (
                  <>
                    <button onClick={() => handleShowCode(s.code)}>Show code</button>
                    <button onClick={() => handleClose(s.code)}>Close</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {shares.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No shares yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
