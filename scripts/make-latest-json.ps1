# Run this after every release build to generate latest.json
# Usage: .\scripts\make-latest-json.ps1

$version = (Get-Content "src/server/tauri.conf.json" | ConvertFrom-Json).version
$tag     = "v$version"
$repo    = "cytos-innovations/aryan-main"

# Find the MSI sig file
$msisig = Get-ChildItem -Recurse "src/server/target/release/bundle/msi" -Filter "*.msi.sig" | Select-Object -First 1
$msi    = Get-ChildItem -Recurse "src/server/target/release/bundle/msi" -Filter "*.msi"     | Where-Object { $_.Name -notlike "*.sig" } | Select-Object -First 1

if (-not $msisig) {
    Write-Host "ERROR: No .msi.sig file found. Run 'npm run tauri build' first." -ForegroundColor Red
    exit 1
}

$sig     = (Get-Content $msisig.FullName -Raw).Trim()
$url     = "https://github.com/$repo/releases/download/$tag/$($msi.Name)"
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

$json | Out-File -FilePath "latest.json" -Encoding utf8NoBOM

Write-Host "latest.json created for v$version" -ForegroundColor Green
Write-Host ""
Write-Host "Now upload this file to the GitHub release:" -ForegroundColor Yellow
Write-Host "https://github.com/$repo/releases/tag/$tag" -ForegroundColor Cyan
Write-Host ""
Get-Content "latest.json"
