"use client";

import { cn } from "@/shared/utils/cn";
import { LOCALE_TAGS } from "@/shared/constants/locales";

// Language and region chips. The UI used to render flag emoji here, but an
// emoji is a font glyph: its shape is whatever the OS ships, it cannot take a
// design token colour, and on Windows the flags do not exist at all (the
// regional indicators collapse to the bare letters). The same information as
// styled text stays identical everywhere and inherits the theme.
export function localeTag(locale) {
  const key = String(locale || "");
  if (LOCALE_TAGS[key]) return LOCALE_TAGS[key];
  const base = key.split("-")[0].slice(0, 2).toUpperCase();
  return base || "??";
}

export default function LocaleBadge({ locale, tag, className = "" }) {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[26px] shrink-0 items-center justify-center rounded-[5px] border border-border-subtle bg-surface-2 px-1 text-[9px] font-semibold uppercase leading-none tracking-[0.04em] text-text-muted",
        className
      )}
    >
      {tag || localeTag(locale)}
    </span>
  );
}
