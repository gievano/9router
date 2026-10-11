/**
 * Theme switching stays on two dark-based modes with no orphan classes.
 *
 * Both modes keep `.dark` on <html> (every component renders from dark-tuned
 * tokens); `.glass` adds the frosted overrides. An unknown persisted value
 * must degrade to the glass default rather than a class combination the CSS never
 * defines, which would silently render a broken theme.
 *
 * The suite runs in the node environment, so window/document/localStorage are
 * stubbed before the store module loads - zustand-persist reads localStorage at
 * import time.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

let classes;
let store;

function stubDom() {
  classes = new Set();
  const classList = {
    add: (c) => classes.add(c),
    remove: (c) => classes.delete(c),
    toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
    contains: (c) => classes.has(c),
  };
  const mem = {};
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("document", { documentElement: { classList } });
  vi.stubGlobal("localStorage", {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; },
  });
}

describe("theme mode contract", () => {
  beforeEach(async () => {
    vi.resetModules();
    stubDom();
    const mod = await import("../../src/store/themeStore.js");
    store = mod.default;
    globalThis.__THEME_IDS__ = mod.THEME_IDS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("only knows Dark and Glass", () => {
    expect(globalThis.__THEME_IDS__).toEqual(["glass", "dark"]);
  });

  it("applies dark as plain .dark and glass as .dark.glass", () => {
    const setTheme = store.getState().setTheme;

    setTheme("glass");
    expect(classes.has("dark")).toBe(true);
    expect(classes.has("glass")).toBe(true);

    setTheme("dark");
    expect(classes.has("dark")).toBe(true);
    expect(classes.has("glass")).toBe(false);
  });

  it("degrades an unknown persisted value to the glass default", () => {
    const setTheme = store.getState().setTheme;

    setTheme("light");
    expect(store.getState().theme).toBe("glass");
    expect(classes.has("glass")).toBe(true);
    expect(classes.has("dark")).toBe(true);
  });

  it("toggles between the two modes starting from the glass default", () => {
    const { toggleTheme } = store.getState();

    expect(store.getState().theme).toBe("glass");

    toggleTheme();
    expect(store.getState().theme).toBe("dark");
    expect(classes.has("glass")).toBe(false);

    toggleTheme();
    expect(store.getState().theme).toBe("glass");
    expect(classes.has("glass")).toBe(true);
  });

  it("re-applies the persisted mode on init (page reload path)", () => {
    store.getState().setTheme("glass");

    // Simulate reload: classes wiped, store hydrated from persistence.
    classes.clear();
    store.getState().initTheme();

    expect(classes.has("dark")).toBe(true);
    expect(classes.has("glass")).toBe(true);
  });
});