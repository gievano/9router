"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import PropTypes from "prop-types";
import Button from "./Button";
import { ConfirmModal } from "./Modal";
import ManualUpdatePanel from "./ManualUpdatePanel";
import { GITHUB_CONFIG, UPDATER_CONFIG } from "@/shared/constants/config";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

// updateCheck reads the changelog heading verbatim, so the tag already rides
// along ("v0.5.165", or "git-abc1234" when there is no release yet). A caller
// that prints `v${latestVersion}` by hand ends up with "vv0.5.165" - one
// leading "v", exactly once.
function formatVersion(version) {
  if (typeof version !== "string" || !version) return "";
  return version.startsWith("v") ? version : `v${version}`;
}

// Ten minutes between checks: fast enough that a release shows up while the tab is
// open, slow enough that GitHub is not polled on every navigation.
const POLL_MS = 600000;
const DISMISSED_KEY = "9router:dismissedUpdate";

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * The one place update status lives: every install that sits behind the
 * repository is told about it here, on the dashboard itself.
 *
 * Sidebar used to carry a second copy of this (a text line, an "Update now"
 * button and the install command). Two copies drifted apart, and the sidebar one
 * appeared without any motion on route changes, so the flow lives here alone:
 * status line, copy command, the manual update panel, and dismissal. Nothing is
 * duplicated between the two surfaces.
 *
 * Driven by /api/version, which reports an update either from git (a checkout
 * that is N commits behind) or from the changelog (a newer release exists), so
 * a deploy without git history is still told to update.
 */
export default function UpdateBanner({ pollMs = POLL_MS }) {
  // Re-keyed per route below, so the banner briefly exits and re-enters on
  // navigation instead of sitting frozen while the page swaps beneath it.
  const pathname = usePathname();
  const [info, setInfo] = useState(null);
  const [dismissed, setDismissed] = useState("");
  const [isApiKeyUser, setIsApiKeyUser] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [closing, setClosing] = useState(false);
  const [shutdownCountdown, setShutdownCountdown] = useState(0);
  const { copied, copy } = useCopyToClipboard(2000);

  useEffect(() => {
    setDismissed(readDismissed());

    // Update notices are an administrator surface: a key-signed session skips it
    // instead of firing a request it may not read (same rule as Sidebar).
    let alive = true;
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        if (alive && data?.role === "apikey") setIsApiKeyUser(true);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (isApiKeyUser) return undefined;

    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (alive && data?.hasUpdate) setInfo(data);
      } catch {
        // Offline or blocked: leave the last answer on screen.
      }
    };

    check();
    const id = setInterval(check, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pollMs, isApiKeyUser]);

  // Shutdown countdown is owned here now that the panel lives here: copy the
  // command, wait out the countdown, then stop the server so the operator can
  // paste it into a terminal.
  useEffect(() => {
    if (shutdownCountdown <= 0) return undefined;
    const id = setTimeout(() => {
      fetch("/api/version/shutdown", { method: "POST" }).catch(() => {});
      setShutdownCountdown(0);
      setIsDisconnected(true);
    }, 1000);
    return () => clearTimeout(id);
  }, [shutdownCountdown]);

  const installCmd = info?.installCmd || UPDATER_CONFIG.installCmdLatest;

  const handleCopyAndShutdown = () => {
    navigator.clipboard?.writeText(installCmd).catch(() => { /* clipboard blocked */ });
    copy(installCmd);
    setShutdownCountdown(UPDATER_CONFIG.shutdownCountdownSec);
  };

  const handleCancel = () => {
    setIsUpdating(false);
    setShutdownCountdown(0);
  };

  if (isApiKeyUser) return null;

  // A newer release than the one dismissed re-opens the banner; the same one stays
  // closed for this browser.
  const identity = info?.latestVersion || "";
  const visible = Boolean(info) && Boolean(identity) && dismissed !== identity;

  // Keep the update flow reachable even after dismissal: the banner itself can be
  // dismissed, the manual update panel cannot be left without an exit.
  if (!info) return null;

  return (
    <>
      {visible && (
        // In-flow, not fixed: this sits above the content inside the layout, so
        // scrolling the page moves it like any other block instead of sticking.
        <div
          key={pathname}
          className={`w-full mb-4 ${closing ? "pointer-events-none -translate-y-2 opacity-0 transition-all duration-200 ease-in" : "slide-in-top"}`}
        >
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 backdrop-blur-md shadow-lg shadow-amber-500/5 transition-all">
            <div className="absolute -top-12 -left-12 size-32 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />
            <div className="relative flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500 ring-1 ring-amber-500/30">
                  <span className="material-symbols-outlined text-[20px]">system_update_alt</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-300">
                      {info.behindBy ? `Update available: ${info.behindBy} commit${info.behindBy > 1 ? "s" : ""} behind` : `Update available: ${info.latestVersion}`}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {info.latestVersion || "New Release"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">{summaryFor(info)}</p>
                  {Array.isArray(info.releaseNotes) && info.releaseNotes.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 border-l-2 border-amber-500/30 pl-2">
                      {info.releaseNotes.slice(0, 3).map((note) => (
                        <li key={note} className="truncate text-xs text-text-muted" title={note}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                <code className="hidden select-all overflow-x-auto whitespace-nowrap rounded-lg border border-amber-500/20 bg-black/20 px-2.5 py-1.5 font-mono text-[11px] text-amber-300/80 md:block">
                  {installCmd}
                </code>
                <Button
                  variant="primary"
                  size="sm"
                  icon="system_update_alt"
                  onClick={() => setShowConfirm(true)}
                  className="shadow-sm shadow-amber-500/20"
                >
                  Update now
                </Button>
                <a href={GITHUB_CONFIG.repoUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm" icon="open_in_new">
                    GitHub
                  </Button>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setClosing(true);
                    setTimeout(() => {
                      try {
                        window.localStorage.setItem(DISMISSED_KEY, identity);
                      } catch {}
                      setDismissed(identity);
                      setClosing(false);
                    }, 200);
                  }}
                  className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-amber-500/10 hover:text-amber-400"
                  title="Close"
                  aria-label="Dismiss update notice"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          setIsUpdating(true);
        }}
        title="Update 9Router"
        message={`Update 9Router to ${formatVersion(info.latestVersion)}? The install command is copied and the server shuts down so you can run it in a terminal.`}
        confirmText="Update"
        cancelText="Cancel"
        variant="primary"
      />

      {(isDisconnected || isUpdating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 fade-in">
          {isUpdating ? (
            <ManualUpdatePanel
              latestVersion={info.latestVersion}
              installCmd={installCmd}
              copied={copied}
              onCopyAndShutdown={handleCopyAndShutdown}
              onCancel={handleCancel}
              countdown={shutdownCountdown}
              isDisconnected={isDisconnected}
            />
          ) : (
            <div className="text-center p-8">
              <div className="flex items-center justify-center size-16 rounded-full bg-red-500/20 text-red-500 mx-auto mb-4">
                <span className="material-symbols-outlined text-[32px]">power_off</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Server Disconnected</h2>
              <p className="text-text-muted mb-6">The proxy server has been stopped.</p>
              <Button variant="secondary" onClick={() => globalThis.location.reload()}>
                Reload Page
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** One line describing how far behind this install is. */
function summaryFor(info) {
  const behind = Number.isFinite(info.behindBy) ? info.behindBy : null;
  if (behind !== null && behind > 0) {
    return `This install is ${behind} commit${behind > 1 ? "s" : ""} behind master.`;
  }
  if (info.currentRelease) {
    return `${info.currentRelease} is installed and ${info.latestVersion} is published.`;
  }
  return `${info.latestVersion} is published on the repository.`;
}

UpdateBanner.propTypes = {
  pollMs: PropTypes.number,
};
