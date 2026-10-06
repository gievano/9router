"use client";

import { useState } from "react";
import LongTaskBanner from "./LongTaskBanner";
import { useTaskStore } from "@/store/taskStore";

/**
 * Renders every running long task above the dashboard, mounted once in the
 * dashboard layout so navigation never unmounts it.
 *
 * The newest task starts in the foreground; anything the operator has collapsed
 * (and the older tasks behind it) renders as a corner chip. Each banner owns its
 * own collapsed state, so backgrounding one is local and survives an update to
 * the task, and the tasks keep reporting progress while the operator navigates.
 */
export default function TaskDock() {
  const tasks = useTaskStore((s) => s.tasks);
  if (!tasks.length) return null;

  const [first, ...rest] = tasks;
  return (
    <>
      <DockBanner key={first.id} task={first} startForeground />
      <div className="pointer-events-none fixed bottom-20 right-4 sm:bottom-6 z-[65] flex w-[min(86vw,320px)] flex-col gap-2">
        {rest.map((task) => (
          <DockBanner key={task.id} task={task} startForeground={false} />
        ))}
      </div>
    </>
  );
}

/**
 * One task = one banner. The first task takes the full-screen banner (it can
 * background into the corner); everything behind it skips straight to the chip.
 * Chips render position-free inside the dock stack, so five imports queue as
 * five cards in one column, not five fixed overlays.
 */
function DockBanner({ task, startForeground }) {
  const [backgrounded, setBackgrounded] = useState(!startForeground);

  return (
    <LongTaskBanner
      fixed={startForeground && !backgrounded}
      inlineChip={!startForeground}
      title={task.title}
      message={task.message}
      section={task.section}
      progress={task.progress ?? null}
      chipOnly={startForeground ? backgrounded : true}
      onCancel={() => useTaskStore.getState().cancel(task.id)}
      onBackground={() => setBackgrounded(true)}
      onExpand={() => setBackgrounded(false)}
      canExpand
    />
  );
}