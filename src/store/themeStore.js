"use client";

import { create } from "zustand";

const THEME_ID = "neobrutalism";
const DARK_THEME_ID = "dark";
export const THEME_IDS = [THEME_ID, DARK_THEME_ID];
export const THEME_STORAGE_KEY = "9router-theme";

function normalize(theme) {
  return THEME_IDS.includes(theme) ? theme : THEME_ID;
}

function readSavedTheme() {
  if (typeof window === "undefined") return THEME_ID;
  try {
    return normalize(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return THEME_ID;
  }
}

function persistTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode / storage blocked — theme still applies for this session.
  }
}

const useThemeStore = create((set, get) => ({
  theme: THEME_ID,
  canChangeTheme: true,
  hydrated: true,

  /** Called by ThemeProvider / shell; applies the given theme. */
  setServerTheme: (theme, _canChange = true) => {
    const next = normalize(theme);
    set({ theme: next, canChangeTheme: true, hydrated: true });
    applyTheme(next);
  },

  /** Switch to a theme and remember it for the next visit. */
  setTheme: async (theme) => {
    const next = normalize(theme);
    set({ theme: next });
    applyTheme(next);
    persistTheme(next);
    return true;
  },

  toggleTheme: () => {
    const next = get().theme === DARK_THEME_ID ? THEME_ID : DARK_THEME_ID;
    set({ theme: next });
    applyTheme(next);
    persistTheme(next);
    return next;
  },

  /** Apply the saved theme after hydration (called by ThemeProvider). */
  hydrateTheme: () => {
    const saved = readSavedTheme();
    set({ theme: saved, canChangeTheme: true, hydrated: true });
    applyTheme(saved);
    return saved;
  },
}));

export function applyTheme(theme = THEME_ID) {
  if (typeof window === "undefined") return;
  const next = normalize(theme);
  const root = document.documentElement;
  root.classList.remove("dark", "glass", "brutalist", "neobrutalism");
  root.classList.add(next);
}

export default useThemeStore;
