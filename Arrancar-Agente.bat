@echo off
title MyPodcast Desktop Sync Agent
echo ===================================================
echo   Arrancando el agente de sincronizacion de MyPodcast
echo ===================================================
echo.
cd /d "%~dp0"
echo Sincronizando y compilando cambios del agente...
call npx nx build desktop-sync
echo.
echo Iniciando aplicacion de escritorio nativa...
start /b npx electron dist/apps/desktop-sync/main.js
exit
