import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { canUseCamera, cameraUnavailableReason } from "../api/camera";

interface Props {
  onDetected: (value: string) => void;
  onClose: () => void;
}

export function QrScannerModal({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!canUseCamera()) {
        setError(cameraUnavailableReason());
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          tick();
        }
      } catch {
        setError("Couldn't access the camera. Check that this site has camera permission, or use the typed code instead.");
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height);
          if (result?.data) {
            onDetected(result.data);
            return; // parent unmounts us on detection, stop the loop
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <strong>Scan QR code</strong>
          <button className="modal-close" onClick={onClose} aria-label="Close scanner">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {error ? (
            <p className="error">{error}</p>
          ) : (
            <video ref={videoRef} className="qr-video" muted playsInline />
          )}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      </div>
    </div>
  );
}
