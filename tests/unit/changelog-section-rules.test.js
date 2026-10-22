import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const modal = readFileSync(resolve(root, "src/shared/components/ChangelogModal.js"), "utf8");
const changelog = readFileSync(resolve(root, "CHANGELOG.md"), "utf8");

// Sliced rather than imported: the modal is JSX behind an alias chain, so pulling a
// plain function out of the source keeps this an ordinary unit test.
const slice = modal.slice(
  modal.indexOf("function stripSectionRules"),
  modal.indexOf("// Split markdown into per-version sections")
);
const stripSectionRules = new Function(slice + "\nreturn stripSectionRules;")();

describe("changelog: version bodies carry no separator rule", () => {
  it("drops the rule that closes a version", () => {
    const body = "## What Was Added\n\n- a thing\n\n---\n";
    expect(stripSectionRules(body)).toBe("## What Was Added\n\n- a thing");
  });

  it("drops a bare rule wherever it sits", () => {
    expect(stripSectionRules("## What Was Added\n\n---\n\n- a\n")).toBe("## What Was Added\n\n- a");
    expect(stripSectionRules("---\n\n## What Was Fixed\n\n- a\n")).toBe("## What Was Fixed\n\n- a");
  });

  it("keeps a rule that is part of fenced code", () => {
    const body = "## What Was Added\n\n```md\n---\ntitle: x\n---\n```\n\n---\n";
    expect(stripSectionRules(body)).toBe("## What Was Added\n\n```md\n---\ntitle: x\n---\n```");
  });

  it("is what the splitter applies to every section", () => {
    expect(modal).toMatch(/sections\.push\(\{ \.\.\.cur, body: stripSectionRules\(cur\.body\) \}\)/);
  });

  it("leaves no rule in any real version body", () => {
    // Same boundary rule as splitVersions: an h1/h2 heading that starts with a digit.
    const bodies = [];
    let current = null;
    for (const line of changelog.split("\n")) {
      if (/^ {0,3}#{1,2}\s+v?\d/.test(line)) {
        if (current) bodies.push(current);
        current = "";
      } else if (current !== null) {
        current += line + "\n";
      }
    }
    if (current !== null) bodies.push(current);

    expect(bodies.length).toBeGreaterThan(10);
    expect(bodies.some((b) => /^\s*-{3,}\s*$/m.test(b))).toBe(true);
    expect(bodies.map(stripSectionRules).filter((b) => /^\s*-{3,}\s*$/m.test(b))).toEqual([]);
  });
});
