# Fix .env.local file encoding - remove UTF-16 entries and ensure UTF-8
$envFile = ".env.local"
$backupFile = ".env.local.backup"

# Create backup
Copy-Item $envFile $backupFile -Force

# Read file as text, handling mixed encoding
$lines = @()
$reader = [System.IO.StreamReader]::new($envFile, [System.Text.Encoding]::UTF8, $true)

while ($null -ne ($line = $reader.ReadLine())) {
    # Skip lines that look like they're UTF-16 encoded (have null bytes or weird encoding)
    if ($line -match '^[^\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]+$' -or $line -match '^[A-Z_]+=') {
        # Only keep valid UTF-8 lines that don't have the problematic GEMINI key
        if (-not ($line -match '^GEMINI_API_KEY=')) {
            $lines += $line
        }
    }
}
$reader.Close()

# Add GEMINI_API_KEY in proper UTF-8
$lines += "GEMINI_API_KEY=AIzaSyDdegu6UAaCcH7qUB-Bm15gzhtEB6DstZ0"

# Write back as UTF-8 without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines((Resolve-Path $envFile), $lines, $utf8NoBom)

Write-Host "Fixed .env.local encoding - converted to UTF-8 without BOM"
Write-Host "Backup saved as: $backupFile"

