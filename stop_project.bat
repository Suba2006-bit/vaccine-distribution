@echo off
title VaxTrack - Stop All Project Services
color 0c

echo =====================================================================
echo    VAXTRACK: Stopping Backend and Frontend Servers...
echo =====================================================================
echo.

REM Kill process listening on port 5000 (Backend Flask)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    echo Stopping Backend process (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

REM Kill process listening on port 5173 (Frontend Vite)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo Stopping Frontend process (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo All VaxTrack services have been stopped.
echo You can restart them anytime using run_project.bat or start_background.vbs.
echo =====================================================================
echo.
pause
