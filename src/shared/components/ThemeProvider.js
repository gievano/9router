"use client";

import { useEffect } from "react";
import useThemeStore from "@/store/themeStore";

export function ThemeProvider({ children }) {
  const hydrateTheme = useThemeStore((state) => state.hydrateTheme);

  useEffect(() => {
    // Apply the saved theme (default neobrutalism) after hydration.
    // The first-paint script in layout.js already set the matching class,
    // so this only syncs the store — no flash, no forced theme.
    hydrateTheme();
  }, [hydrateTheme]);

  return <>{children}</>;
}
