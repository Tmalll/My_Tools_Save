@echo off
setlocal enabledelayedexpansion

set /p "GIST_ID=请输入 Gist ID: "

:: ============================
:: 设置代理服务器（curl / aria2c 会自动使用）
:: ============================
set http_proxy=socks5h://192.168.1.40:10800
set https_proxy=%http_proxy%
set HTTP_PROXY=%http_proxy%
set HTTPS_PROXY=%http_proxy%

echo.
echo 正在获取并解析 Gist 信息...

powershell -NoLogo -Command ^
    "$id='%GIST_ID%';" ^
    "$json = curl.exe -s https://api.github.com/gists/$id | Where-Object {$_ -notmatch '\"content\"'};" ^
    "$obj = ($json -join \"`n\") | ConvertFrom-Json;" ^
    "$raw = $obj.files.PSObject.Properties.Value.raw_url;" ^
    "$final = $raw -replace '/raw/[0-9a-f]{40}/','/raw/';" ^
    "Set-Clipboard -Value $final;" ^
    "Write-Host 'RAW 地址:';" ^
    "Write-Host $final;" ^
    "Write-Host '已复制到剪贴板';" ^
    "# 你可以在这里直接下载，例如：" ^
    "# curl.exe -L $final -o $($obj.files.PSObject.Properties.Name)" ^
    "# aria2c --all-proxy=$env:http_proxy $final"

echo.
pause
