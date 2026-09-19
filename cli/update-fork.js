#!/usr/bin/env node
// Fork updater: git pull (gievano fork) -> build to a side dir -> swap ->
// relaunch. Runs AFTER the app server has exited (updater waits for the port),
// so the build never hits the EPERM file-lock. Exits 0 on success, 1 on
// failure (the outer updater retries, then relaunches the app either way).
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const REPO = "C:\\Users\\USER\\9router-serenhope";
const APP = path.join(REPO, "cli", "app");
const APP_NEW = path.join(REPO, "cli", "app-new");
const APP_OLD = path.join(REPO, "cli", "app.old");
const PORT = 20128;
const DATA_DIR = process.env.DATA_DIR || path.join(process.env.APPDATA || "", "9router");

const log = (m) => console.log(`[fork-updater] ${m}`);
const sh = (cmd, opts = {}) => execSync(cmd, { cwd: REPO, stdio: "pipe", encoding: "utf8", timeout: 600000, ...opts });

function portBusy() {
  try {
    const out = sh(`powershell -NoProfile -Command "(Test-NetConnection -ComputerName 127.0.0.1 -Port ${PORT} -WarningAction SilentlyContinue).TcpTestSucceeded"`, { timeout: 15000 });
    return out.trim().endsWith("True");
  } catch { return false; }
}

try {
  log("pulling fork master...");
  const before = sh("git rev-parse --short HEAD").trim();
  sh("git pull jestic master --ff-only");
  const after = sh("git rev-parse --short HEAD").trim();
  if (before === after) {
    log(`already up to date (${after}) — nothing to build`);
    process.exit(0);
  }
  log(`updated ${before} -> ${after}, building...`);

  deleteFolderRecursive(APP_NEW);
  sh("npm run build", { cwd: path.join(REPO, "cli"), env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=6144", NINEROUTER_CLI_APP_DIR: APP_NEW } });
  const buildId = fs.readFileSync(path.join(APP_NEW, ".next-cli-build", "BUILD_ID"), "utf8").trim();
  log(`build ok (BUILD_ID ${buildId})`);

  if (portBusy()) throw new Error(`port ${PORT} still busy — aborting swap`);

  if (fs.existsSync(APP_OLD)) deleteFolderRecursive(APP_OLD);
  fs.renameSync(APP, APP_OLD);
  try {
    fs.renameSync(APP_NEW, APP);
  } catch (e) {
    fs.renameSync(APP_OLD, APP); // roll the rename back, keep the old build live
    throw e;
  }
  log("swap done; relaunch is the outer updater's job (tray VBS)");
  process.exit(0);
} catch (e) {
  log(`FAILED: ${e.message}`);
  try { console.log(String(e.stderr || "")); } catch { /* ignore */ }
  // The old build is untouched (build-then-swap), so on failure just bring the
  // app back up — otherwise a failed update leaves 9Router down until reboot.
  if (!portBusy()) {
    const vbs = path.join(process.env.APPDATA || "", "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "9router.vbs");
    if (fs.existsSync(vbs)) {
      spawn("wscript.exe", [vbs], { detached: true, stdio: "ignore", windowsHide: true, cwd: REPO }).unref();
      log("relaunching old build via tray VBS");
    }
  }
  process.exit(1);
}

function deleteFolderRecursive(p) {
  fs.rmSync(p, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
}
