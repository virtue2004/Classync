import { useState } from "react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

export function InstallButton() {
  const { canInstall, isIos, installed, promptInstall } = useInstallPrompt();
  const [showIosSteps, setShowIosSteps] = useState(false);

  if (installed) return null;

  if (isIos) {
    return (
      <div className="install-block">
        <button type="button" onClick={() => setShowIosSteps((v) => !v)}>
          📲 Install Classync
        </button>
        {showIosSteps && (
          <p className="muted install-steps">
            Tap the <strong>Share</strong> button in Safari, then{" "}
            <strong>"Add to Home Screen"</strong>.
          </p>
        )}
      </div>
    );
  }

  if (!canInstall) return null;

  return (
    <button type="button" onClick={promptInstall} className="install-block">
      📲 Install Classync
    </button>
  );
}
