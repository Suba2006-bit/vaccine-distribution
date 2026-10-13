@echo off
title VaxTrack - Vaccine Distribution & Thermal Tracking Hub Launcher
color 0b

echo =====================================================================
echo    VAXTRACK: Vaccine Distribution Inventory & Thermal Tracking Hub
echo          CSE College Project (Software-Only Simulation)
echo =====================================================================
echo.

cd /d "%~dp0"

REM Find the virtual environment Python interpreter
set "PY_CMD=python"
if exist "%~dp0venv\Scripts\python.exe" (
    set "PY_CMD=%~dp0venv\Scripts\python.exe"
)

echo [1/3] Checking Backend API Server on port 5000...
netstat -ano | findstr ":5000" | findstr "LISTENING" >nul
if %ERRORLEVEL% equ 0 (
    echo       Backend is ALREADY running on http://127.0.0.1:5000
) else (
    echo       Starting Backend API Server in a new window...
    start "VaxTrack Backend API (DO NOT CLOSE)" cmd /k "cd /d "%~dp0" && color 0a && echo =================================================== && echo   VAXTRACK BACKEND SERVER RUNNING ON PORT 5000     && echo   KEEP THIS WINDOW OPEN WHILE USING THE APPLICATION!&& echo =================================================== && "%PY_CMD%" -m backend.app.main"
    timeout /t 3 /nobreak >nul
)

echo.
echo [2/3] Checking Frontend Dev Server on port 5173...
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul
if %ERRORLEVEL% equ 0 (
    echo       Frontend is ALREADY running on http://localhost:5173
) else (
    echo       Starting Frontend Web Interface in a new window...
    start "VaxTrack Frontend UI (DO NOT CLOSE)" cmd /k "cd /d "%~dp0frontend" && color 09 && echo =================================================== && echo   VAXTRACK FRONTEND UI RUNNING ON PORT 5173       && echo   KEEP THIS WINDOW OPEN WHILE USING THE APPLICATION!&& echo =================================================== && npm.cmd run dev"
    timeout /t 4 /nobreak >nul
)

echo.
echo [3/3] Launching Web Browser...
start http://localhost:5173

echo.
echo =====================================================================
echo    STATUS: Both servers are running!
echo.
echo    *** IMPORTANT INSTRUCTION FOR VIVA / USAGE ***
echo    Please DO NOT close the two background black command windows!
echo    Closing them will stop the Python backend and cause login errors.
echo    You can minimize them to your taskbar while using the website.
echo.
echo    - Frontend UI : http://localhost:5173
echo    - Backend API : http://127.0.0.1:5000/api/health
echo.
echo    DEMO ACCOUNTS (Clickable with 1-Click buttons on login):
echo    1. Hospital     : hospital@citycare.org     /  hospital123
echo    2. Clinic       : clinic@greenvalley.org    /  clinic123
echo    3. Manufacturer : manufacturer@serumlab.com /  admin123
echo =====================================================================
echo.
pause
