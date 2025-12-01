# Verify .env.local file encoding
$envFile = ".env.local"
$bytes = [System.IO.File]::ReadAllBytes($envFile)

Write-Host "File size: $($bytes.Length) bytes"
Write-Host ""

# Check for null bytes (UTF-16 indicator)
$nullBytes = ($bytes | Where-Object { $_ -eq 0x00 }).Count
if ($nullBytes -gt 0) {
    Write-Host "WARNING: Found $nullBytes null bytes - file may have UTF-16 encoding issues" -ForegroundColor Red
} else {
    Write-Host "OK: No null bytes found - file appears to be UTF-8" -ForegroundColor Green
}

# Check for BOM
if ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    Write-Host "INFO: File has UTF-8 BOM" -ForegroundColor Yellow
} else {
    Write-Host "OK: File has no BOM (UTF-8 without BOM)" -ForegroundColor Green
}

# Show content
Write-Host ""
Write-Host "File contents:"
Write-Host "=============="
Get-Content $envFile -Encoding UTF8

