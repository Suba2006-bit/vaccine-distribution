@echo off
title VaxTrack - Create Google Drive Submission ZIP
color 0b

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create_drive_zip.ps1"

pause
