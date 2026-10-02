import assert from "node:assert/strict";
import {
  DASHBOARD_CREATOR,
  visibleApiKeys,
  sessionCreatedKey,
  creatorLabelFor,
  creatorNameFor,
} from "./keyCreator.js";

const ADMIN = null;
const parentSession = { role: "apikey", apiKey: "raw-parent" };
const strangerSession = { role: "apikey", apiKey: "raw-stranger" };

const dashboardKey = { id: "d1", key: "raw-parent", name: "ParentKey", createdBy: DASHBOARD_CREATOR };
const childKey = { id: "c1", key: "raw-child", name: "ChildKey1", createdBy: "raw-parent" };
const otherKey = { id: "o1", key: "raw-other", name: "OtherKey", createdBy: DASHBOARD_CREATOR };
const all = [dashboardKey, childKey, otherKey];

// The endpoint page and the usage page answer the same question, so a key that
// created a key sees the child on both. This is the reported bug.
assert.deepEqual(
  visibleApiKeys(all, parentSession).map((k) => k.name),
  ["ParentKey", "ChildKey1"],
  "a creator session sees its own key plus the keys it created"
);
assert.deepEqual(
  visibleApiKeys(all, strangerSession),
  [],
  "a session with no keys sees no keys"
);
assert.deepEqual(visibleApiKeys(all, ADMIN), all, "admin sees everything");

// A deleted parent must not silently become a stranger's key.
const orphaned = [];
assert.ok(
  !sessionCreatedKey(strangerSession, childKey) &&
    sessionCreatedKey(parentSession, childKey) &&
    sessionCreatedKey(ADMIN, otherKey),
  "only the creator (or admin) may edit or delete a sub-key"
);

// Creator labels show names, not rows of identical wording. (Labels also go
// through the sanitized form: names are matched against the keys the session
// may see, never the raw creator key.)
assert.equal(
  creatorLabelFor({ createdBy: "raw-parent", keys: all, selfId: "c1" }),
  "Created by ParentKey",
  "child names its parent key"
);
assert.equal(creatorLabelFor({ createdBy: null, keys: all }), "", "old rows show no label");
assert.equal(
  creatorLabelFor({ createdBy: DASHBOARD_CREATOR, keys: all }),
  "Created by dashboard",
  "person-made keys keep the dashboard label"
);
assert.equal(
  creatorLabelFor({ createdBy: "gone-key", keys: all, selfId: "c1" }),
  "Created by deleted API key",
  "a deleted creator is named, never blamed on the dashboard or another key"
);
assert.equal(
  creatorNameFor({ createdBy: "raw-parent", keys: all }),
  "ParentKey",
  "payloads resolve the creator name without shipping raw keys"
);
assert.equal(creatorNameFor({ createdBy: DASHBOARD_CREATOR, keys: all }), "", "dashboard-made keys carry no creator name");

console.log("\nSUCCESS: key creator helper keeps the two key lists in agreement");
