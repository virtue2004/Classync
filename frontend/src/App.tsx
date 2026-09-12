import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DeviceProvider } from "./context/DeviceContext";
import { SharerGate, OwnerOnly } from "./components/DeviceGate";
import { Dashboard } from "./pages/Dashboard";
import { Shares } from "./pages/Shares";
import { ManageDevices } from "./pages/ManageDevices";
import { Receive } from "./pages/Receive";
import { History } from "./pages/History";

export default function App() {
  return (
    <BrowserRouter>
      <DeviceProvider>
        <Routes>
        {/* Public — no connection or permission needed. Most people land here. */}
        <Route path="/receive" element={<Receive />} />
        <Route path="/history" element={<History />} />

        {/* Sharer side — gated by device permission, not a login */}
        <Route
          path="/"
          element={
            <SharerGate>
              <Dashboard />
            </SharerGate>
          }
        >
          <Route index element={<Shares />} />
          <Route
            path="devices"
            element={
              <OwnerOnly>
                <ManageDevices />
              </OwnerOnly>
            }
          />
        </Route>
        </Routes>
      </DeviceProvider>
    </BrowserRouter>
  );
}
