import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setDeviceToken, setServerUrl } from "../api/client";
import { getDeviceId } from "../api/device";

export interface DeviceInfo {
  device_id: string;
  label: string;
  can_share: boolean;
  is_owner: boolean;
}

interface DeviceContextValue {
  device: DeviceInfo | null;
  loading: boolean;
  error: string;
  ownerExists: boolean | null;
  refresh: () => Promise<void>;
  connect: (serverUrl: string) => Promise<void>;
  claimOwner: (setupKey: string, recover?: boolean) => Promise<void>;
  recoverRegistration: (setupKey: string) => Promise<void>;
}

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ownerExists, setOwnerExists] = useState<boolean | null>(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post<DeviceInfo & { device_token: string }>("/devices/register");
      setDeviceToken(data.device_token);
      setDevice(data);
      const setup = await api.get<{ owner_exists: boolean }>("/devices/setup-status");
      setOwnerExists(setup.data.owner_exists);
    } catch {
      setError("Couldn't reach the server on this address.");
      setDevice(null);
      setOwnerExists(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getDeviceId(); // make sure it exists before the first request
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect(serverUrl: string) {
    setServerUrl(serverUrl);
    await refresh();
  }

  async function claimOwner(setupKey: string, recover = false) {
    const { data } = await api.post<DeviceInfo>(recover ? "/devices/recover-owner" : "/devices/claim-owner", {
      setup_key: setupKey,
    });
    setDevice(data);
    setOwnerExists(true);
  }

  async function recoverRegistration(setupKey: string) {
    const { data } = await api.post<DeviceInfo & { device_token: string }>("/devices/recover-registration", { setup_key: setupKey });
    setDeviceToken(data.device_token);
    setDevice(data);
    const setup = await api.get<{ owner_exists: boolean }>("/devices/setup-status");
    setOwnerExists(setup.data.owner_exists);
  }

  return (
    <DeviceContext.Provider value={{ device, loading, error, ownerExists, refresh, connect, claimOwner, recoverRegistration }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error("useDevice must be used inside DeviceProvider");
  return ctx;
}
