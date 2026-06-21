# Phát hành một bản WorkDeck mới chỉ với 1 lệnh.
# Cách dùng:  .\publish-release.ps1 -Version 1.0.1
# Nó sẽ: cập nhật version -> build -> đóng gói -> nén -> đăng GitHub Release.
# App đang chạy của người dùng (bấm "Kiểm tra cập nhật") sẽ thấy bản này.
param(
  [Parameter(Mandatory = $true)][string]$Version
)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host "==> Cập nhật version trong package.json -> $Version"
$pkgPath = Join-Path $PSScriptRoot 'package.json'
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$pkg.version = $Version
($pkg | ConvertTo-Json -Depth 20) | Set-Content $pkgPath -Encoding utf8

Write-Host "==> Build"
npm run build

Write-Host "==> Đóng app đang chạy (nếu có) để đóng gói"
Get-Process WorkDeck -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 800

Write-Host "==> Đóng gói"
npx --yes @electron/packager . WorkDeck --platform=win32 --arch=x64 --out=dist --overwrite --icon="resources/icon.ico" --ignore="^/src$" --ignore="^/dist" --ignore="\.ps1$"

Write-Host "==> Nén"
$zip = Join-Path $PSScriptRoot "dist\WorkDeck-$Version.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "dist\WorkDeck-win32-x64\*" -DestinationPath $zip -CompressionLevel Optimal

Write-Host "==> Commit + push version bump"
git add package.json
git commit -m "Release v$Version"
git push

Write-Host "==> Tạo GitHub Release v$Version"
gh release create "v$Version" "$zip#WorkDeck-win32-x64.zip" --title "WorkDeck v$Version" --notes "WorkDeck v$Version"

Write-Host "`nXONG! Người dùng bấm 'Kiểm tra cập nhật' trong Settings sẽ thấy v$Version." -ForegroundColor Green
