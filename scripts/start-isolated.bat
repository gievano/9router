@echo off
setlocal
cd /d "%~dp0\.."

set PORT=30128
set DATA_DIR=%CD%\.test-data
set NEXT_DIST_DIR=.next-test
set NODE_ENV=development

echo =======================================================
echo   9Router (Isolated Dev Instance)
echo =======================================================
echo   Port:      http://127.0.0.1:%PORT%
echo   Dashboard: http://127.0.0.1:%PORT%/dashboard/prompt-injection
echo   Data Dir:  %DATA_DIR%
echo   Original:  Port 20128 (Safe ^& Untouched)
echo =======================================================

npx next dev --port %PORT% --hostname 127.0.0.1
