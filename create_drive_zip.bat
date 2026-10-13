@echo off
title VaxTrack - Create Google Drive Submission ZIP
color 0b

echo =====================================================================
echo    VAXTRACK: Creating Clean Google Drive Submission ZIP Package
echo =====================================================================
echo.
echo Please wait... Preparing files (excluding heavy node_modules and venv)...
echo.

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command "& {
    $sourceDir = '%~dp0';
    $zipPath = Join-Path (Split-Path $sourceDir -Parent) 'VaxTrack_Drive_Submission.zip';
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force };
    
    $tempDir = Join-Path $env:TEMP ('VaxTrack_Export_' + (Get-Random));
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null;

    Write-Host 'Copying source files to export directory...' -ForegroundColor Cyan;
    
    # Robocopy cleanly excludes venv and node_modules
    robocopy $sourceDir $tempDir /E /XD venv node_modules .git __pycache__ .vscode /XF *.zip /NFL /NDL /NJH /NJS /nc /ns /np;

    Write-Host 'Compressing into VaxTrack_Drive_Submission.zip...' -ForegroundColor Cyan;
    Compress-Archive -Path (Join-Path $tempDir '*') -DestinationPath $zipPath -CompressionLevel Optimal;

    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue;

    $sizeMB = [math]::Round(((Get-Item $zipPath).Length / 1MB), 2);
    Write-Host '';
    Write-Host ('SUCCESS: Archive created successfully (' + $sizeMB + ' MB)!') -ForegroundColor Green;
    Write-Host ('Saved to: ' + $zipPath) -ForegroundColor Yellow;
}"

echo.
echo =====================================================================
echo    READY FOR GOOGLE DRIVE UPLOAD!
echo    Look on your Desktop for: VaxTrack_Drive_Submission.zip
echo =====================================================================
echo.
pause
