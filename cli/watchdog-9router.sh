#!/usr/bin/env bash
# watchdog-9router.sh — jaring pengaman kedua. Dijalankan detached sebelum swap.
# Kalau setelah grace period 9router TIDAK sehat DAN ada cli/app.old,
# paksa kembalikan app.old + restart. Murni berbasis kesehatan, jadi tetap
# bekerja walau apply-update.sh mati di tengah jalan.
set -uo pipefail
REPO=/opt/data/9router
CLI=$REPO/cli
APP=$CLI/app
APP_OLD=$CLI/app.old
SVC=/run/service/9router
S6SVC=/package/admin/s6/command/s6-svc
LOG=$CLI/watchdog.log
HEALTH=http://127.0.0.1:20128/api/health

log(){ echo "[$(date +%T)] $*" >> "$LOG"; }
healthy(){ [ "$(curl -sS -m 4 -o /dev/null -w '%{http_code}' "$HEALTH" 2>/dev/null)" = "200" ]; }

# tunggu maks 150s: sehat sekali saja -> selesai (apply-update yg urus)
for _ in $(seq 1 150); do healthy && { log "sehat terdeteksi, watchdog keluar"; exit 0; }; sleep 1; done

# 150s tidak sehat
log "TIDAK sehat setelah 150s"
if [ -d "$APP_OLD" ]; then
  log "rollback paksa: app.old -> app"
  rm -rf "$CLI/app.broken" 2>/dev/null
  mv "$APP" "$CLI/app.broken" 2>/dev/null
  mv "$APP_OLD" "$APP" 2>/dev/null
  "$S6SVC" -r "$SVC" >/dev/null 2>&1
  for _ in $(seq 1 90); do healthy && { log "rollback paksa OK"; exit 0; }; sleep 1; done
  log "rollback paksa GAGAL"
else
  log "tidak ada app.old; tidak bisa rollback"
fi
exit 1
