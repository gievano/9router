import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { copyStandaloneAssets } from "../../scripts/copy-standalone-assets.mjs";

function createBuildFixture(distDir) {
  const projectRoot = mkdtempSync(join(tmpdir(), "9router-standalone-assets-"));
  const buildRoot = join(projectRoot, distDir);
  mkdirSync(join(buildRoot, "standalone"), { recursive: true });
  mkdirSync(join(buildRoot, "static", "chunks"), { recursive: true });
  mkdirSync(join(projectRoot, "public"), { recursive: true });
  writeFileSync(join(buildRoot, "static", "chunks", "app.js"), "static asset");
  writeFileSync(join(projectRoot, "public", "favicon.svg"), "public asset");
  return projectRoot;
}

describe("standalone build assets", () => {
  it("copies static and public assets into the default standalone layout", () => {
    const projectRoot = createBuildFixture(".next");

    copyStandaloneAssets({ projectRoot, distDir: ".next" });

    expect(readFileSync(join(projectRoot, ".next", "standalone", ".next", "static", "chunks", "app.js"), "utf8"))
      .toBe("static asset");
    expect(readFileSync(join(projectRoot, ".next", "standalone", "public", "favicon.svg"), "utf8"))
      .toBe("public asset");
  });

  it("uses a custom Next dist directory", () => {
    const projectRoot = createBuildFixture(".next-cli-build");

    copyStandaloneAssets({ projectRoot, distDir: ".next-cli-build" });

    expect(readFileSync(join(projectRoot, ".next-cli-build", "standalone", ".next-cli-build", "static", "chunks", "app.js"), "utf8"))
      .toBe("static asset");
  });

  // Without the wrapper beside server.js nothing can prove a request is local.
  it("copies the request-sanitizing server wrapper into the standalone output", () => {
    const projectRoot = createBuildFixture(".next");
    writeFileSync(join(projectRoot, "custom-server.js"), "wrapper");

    copyStandaloneAssets({ projectRoot, distDir: ".next" });

    expect(readFileSync(join(projectRoot, ".next", "standalone", "custom-server.js"), "utf8"))
      .toBe("wrapper");
  });

  // getGuardModule() resolves the guard by path under the standalone dir; when
  // next build's tracing misses them the standalone server answers 503 "guard
  // unavailable" instead of serving.
  it("stages src/ and scripts/ so the standalone auth guard can load", () => {
    const projectRoot = createBuildFixture(".next");
    mkdirSync(join(projectRoot, "src", "lib", "db", "repos"), { recursive: true });
    mkdirSync(join(projectRoot, "scripts"), { recursive: true });
    writeFileSync(join(projectRoot, "src", "dashboardGuard.js"), "guard");
    writeFileSync(join(projectRoot, "src", "lib", "db", "repos", "securityLogRepo.js"), "repo");
    writeFileSync(join(projectRoot, "scripts", "auth-guard-hooks.mjs"), "hooks");

    copyStandaloneAssets({ projectRoot, distDir: ".next" });

    expect(readFileSync(join(projectRoot, ".next", "standalone", "src", "dashboardGuard.js"), "utf8")).toBe("guard");
    expect(readFileSync(join(projectRoot, ".next", "standalone", "src", "lib", "db", "repos", "securityLogRepo.js"), "utf8")).toBe("repo");
    expect(readFileSync(join(projectRoot, ".next", "standalone", "scripts", "auth-guard-hooks.mjs"), "utf8")).toBe("hooks");
  });

  it("stages open-sse/ so runtime tool defs and executors can load in standalone", () => {
    const projectRoot = createBuildFixture(".next");
    mkdirSync(join(projectRoot, "open-sse", "utils"), { recursive: true });
    writeFileSync(join(projectRoot, "open-sse", "utils", "opencodeV2Defs.json"), '{"read":{}}');

    copyStandaloneAssets({ projectRoot, distDir: ".next" });

    expect(readFileSync(join(projectRoot, ".next", "standalone", "open-sse", "utils", "opencodeV2Defs.json"), "utf8"))
      .toBe('{"read":{}}');
  });

  // Tracing never sees the guard's runtime `import "next/server"`: the guard is
  // copied in after the build, so it is not in the webpack graph. The standalone
  // tree therefore carried a partial next package and every request answered 503
  // "guard unavailable" with ENOENT node_modules/next/server.js.
  it("mirrors the full next package over the traced partial one", () => {
    const projectRoot = createBuildFixture(".next");
    mkdirSync(join(projectRoot, "node_modules", "next"), { recursive: true });
    writeFileSync(join(projectRoot, "node_modules", "next", "server.js"), "full server");
    mkdirSync(join(projectRoot, ".next", "standalone", "node_modules", "next"), { recursive: true });
    writeFileSync(join(projectRoot, ".next", "standalone", "node_modules", "next", "package.json"), "partial");

    copyStandaloneAssets({ projectRoot, distDir: ".next" });

    expect(readFileSync(join(projectRoot, ".next", "standalone", "node_modules", "next", "server.js"), "utf8"))
      .toBe("full server");
    // The mirror replaces the traced directory instead of merging into it.
    expect(() => readFileSync(join(projectRoot, ".next", "standalone", "node_modules", "next", "package.json")))
      .toThrow();
  });

  it("does not modify workspace-traced CLI builds", () => {
    const projectRoot = createBuildFixture(".next-cli-build");
    const previousMode = process.env.NEXT_TRACING_ROOT_MODE;
    process.env.NEXT_TRACING_ROOT_MODE = "workspace";

    try {
      copyStandaloneAssets({ projectRoot, distDir: ".next-cli-build" });
    } finally {
      if (previousMode === undefined) delete process.env.NEXT_TRACING_ROOT_MODE;
      else process.env.NEXT_TRACING_ROOT_MODE = previousMode;
    }

    expect(() => readFileSync(join(projectRoot, ".next-cli-build", "standalone", ".next-cli-build", "static", "chunks", "app.js")))
      .toThrow();
  });
});
