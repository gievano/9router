#!/usr/bin/env bash
# apply-update.sh — build-then-swap untuk cli/app 9router.
# Dijalankan DETACHED (setsid nohup) supaya tetap hidup walau sesi pemanggil mati.
# Alur: swap cli/app -> app.old ; cli/app-new -> cli/app ; restart s6 ; verifikasi ;
# kalau gagal -> ROLLBACK otomatis ke app.old dan restart lagi.
set -uo pipefail

REPO=/opt/data/9router
CLI=$REPO/cli
APP=$CLI/app
APP_NEW=$CLI/app-new
APP_OLD=$CLI/app.old
APP_BAD=$CLI/app.broken
SVC=/run/service/9router
S6SVC=/package/admin/s6/command/s6-svc
LOG=$CLI/apply-update.log
HEALTH=http://127.0.0.1:20128/api/health
PORT=20128

log(){ echo "[$(date +%T)] $*" | tee -a "$LOG"; }

healthy(){ [ "$(curl -sS -m 4 -o /dev/null -w '%{http_code}' "$HEALTH" 2>/dev/null)" = "200" ]; }

wait_healthy(){ # $1 = max seconds
  for _ in $(seq 1 "$1"); do healthy && return 0; sleep 1; done; return 1
}

restart_svc(){ "$S6SVC" -r "$SVC" >/dev/null 2>&1; }

log "=== apply-update mulai ==="
log "port busy sebelum swap: $( (echo >/dev/tcp/127.0.0.1/$PORT) >/dev/null 2>&1 && echo yes || echo no )"

[ -d "$APP_NEW" ] || { log "FATAL: $APP_NEW tidak ada (build gagal?)"; exit 2; }
[ -f "$APP_NEW/custom-server.js" ] || { log "FATAL: custom-server.js tidak ada di build baru"; exit 2; }
log "build baru ada. BUILD_ID=$(cat "$APP_NEW/.next-cli-build/BUILD_ID" 2>/dev/null)"

# --- backup build lama ---
rm -rf "$APP_OLD" 2>/dev/null
if ! mv "$APP" "$APP_OLD"; then log "FATAL: gagal pindah cli/app -> app.old"; exit 2; fi
log "cli/app -> app.old OK"

# --- pasang build baru ---
if ! mv "$APP_NEW" "$APP"; then
  log "gagal pasang build baru; kembalikan yang lama"
  mv "$APP_OLD" "$APP"; restart_svc; wait_healthy 60 && log "rollback OK (lama sehat)" || log "rollback GAGAL — perlu intervensi"
  exit 2
fi
log "build baru dipasang"

# --- restart + verifikasi ---
restart_svc
log "restart dikirim, tunggu sehat (maks 90s)..."
if wait_healthy 90; then
  log "SUKSES: dashboard sehat di $HEALTH"
  log "versi sekarang: $(grep -m1 '"version"' "$APP/package.json" 2>/dev/null)"
  log "=== apply-update selesai (OK) ==="
  exit 0
fi

# --- ROLLBACK ---
log "GAGAL sehat setelah 90s -> ROLLBACK"
mv "$APP" "$APP_BAD"
mv "$APP_OLD" "$APP"
restart_svc
if wait_healthy 90; then
  log "ROLLBACK OK: build lama jalan lagi. Build baru disimpan di $APP_BAD"
  log "=== apply-update selesai (ROLLED BACK) ==="
  exit 3
else
  log "ROLLBACK GAGAL — 9router tetap tidak sehat. Butuh intervensi manual."
  log "=== apply-update selesai (BROKEN) ==="
  exit 4
fi
