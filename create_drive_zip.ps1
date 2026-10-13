# VaxTrack - Create Google Drive Submission ZIP
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktopDir = [Environment]::GetFolderPath("Desktop")
$zipPath = Join-Path $desktopDir "VaxTrack_Drive_Submission.zip"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  VAXTRACK: Creating Google Drive Submission ZIP" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Source directory: $scriptDir" -ForegroundColor Gray
Write-Host "Destination ZIP:  $zipPath" -ForegroundColor Gray
Write-Host ""

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

$tempDir = Join-Path $env:TEMP ("VaxTrack_Export_" + (Get-Random))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "[1/3] Copying project files (excluding venv & node_modules)..." -ForegroundColor Yellow

# Use robocopy to cleanly skip heavy dependencies
& robocopy $scriptDir $tempDir /E /XD "venv" "node_modules" ".git" "__pycache__" ".vscode" /XF "*.zip" /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null

Write-Host "[2/3] Compressing into lightweight ZIP archive..." -ForegroundColor Yellow
Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "[3/3] Cleaning up temporary staging files..." -ForegroundColor Yellow
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue

if (Test-Path $zipPath) {
    $sizeMB = [math]::Round(((Get-Item $zipPath).Length / 1MB), 2)
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host " SUCCESS! Zip file created on your Desktop: ($sizeMB MB)" -ForegroundColor Green
    Write-Host " File: $zipPath" -ForegroundColor White
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now drag and drop 'VaxTrack_Drive_Submission.zip' into Google Drive!" -ForegroundColor Cyan
} else {
    Write-Host "Error: Failed to create zip file." -ForegroundColor Red
}
