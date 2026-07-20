@echo off
setlocal enabledelayedexpansion

set /p "GIST_ID=请输入 Gist ID: "

:: ============================
:: 设置代理服务器（curl 会自动使用）
:: ============================
set http_proxy=socks5h://192.168.1.40:10800
set https_proxy=%http_proxy%
set HTTP_PROXY=%http_proxy%
set HTTPS_PROXY=%http_proxy%

echo.
echo 正在获取并解析 Gist 信息...

:: ============================
:: curl 下载 JSON → 管道传给 PowerShell
:: PowerShell 删除 content 行 → 解析 JSON → 处理 raw_url
:: ============================
curl -s https://api.github.com/gists/%GIST_ID% | powershell -NoLogo -Command ^
    "$input | Where-Object {$_ -notmatch '\"content\"'} | Set-Variable cleaned;" ^
    "$json = $cleaned -join \"`n\" | ConvertFrom-Json;" ^
    "$raw = $json.files.PSObject.Properties.Value.raw_url;" ^
    "$final = $raw -replace '/raw/[0-9a-f]{40}/','/raw/';" ^
    "Set-Clipboard -Value $final;" ^
    "Write-Host '===============================';" ^
    "Write-Host 'RAW 地址:';" ^
    "Write-Host $final;" ^
    "Write-Host '已自动复制到剪贴板';" ^
    "Write-Host '===============================';"

echo.
pause
