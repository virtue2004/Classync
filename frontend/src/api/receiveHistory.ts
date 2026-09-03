import { ReceivedShareRecord, Share } from "../types";

const HISTORY_KEY = "academy_share_receive_history";
const MAX_HISTORY = 100;

export function getReceiveHistory(): ReceivedShareRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Records that this device opened a share, so it shows up later in
 * "Previously received" even if the person didn't download every file.
 * This is just a local index — it doesn't copy the files anywhere. If the
 * share expires or the tutor's server is off the network, the entry stays
 * visible but downloading from it will fail.
 */
export function recordShareViewed(serverUrl: string, share: Share) {
  const history = getReceiveHistory();
  const existingIndex = history.findIndex((h) => h.code === share.code && h.serverUrl === serverUrl);

  const record: ReceivedShareRecord = {
    code: share.code,
    label: share.label,
    serverUrl,
    firstViewedAt: existingIndex >= 0 ? history[existingIndex].firstViewedAt : new Date().toISOString(),
    fileNames: share.files.map((f) => f.original_name),
  };

  if (existingIndex >= 0) {
    history[existingIndex] = record;
  } else {
    history.unshift(record);
  }

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export function clearReceiveHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
