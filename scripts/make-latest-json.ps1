# Run this after every release build to generate latest.json
# Usage: .\scripts\make-latest-json.ps1

$version = (Get-Content "src/server/tauri.conf.json" | ConvertFrom-Json).version
$tag     = "v$version"
$repo    = "cytos-innovations/aryan-main"

# Find newest sig file (prefer NSIS .exe.sig, fall back to MSI .msi.sig)
$bundle  = "src/server/target/release/bundle"

$nsisig  = Get-ChildItem -Recurse "$bundle/nsis" -Filter "*.exe.sig" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$nsis    = Get-ChildItem -Recurse "$bundle/nsis"  -Filter "*.exe"     -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike "*.sig" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$msisig  = Get-ChildItem -Recurse "$bundle/msi"   -Filter "*.msi.sig" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$msi     = Get-ChildItem -Recurse "$bundle/msi"   -Filter "*.msi"     -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike "*.sig" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1

$chosenSig       = if ($msisig) { $msisig } elseif ($nsisig) { $nsisig } else { $null }
$chosenInstaller = if ($msisig) { $msi    } elseif ($nsis)   { $nsis   } else { $null }

if (-not $chosenSig) {
    Write-Host "ERROR: No .sig file found. Run 'npm run tauri build' with signing keys set first." -ForegroundColor Red
    exit 1
}

$sig     = (Get-Content $chosenSig.FullName -Raw).Trim()
$url     = "https://github.com/$repo/releases/download/$tag/$($chosenInstaller.Name)"
$pubDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$json = [ordered]@{
    version  = $version
    pub_date = $pubDate
    notes    = "See the release page for details."
    platforms = [ordered]@{
        "windows-x86_64" = [ordered]@{
            url       = $url
            signature = $sig
        }
    }
} | ConvertTo-Json -Depth 5

[System.IO.File]::WriteAllText("$PWD\latest.json", $json)

Write-Host "latest.json created for v$version" -ForegroundColor Green
Write-Host ""
Write-Host "Now upload this file to the GitHub release:" -ForegroundColor Yellow
Write-Host "https://github.com/$repo/releases/tag/$tag" -ForegroundColor Cyan
Write-Host ""
Get-Content "latest.json"
