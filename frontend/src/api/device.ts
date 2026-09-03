const DEVICE_ID_KEY = "classync_device_id";

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
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
