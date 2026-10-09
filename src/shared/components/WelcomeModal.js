"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import Button from "./Button";
import ChangelogModal from "./ChangelogModal";
import { GITHUB_CONFIG } from "@/shared/constants/config";

// Update notices live in their own banner, so this dialog stays about the repo.
export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);

  useEffect(() => {
    const neverShow = localStorage.getItem("9router:welcomeNeverShow") === "true";
    const justLoggedIn = sessionStorage.getItem("9router:justLoggedIn") === "true";

    if (neverShow || !justLoggedIn) {
      setIsOpen(false);
    } else {
      sessionStorage.removeItem("9router:justLoggedIn");
      setIsOpen(true);
    }
  }, []);

  const handleDontShowAgain = () => {
    localStorage.setItem("9router:welcomeNeverShow", "true");
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeOnOverlay={false}
      title="Welcome to 9Router!"
      size="md"
      footer={null}
    >
      <div className="text-text-main text-sm">
        {/* Theme-synced welcome panel. The only wash is .dot-grid-bg, which is
            built from the brand scale and carries its own .dark branch — so the
            banner follows dark/light/glass like every other surface. No fixed
            hex colours, no spinning ring. */}
        <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-2">
          <div aria-hidden="true" className="dot-grid-bg pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="relative flex flex-col items-center gap-5 px-6 pt-8 pb-7 text-center">
            {/* The product mark, not a ligature in a coloured ring. */}
            <img
              src="/icons/icon-512.svg"
              alt=""
              width={64}
              height={64}
              className="size-16 rounded-2xl border border-border-subtle shadow-[var(--shadow-elev)]"
            />

            <div className="space-y-1.5">
              <p className="text-2xl font-bold tracking-tight leading-none">
                9<span className="text-primary">Router</span>
              </p>
              <p className="text-xs text-text-muted">
                One OpenAI-compatible endpoint for every model you connect
              </p>
            </div>

            {/* What it does, as three scannable points rather than a paragraph. */}
            <ul className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2 text-left">
              {[
                { icon: "hub", title: "One key", body: "Every provider behind a single endpoint" },
                { icon: "swap_horiz", title: "Any model", body: "Built-in, custom or your own combo" },
                { icon: "tune", title: "Full control", body: "Plugins, quotas, proxy pools, CLI tools" },
              ].map((f) => (
                <li
                  key={f.title}
                  className="flex flex-col gap-1 rounded-xl border border-border-subtle bg-background/40 p-3"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-text-main">
                    <span className="material-symbols-outlined text-[14px] leading-none text-text-muted">
                      {f.icon}
                    </span>
                    {f.title}
                  </span>
                  <span className="text-[11px] leading-snug text-text-muted">{f.body}</span>
                </li>
              ))}
            </ul>

            {/* Every control does something: Get started dismisses, View
                changelog mounts the same modal the header menu uses, Star goes
                to the repo. Modal renders its X on mobile only and this dialog
                sets closeOnOverlay={false}, so without Get started a desktop
                user had no way out. */}
            <div className="flex w-full flex-col items-center gap-3 pt-1">
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  variant="primary"
                  icon="rocket_launch"
                  fullWidth
                  className="sm:w-auto"
                  onClick={handleClose}
                >
                  Get started
                </Button>
                <Button
                  variant="outline"
                  icon="history"
                  fullWidth
                  className="sm:w-auto"
                  onClick={() => { setIsOpen(false); setChangelogOpen(true); }}
                >
                  View changelog
                </Button>
              </div>
              <a
                href={GITHUB_CONFIG.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-text-muted underline-offset-2 transition-colors hover:text-text-main hover:underline"
              >
                Star on GitHub
              </a>
              <button
                type="button"
                onClick={handleDontShowAgain}
                className="text-[11px] text-text-muted underline-offset-2 transition-colors hover:text-text-main hover:underline"
              >
                Don&apos;t show this again
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
      <ChangelogModal isOpen={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </>
  );
}
