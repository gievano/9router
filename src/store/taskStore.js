"use client";

import { create } from "zustand";

/** How long a finished run stays announced before the store drops it. */
export const DONE_TTL_MS = 30000;

/**
 * Long operations that outlive the page that started them.
 *
 * A 10 000-proxy import runs as a client-side loop of POSTs; the page component
 * that drives it unmounts when the operator navigates, and with it went the
 * banner - the loop kept running invisibly with nowhere to report progress.
 * Moving the operation's progress into this store lets a banner mounted in the
 * dashboard layout keep reporting it, keep offering cancel, and stay collapsed
 * in a corner while the operator works somewhere else.
 *
 * A task carries its own `onCancel` (an AbortController.abort wired by the
 * caller), so cancelling from anywhere aborts the real request loop.
 */
export const useTaskStore = create((set, get) => ({
  /** [{ id, title, message, section, progress, state, onCancel }] */
  tasks: [],

  start(task) {
    set((s) => ({ tasks: [...s.tasks.filter((t) => t.id !== task.id), task] }));
  },

  update(id, patch) {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },

  /**
   * Park a task as done rather than deleting it.
   *
   * Dropping the row the moment the work ended meant the bell went empty and the
   * operator never learned the import actually landed. The row stays, marked
   * `done` with the time it finished, and the bell retires it on its own (see
   * NotifToast's DONE_TTL_MS) - so a finished run is announced, not silently
   * swallowed, and does not pile up either.
   */
  finish(id) {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id && t.state !== "done"
          ? { ...t, state: "done", progress: 100, finishedAt: Date.now() }
          : t
      ),
    }));
    // The bell must not have to poll to notice a finish: the row retires
    // itself. Guarded by state so a run restarted inside the window is left
    // running rather than cancelled by the previous run's timer.
    const timer = setTimeout(() => {
      const st = get();
      const task = st.tasks.find((t) => t.id === id);
      if (task && task.state === "done") st.dismiss(id);
    }, DONE_TTL_MS);
    if (typeof timer.unref === "function") timer.unref();
  },

  /** Retire a row outright: its own timer fired, or the operator cleared it. */
  dismiss(id) {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  /** Fire a task's own cancel hook; the caller's finally{} removes it. */
  cancel(id) {
    const task = get().tasks.find((t) => t.id === id);
    task?.onCancel?.();
  },
}));

export default useTaskStore;