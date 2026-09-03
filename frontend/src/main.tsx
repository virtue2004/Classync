import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registering this is what makes the browser eligible to offer "Install"
// (via the useInstallPrompt hook) — see public/sw.js for why it's minimal.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not fatal — the app still works fully without it, it just won't
      // be installable as a standalone app on this browser.
    });
  });
}
