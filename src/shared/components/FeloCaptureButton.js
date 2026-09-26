"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import Button from "@/shared/components/Button";
import { buildCdpWarning } from "@/shared/utils/cdpWarning";

// One-click capture of the logged-in Felo session from the user's running
// Chromium browser (Brave/Chrome/Edge, started with --remote-debugging-port).
// Calls POST /api/providers/felo-capture, then hands the ready-to-paste
// credential string to onCaptured so the modal can fill its API key field.
// If no browser is reachable, offers a "Launch browser" action that detects
// the OS, picks an installed browser and starts it with the debug port.
//
// Logged-in Felo sessions authenticate via the session token (the
// felo-user-token cookie value) — no Turnstile cf_token needed.
export default function FeloCaptureButton({ onCaptured }) {
  const [capturing, setCapturing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [status, setStatus] = useState(null); // { ok, message, profile, canLaunch }
  const [cdpWarn, setCdpWarn] = useState(null);

  const handleCapture = async () => {
    setCapturing(true);
    setStatus(null);
    setCdpWarn(null);
    try {
      const res = await fetch("/api/providers/felo-capture", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.credential) {
        setStatus({
          ok: true,
          message: data.profile ? "Captured — session valid" : "Captured — session cookie found",
          profile: data.profile,
        });
        setCdpWarn(buildCdpWarning(data.cdpUpSinceMs));
        onCaptured?.(data.credential, data.profile);
      } else {
        setStatus({
          ok: false,
          message: data.message || data.error || "Capture failed",
          canLaunch: data.error === "browser_not_reachable",
        });
      }
    } catch {
      setStatus({ ok: false, message: "Capture failed — is the app server running?" });
    } finally {
      setCapturing(false);
    }
  };

  // Detects OS + installed browser and starts it with the CDP debug port,
  // then re-runs the capture automatically.
  const handleLaunch = async () => {
    setLaunching(true);
    setStatus(null);
    try {
      const res = await fetch("/api/providers/felo-capture/launch", { method: "POST" });
      const data = await res.json();
      if (res.ok && (data.alreadyRunning || data.launched)) {
        await handleCapture();
      } else {
        setStatus({ ok: false, message: data.message || data.error || "Launch failed" });
      }
    } catch {
      setStatus({ ok: false, message: "Launch failed — is the app server running?" });
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={handleCapture}
          variant="outline"
          size="sm"
          icon="language"
          loading={capturing}
          disabled={capturing || launching}
        >
          {capturing ? "Capturing..." : "Capture from Felo"}
        </Button>
        {status?.canLaunch && !capturing && (
          <Button onClick={handleLaunch} variant="primary" size="sm" icon="open_in_new" loading={launching} disabled={launching}>
            {launching ? "Launching..." : "Launch browser"}
          </Button>
        )}
        <span className="text-xs text-text-muted">reads your session from the running browser tab</span>
      </div>
      {status && (
        <div className={status.ok ? "text-xs text-green-400" : "text-xs text-yellow-400 break-words"}>
          {status.ok && status.profile && (
            <div className="flex items-center gap-2 mb-1">
              {status.profile.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={status.profile.image} alt="" className="h-5 w-5 rounded-full" />
              )}
              <span className="font-medium">{status.profile.name}</span>
              {status.profile.email && <span className="text-text-muted">({status.profile.email})</span>}
            </div>
          )}
          {status.message}
        </div>
      )}
      {cdpWarn && (
        <div className="flex items-start gap-1.5 text-xs text-yellow-400 break-words">
          <span className="material-symbols-outlined text-[14px] mt-px">warning</span>
          <span>{cdpWarn.text}</span>
        </div>
      )}
    </div>
  );
}

FeloCaptureButton.propTypes = {
  onCaptured: PropTypes.func,
};
