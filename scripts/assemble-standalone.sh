#!/usr/bin/env bash
# Standalone assembly for 9router, after any build.
#
# Why this exists: next build's trace output only contains files it could prove
# are needed. Three of them are loaded by path at RUNTIME, so the trace never sees
# them and they are absent from .next/standalone:
#
#   scripts/auth-guard-hooks.mjs   <- path.join(__dirname, "scripts", ...)
#   src/dashboardGuard.js          <- path.join(__dirname, "src", ...)
#   open-sse/**                    <- imported by name inside the trace,
#                                     but only a subset gets bundled
#
# Without scripts/auth-guard-hooks.mjs, getGuardModule() returns null and
# custom-server.js answers EVERY route with
# 503 {"error":"Authorization check unavailable"} - which is exactly what a bare
# build produces.
#
# Rule learned the hard way: never `cp -a node_modules` into the standalone tree.
# It replaces the build's own node_modules and drops server.js, which breaks the
# same guard in a different way. node_modules is already assembled by next build;
# only the runtime-loaded top-level files need to be added.
set -euo pipefail
cd /root/9router
S=.next/standalone

echo "[assembly] verifying build output"
[ -f "$S/server.js" ] || { echo "FATAL: $S/server.js missing - build first"; exit 1; }

echo "[assembly] runtime-loaded files"
for d in scripts src open-sse; do
  if [ -d "$d" ]; then
    cp -a "$d" "$S/"
    echo "[assembly]   copied $d/"
  fi
done

# Next traces dashboardGuard.js only if some statically-analyzable import reaches
# it; the guard loader builds its path with path.join, so that import never
# exists. Copy it explicitly.
if [ -f src/dashboardGuard.js ]; then
  cp -a src/dashboardGuard.js "$S/src/dashboardGuard.js"
  echo "[assembly]   copied src/dashboardGuard.js"
fi

# `next/server` must exist: the guard loader does require("node:module").register
# and then imports dashboardGuard.js, which imports next/server.
if [ ! -f "$S/node_modules/next/server.js" ]; then
  echo "[assembly]   restoring node_modules/next/server.js"
  rm -rf "$S/node_modules/next"
  cp -a node_modules/next "$S/node_modules/next"
fi

echo "[assembly] preflight"
for f in scripts/auth-guard-hooks.mjs src/dashboardGuard.js custom-server.js \
         node_modules/next/server.js; do
  if [ -e "$S/$f" ]; then
    echo "[assembly]   OK   $f"
  else
    echo "[assembly]   FAIL $f"; exit 1
  fi
done

echo "[assembly] restarting"
systemctl restart 9router
sleep 4
systemctl is-active 9router