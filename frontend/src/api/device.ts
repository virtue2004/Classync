const DEVICE_ID_KEY = "classync_device_id";

function createDeviceId(): string {
  // randomUUID is unavailable in some browsers when the app is opened over
  // plain LAN HTTP. getRandomValues has much wider support and produces the
  // same RFC 4122 version-4 UUID shape.
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

/**
 * Every device gets one random ID, generated once and kept in localStorage
 * forever after. This is the entire identity system — no username, no
 * password. The server decides what this device is allowed to do based on
 * this ID (see device_auth.py): receive-only by default, or a sharer if
 * the owner has promoted it.
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = createDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
