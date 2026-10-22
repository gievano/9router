// Clearing a notification retires a resolved condition and marks the row read, so the
// badge goes quiet. When the same condition returns — a key slides back under its cap and
// then over it again, a task fails twice — the row must light up again instead of sitting
// in the feed greyed out and uncounted. This drives the real SQLite adapter because the
// revival happens inside the UPDATE statement.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-notif-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  vi.resetModules();
});

afterEach(() => {
  try {
    global._dbAdapter?.instance?.close?.();
  } catch {}
  delete global._dbAdapter;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

const quota = (over = {}) => ({
  kind: "quota",
  severity: "warning",
  title: 'Key "budget-demo" is at 92% of its daily budget',
  body: "$2.30 of $2.50 spend used. Resets at 00:00 UTC.",
  link: "/dashboard/endpoint",
  dedupeKey: "quota:k1:cost:warning",
  ...over,
});

describe("a cleared notification comes back armed", () => {
  it("re-arms the badge when the same condition returns", async () => {
    const { notify, clearNotificationByKind, listNotifications } = await import(
      "@/lib/db/repos/notificationsRepo.js"
    );

    await notify(quota());
    let feed = await listNotifications();
    expect(feed.unread).toBe(1);
    expect(feed.notifications[0].cleared).toBe(false);

    await clearNotificationByKind("quota", "quota:k1:cost:warning");
    feed = await listNotifications();
    expect(feed.unread).toBe(0);
    expect(feed.notifications[0].cleared).toBe(true);

    // Spend climbs again: same dedupe key, refreshed wording.
    await notify(quota({ severity: "error", title: 'Key "budget-demo" is out of its daily budget' }));
    feed = await listNotifications();
    expect(feed.unread).toBe(1);
    expect(feed.notifications[0].cleared).toBe(false);
    expect(feed.notifications[0].read).toBe(false);
    expect(feed.notifications[0].title).toMatch(/out of its daily budget/);
    // Refreshing updates the existing row instead of stacking a second one.
    expect(feed.notifications).toHaveLength(1);
  });

  it("keeps a row the operator already read as read while it stays live", async () => {
    const { notify, markRead, listNotifications } = await import("@/lib/db/repos/notificationsRepo.js");

    await notify(quota());
    await markRead("all");
    // Still the same live condition, only the figure moved.
    await notify(quota({ title: 'Key "budget-demo" is at 96% of its daily budget' }));
    const feed = await listNotifications();
    expect(feed.unread).toBe(0);
    expect(feed.notifications[0].read).toBe(true);
    expect(feed.notifications[0].cleared).toBe(false);
  });
});
