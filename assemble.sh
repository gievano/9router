#!/bin/bash
# Assemble the Next.js standalone bundle for the systemd unit.
# The unit runs: node custom-server.js from .next/standalone, so every file the
# server needs at runtime that `next build` does not copy must be placed here.
#
#  - .next/static and public/: build output, NOT included in the standalone tree
#    by default. Without them every page renders its shell stuck at "Loading..."
#    because the hashed client chunks and the public/ assets answer 404.
#
# Why the source tree is copied wholesale: custom-server.js imports server
# modules by absolute path under its own __dirname (dashboardGuard, the auth
# guard hooks, telegramBackup, backgroundTokenRefresh, securityLogRepo,
# dashboardSession). `next build` only traces the subset of src/ that reached
# the webpack graph, so those files were missing and AuthGuard answered 503
# with "guard unavailable". A superset of src/ is what the unit expects.
set -e
cd /root/9router

if [ ! -f .next/standalone/server.js ]; then
  echo "assemble: .next/standalone/server.js missing - run 'npx next build' first" >&2
  exit 1
fi

# server-side source tree + launch hooks the custom server imports by path
rm -rf .next/standalone/src .next/standalone/scripts
cp -a src        .next/standalone/src
cp -a scripts    .next/standalone/scripts

# client bundle + static assets served by the standalone server
mkdir -p .next/standalone/.next .next/standalone/public
rm -rf .next/standalone/.next/static
cp -a .next/static .next/standalone/.next/static
cp -a public/.     .next/standalone/public/

# files the unit reads from its working directory
cp -a custom-server.js .next/standalone/custom-server.js
cp -a CHANGELOG.md     .next/standalone/CHANGELOG.md
cp -a package.json     .next/standalone/package.json

# next ships its own copy of some runtime deps; the standalone bundle resolves
# `next` from its own node_modules, so mirror the built tree over it.
rm -rf .next/standalone/node_modules/next
cp -a node_modules/next .next/standalone/node_modules/next

echo "assemble: ok"
