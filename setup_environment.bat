@echo off
title VaxTrack - One-Time Environment Setup
color 0a

echo =====================================================================
echo    VAXTRACK: One-Time Setup for New Computers
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Creating Python Virtual Environment (venv)...
if not exist "venv" (
    python -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo Failed to create venv with 'python'. Trying 'py -3'...
        py -3 -m venv venv
    )
) else (
    echo Virtual environment already exists.
)

echo.
echo [2/3] Installing Python Dependencies from requirements.txt...
"%~dp0venv\Scripts\python.exe" -m pip install --upgrade pip
"%~dp0venv\Scripts\python.exe" -m pip install -r requirements.txt

echo.
echo [3/3] Installing Frontend Dependencies (npm install)...
cd /d "%~dp0frontend"
call npm.cmd install

cd /d "%~dp0"

echo.
echo =====================================================================
echo    SETUP COMPLETE!
echo    You can now run the project anytime by double-clicking:
echo    - run_project.bat       (Standard Launcher)
echo    - start_background.vbs  (Silent Background Launcher)
echo =====================================================================
echo.
pause
