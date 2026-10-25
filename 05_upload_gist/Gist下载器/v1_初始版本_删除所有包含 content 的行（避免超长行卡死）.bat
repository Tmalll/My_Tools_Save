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
echo 正在通过 curl 获取 JSON...

curl -s https://api.github.com/gists/%GIST_ID% > gist.json

echo JSON 获取完成，正在清理 content 字段...

:: ============================
:: 删除所有包含 "content": 的行（避免超长行卡死）
:: ============================
powershell -NoLogo -Command ^
    "(Get-Content 'gist.json') | Where-Object {$_ -notmatch '\"content\"'} | Set-Content 'gist_clean.json'"

echo 清理完成，正在解析...

:: ============================
:: PowerShell 解析 JSON（不会卡）
:: ============================
powershell -NoLogo -Command ^
    "$json = Get-Content 'gist_clean.json' -Raw | ConvertFrom-Json;" ^
    "$file = $json.files.PSObject.Properties.Name | Select-Object -First 1;" ^
    "$user = $json.owner.login;" ^
    "$url = 'https://gist.githubusercontent.com/' + $user + '/%GIST_ID%/raw/' + $file;" ^
    "Set-Clipboard -Value $url;" ^
    "Write-Host '===============================';" ^
    "Write-Host 'RAW 地址:';" ^
    "Write-Host $url;" ^
    "Write-Host '已自动复制到剪贴板';" ^
    "Write-Host '===============================';"

:: del gist.json >nul 2>&1
:: del gist_clean.json >nul 2>&1

echo.
pause
