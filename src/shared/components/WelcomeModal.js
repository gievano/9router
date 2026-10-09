"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { GITHUB_CONFIG } from "@/shared/constants/config";

// Update notices live in their own banner, so this dialog stays about the repo.
export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeOnOverlay={false}
      title="Welcome to 9Router!"
      size="md"
      footer={null}
    >
      <div className="text-text-main text-sm">
        {/* The panel carries its own gradient wash so it reads as a welcome
            screen rather than a grey card, and the wash is layered UNDER the
            card content so text contrast never depends on it. */}
        <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-2">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              background:
                "radial-gradient(120% 80% at 15% 0%, #3b82f6 0%, transparent 55%), radial-gradient(100% 70% at 85% 10%, #8b5cf6 0%, transparent 50%), radial-gradient(120% 90% at 50% 100%, #06b6d4 0%, transparent 60%)",
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          <div className="relative flex flex-col items-center gap-5 px-6 pt-8 pb-7 text-center">
            {/* Concentric ring + glyph: the mark, given depth without an image. */}
            <div className="relative flex items-center justify-center size-24">
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full animate-[spin_14s_linear_infinite]"
                style={{
                  background:
                    "conic-gradient(from 0deg, #3b82f6, #8b5cf6, #06b6d4, #3b82f6)",
                  maskImage: "radial-gradient(circle, transparent 62%, #000 63%)",
                  WebkitMaskImage: "radial-gradient(circle, transparent 62%, #000 63%)",
                }}
              />
              <span
                aria-hidden="true"
                className="absolute inset-[10px] rounded-full bg-surface-2 border border-border-subtle"
              />
              <span className="material-symbols-outlined relative text-[40px] leading-none text-primary">
                hub
              </span>
            </div>

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
                    <span className="material-symbols-outlined text-[14px] leading-none text-primary">
                      {f.icon}
                    </span>
                    {f.title}
                  </span>
                  <span className="text-[11px] leading-snug text-text-muted">{f.body}</span>
                </li>
              ))}
            </ul>

            <div className="flex w-full flex-col items-center gap-3 pt-1">
              <a
                href={GITHUB_CONFIG.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full sm:w-auto"
              >
                <Button variant="primary" icon="star" fullWidth className="sm:w-auto">
                  Star on GitHub
                </Button>
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
  );
}
