/**
 * The UI supports two themes: neobrutalism (default) and dark.
 * The saved theme is applied before paint and remains active after hydration;
 * unknown theme IDs fall back to neobrutalism.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

let classes;
let store;

function stubDom() {
  classes = new Set();
  const classList = {
    add: (...cs) => cs.forEach((c) => classes.add(c)),
    remove: (...cs) => cs.forEach((c) => classes.delete(c)),
    toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
    contains: (c) => classes.has(c),
    has: (c) => classes.has(c),
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
    globalThis.__applyTheme__ = mod.applyTheme;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("knows neobrutalism and dark as the available theme IDs", () => {
    expect(globalThis.__THEME_IDS__).toEqual(["neobrutalism", "dark"]);
  });

  it("applies neobrutalism and removes the former dark/glass markers", () => {
    classes.add("dark", "glass", "brutalist");
    globalThis.__applyTheme__();
    expect(classes.has("neobrutalism")).toBe(true);
    expect(classes.has("dark")).toBe(false);
    expect(classes.has("brutalist")).toBe(false);
    expect(classes.has("glass")).toBe(false);
  });

  it("applies the requested theme on setTheme and falls back for unknown IDs", async () => {
    const setTheme = store.getState().setTheme;

    await setTheme("dark");
    expect(store.getState().theme).toBe("dark");
    expect(classes.has("dark")).toBe(true);
    expect(classes.has("neobrutalism")).toBe(false);
    expect(classes.has("glass")).toBe(false);

    await setTheme("light");
    expect(store.getState().theme).toBe("neobrutalism");
    expect(classes.has("neobrutalism")).toBe(true);
    expect(classes.has("dark")).toBe(false);

    await setTheme("glass");
    expect(store.getState().theme).toBe("neobrutalism");
    expect(classes.has("neobrutalism")).toBe(true);
  });

  it("toggleTheme switches between neobrutalism and dark", () => {
    const { toggleTheme } = store.getState();

    expect(store.getState().theme).toBe("neobrutalism");

    expect(toggleTheme()).toBe("dark");
    expect(store.getState().theme).toBe("dark");
    expect(classes.has("dark")).toBe(true);
    expect(classes.has("neobrutalism")).toBe(false);
    expect(classes.has("glass")).toBe(false);

    expect(toggleTheme()).toBe("neobrutalism");
    expect(store.getState().theme).toBe("neobrutalism");
    expect(classes.has("neobrutalism")).toBe(true);
    expect(classes.has("dark")).toBe(false);
  });

  it("setServerTheme applies the given theme", () => {
    classes.clear();
    store.getState().setServerTheme("dark");

    expect(store.getState().theme).toBe("dark");
    expect(classes.has("dark")).toBe(true);
    expect(classes.has("neobrutalism")).toBe(false);
    expect(classes.has("glass")).toBe(false);
  });

  it("hydrateTheme restores the saved theme, defaulting to neobrutalism", () => {
    const { hydrateTheme } = store.getState();

    expect(hydrateTheme()).toBe("neobrutalism");
    expect(store.getState().theme).toBe("neobrutalism");
    expect(classes.has("neobrutalism")).toBe(true);

    globalThis.localStorage.setItem("9router-theme", "dark");
    expect(hydrateTheme()).toBe("dark");
    expect(store.getState().theme).toBe("dark");
    expect(classes.has("dark")).toBe(true);
    expect(classes.has("neobrutalism")).toBe(false);
  });
});
