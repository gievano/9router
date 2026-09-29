#!/usr/bin/env bash
# Swap a freshly-built fork app into the live serving dir, with auto-rollback.
# Usage: bash scripts/swap-fork.sh   (run from repo root, after building cli/app-new)
set -u
cd /c/Users/USER/9router-serenhope || exit 1

OLD=cli/app
NEW=cli/app-new
BAK=cli/app.old

ps_stop() {
  powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -match 'custom-server|9router[\\\\/]cli\\.js' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" >/dev/null 2>&1
}
ps_start() {
  powershell.exe -NoProfile -Command "Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList 'C:\Users\USER\9router-serenhope\cli\cli.js','--tray','--skip-update' -WindowStyle Hidden" >/dev/null 2>&1
}
port_free() {
  powershell.exe -NoProfile -Command "\$c = Get-NetTCPConnection -LocalPort 20128 -State Listen -ErrorAction SilentlyContinue; if (-not \$c) { exit 0 } else { exit 1 }" >/dev/null 2>&1
}

echo "[swap] stopping tray launcher + server..."
ps_stop

echo "[swap] waiting for port 20128 to free..."
tries=0
while ! port_free; do
  tries=$((tries+1))
  [ "$tries" -ge 30 ] && { echo "[swap] ERROR: port busy after 30s, aborting"; exit 1; }
  sleep 1
done

echo "[swap] swapping dirs..."
[ -d "$BAK" ] && rm -rf "$BAK"
mv "$OLD" "$BAK" && mv "$NEW" "$OLD"

echo "[swap] starting fork CLI (tray)..."
ps_start

echo "[swap] polling /api/version..."
tries=0
while :; do
  rev=$(curl -s -m 5 http://127.0.0.1:20128/api/version 2>/dev/null | sed -n 's/.*"currentRevision":"\([^"]*\)".*/\1/p')
  [ -n "$rev" ] && { echo "[swap] SUCCESS: revision=$rev"; exit 0; }
  tries=$((tries+1))
  if [ "$tries" -ge 100 ]; then
    echo "[swap] FAILED: no answer in 100s, rolling back..."
    ps_stop; sleep 3
    rm -rf "$OLD"; mv "$BAK" "$OLD"
    ps_start
    echo "[swap] rolled back to old build."
    exit 1
  fi
  sleep 1
done
