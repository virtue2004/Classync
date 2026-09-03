/**
 * Browsers only allow camera access on a secure context — https:// or
 * localhost/127.0.0.1. A plain http://192.168.x.x address (exactly how most
 * receivers reach this app) is NOT secure, so navigator.mediaDevices is
 * simply undefined there. This lets the UI detect that up front and hide
 * the scan option instead of offering something guaranteed to fail.
 */
export function canUseCamera(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export function cameraUnavailableReason(): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Camera scanning needs a secure connection. This page is loaded over plain http on your local network, and browsers block camera access there — use the typed code below instead.";
  }
  return "This browser doesn't support camera access — use the typed code below instead.";
}
