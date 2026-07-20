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
:: curl → PowerShell → 输出最终 RAW URL 到 temp.txt
:: ============================
curl -s https://api.github.com/gists/%GIST_ID% | powershell -NoLogo -Command ^
    "$clean = $input | Where-Object {$_ -notmatch '\"content\"'};" ^
    "$json = $clean -join \"`n\" | ConvertFrom-Json;" ^
    "$raw = $json.files.PSObject.Properties.Value.raw_url;" ^
    "$final = $raw -replace '/raw/[0-9a-f]{40}/','/raw/';" ^
    "Set-Clipboard -Value $final;" ^
    "Set-Content -Path 'temp.txt' -Value $final"

:: ============================
:: 读取 PowerShell 生成的结果
:: ============================
set /p FINAL_URL=<temp.txt
# del temp.txt >nul 2>&1

echo.
echo ===============================
echo RAW 地址:
echo %FINAL_URL%
echo 已自动复制到剪贴板
echo ===============================

:: 你可以在这里继续下载
:: curl -L "%FINAL_URL%" -o output.file

echo.
pause
