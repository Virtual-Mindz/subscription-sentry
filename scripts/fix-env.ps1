# Fix .env.local file - remove duplicates and ensure proper encoding
$envFile = ".env.local"
$lines = Get-Content $envFile -Encoding UTF8
$seen = @{}
$newLines = @()

foreach ($line in $lines) {
    if ($line -match '^([^=]+)=(.+)$') {
        $key = $matches[1]
        if (-not $seen.ContainsKey($key)) {
            $seen[$key] = $true
            $newLines += $line
        }
    } else {
        $newLines += $line
    }
}

$newLines | Set-Content $envFile -Encoding UTF8
Write-Host "Fixed .env.local file - removed duplicates"

