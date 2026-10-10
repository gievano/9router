"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import Button from "./Button";
import ChangelogModal from "./ChangelogModal";
import { GITHUB_CONFIG } from "@/shared/constants/config";

// Post-login welcome dialog.
//
// One surface, not a banner inside a banner. Earlier versions nested a rounded
// panel (surface-2, border, dot-grid) inside the Modal — which is itself a
// rounded bordered panel — and put three more mini-cards inside that. Three
// layers of the same container reads as decoration, and the middle layer was
// carrying no information the surrounding dialog did not already carry.
//
// So the dialog's own surface is the only surface. Content sits directly on it:
// the product mark and wordmark as the header (replacing the generic Modal
// title, so the brand is stated once), one specific line of what it is, three
// plain facts as a list, then the actions. Colour comes from the theme tokens
// alone — text-primary on the wordmark is the only accent.
//
// Every control works: Get started dismisses, View changelog closes this dialog
// and mounts the same ChangelogModal the header menu uses (as a sibling, so two
// overlays never stack), Star on GitHub opens the repo, Don't show this again
// persists the refusal. Modal renders its X on mobile only and this dialog sets
// closeOnOverlay={false}, so Get started is the desktop exit — it must stay.
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

  // No early `return null` here: the changelog mounts as a sibling below, and an
  // early return would unmount the whole fragment (changelog included) the moment
  // "View changelog" closes the welcome dialog. <Modal> already renders nothing
  // when isOpen is false, so passing it through is enough.
  if (!isOpen && !changelogOpen) return null;

  const facts = [
    "One key and one base URL in front of every provider you connect.",
    "Model combos route across providers, with per-model quotas and proxy pools.",
    "Custom plugins per model: vision, deep reasoning, JSON repair, tool bridge, anti-slop.",
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        closeOnOverlay={false}
        size="md"
        footer={null}
      >
        {/* Header: the product mark and wordmark stand in for the generic Modal
            title, so the brand is stated once instead of twice. */}
        <div className="flex items-center gap-3">
          <img
            src="/icons/icon-512.svg"
            alt=""
            width={44}
            height={44}
            className="size-11 rounded-xl border border-border-subtle"
          />
          <div>
            <p className="text-lg font-bold tracking-tight leading-tight">
              9<span className="text-primary">Router</span>
            </p>
            <p className="text-xs text-text-muted">Welcome</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-text-muted leading-relaxed">
          An OpenAI-compatible gateway in front of the models you connect — built-in
          providers, your own endpoints, or a combo of both.
        </p>

        {/* Plain facts, no cards: the dialog is the container, so the list does
            not need its own. */}
        <ul className="mt-4 space-y-2 text-sm text-text-main">
          {facts.map((fact) => (
            <li key={fact} className="flex gap-2 leading-relaxed">
              <span className="text-text-muted select-none" aria-hidden="true">
                —
              </span>
              <span>{fact}</span>
            </li>
          ))}
        </ul>

        {/* Actions. Get started dismisses; without it a desktop user has no way
            out (Modal renders its X on mobile only, overlay click is off). */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="primary"
            fullWidth
            className="sm:w-auto"
            onClick={handleClose}
          >
            Get started
          </Button>
          <Button
            variant="outline"
            fullWidth
            className="sm:w-auto"
            onClick={() => { setIsOpen(false); setChangelogOpen(true); }}
          >
            View changelog
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-text-muted">
          <a
            href={GITHUB_CONFIG.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 transition-colors hover:text-text-main hover:underline"
          >
            Star on GitHub
          </a>
          <button
            type="button"
            onClick={handleDontShowAgain}
            className="underline-offset-2 transition-colors hover:text-text-main hover:underline"
          >
            Don&apos;t show this again
          </button>
        </div>
      </Modal>
      <ChangelogModal isOpen={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </>
  );
}