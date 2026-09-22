#!/usr/bin/env bash
# auto-rollback.sh — jaring pengaman mandiri saat swap 9router.
# Dijalankan DETACHED sebelum kill next-server. Sukses = build baru (v0.5.85)
# benar-benar melayani. Kalau tidak: rollback file + restart; kalau masih gagal,
# start manual sebagai upaya terakhir. Tidak bergantung sesi pemanggil.
set -uo pipefail
CLI=/opt/data/9router/cli
APP=$CLI/app
OLD=$CLI/app.old
BAD=$CLI/app.broken
HEALTH=http://127.0.0.1:20128/api/health
NEWVER=0.5.85
LOG=$CLI/auto-rollback.log

log(){ echo "[$(date +%T)] $*" >> "$LOG"; }
healthy(){ [ "$(curl -sS -m 4 -o /dev/null -w '%{http_code}' "$HEALTH" 2>/dev/null)" = "200" ]; }
served_ver(){ curl -sS -m 4 http://127.0.0.1:20128/api/version 2>/dev/null | sed -n 's/.*"currentVersion":"\([^"]*\)".*/\1/p'; }
new_up(){ [ "$(served_ver)" = "$NEWVER" ] && healthy; }
kill_next(){
  ps -eo pid,args 2>/dev/null | grep -E 'next-server|custom-server\.js' | grep -v grep \
    | awk '{print $1}' | while read -r p; do kill -15 "$p" 2>/dev/null; done
}
manual_start(){
  cd "$APP" || return 1
  HOME=/opt/data/home HERMES_REAL_HOME=/opt/data/home PORT=20128 HOSTNAME=127.0.0.1 NODE_ENV=production \
    nohup node custom-server.js >> "$CLI/manual-start.log" 2>&1 &
}

log "=== auto-rollback mulai; tunggu v$NEWVER melayani ==="
for _ in $(seq 1 50); do new_up && { log "build baru SEHAT (v$NEWVER) — OK"; exit 0; }; sleep 1; done

log "build baru tidak melayani setelah 50s -> ROLLBACK"
if [ -d "$OLD" ]; then
  rm -rf "$BAD" 2>/dev/null
  mv "$APP" "$BAD" 2>/dev/null
  mv "$OLD" "$APP" 2>/dev/null
  log "app.old -> app; paksa restart"
  kill_next
  for _ in $(seq 1 60); do healthy && { log "ROLLBACK OK — build lama jalan lagi"; exit 0; }; sleep 1; done
  log "rollback belum sehat; coba start manual (lama)"
  manual_start
  for _ in $(seq 1 40); do healthy && { log "manual start OK (lama)"; exit 0; }; sleep 1; done
  log "ROLLBACK GAGAL TOTAL — butuh intervensi manual"
else
  log "tidak ada app.old; coba start manual (build sekarang)"
  manual_start
  for _ in $(seq 1 40); do healthy && { log "manual start OK"; exit 0; }; sleep 1; done
  log "GAGAL TOTAL — butuh intervensi manual"
fi
exit 1
