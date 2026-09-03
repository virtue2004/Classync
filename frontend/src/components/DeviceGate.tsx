import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useDevice } from "../context/DeviceContext";
import { ConnectScreen } from "../pages/ConnectScreen";
import { ReceiveOnlyHome } from "../pages/ReceiveOnlyHome";

/**
 * Wraps the sharer-side app. Three possible states, checked in order:
 *   1. Still checking with the server — show a loading state.
 *   2. Not connected to any server yet — show ConnectScreen.
 *   3. Connected, but this device can't share — show ReceiveOnlyHome, which
 *      displays the device's own ID so it can be handed to the owner.
 *   4. Connected AND allowed to share — render the actual sharer app.
 */
export function SharerGate({ children }: { children: ReactNode }) {
  const { device, loading } = useDevice();

  if (loading) {
    return (
      <div className="receive-screen">
        <p className="muted" style={{ color: "white" }}>
          Connecting...
        </p>
      </div>
    );
  }

  if (!device) return <ConnectScreen />;
  if (!device.can_share) return <ReceiveOnlyHome />;
  return <>{children}</>;
}

/** Extra guard for pages only the owner should reach, e.g. /devices. */
export function OwnerOnly({ children }: { children: ReactNode }) {
  const { device } = useDevice();
  if (!device?.is_owner) return <Navigate to="/" replace />;
  return <>{children}</>;
}
