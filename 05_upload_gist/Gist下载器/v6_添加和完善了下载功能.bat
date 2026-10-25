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

:: ============================
:: PowerShell 完整处理逻辑
:: ============================
powershell -NoLogo -Command ^
    "$id='%GIST_ID%';" ^
    "$json = curl.exe -s https://api.github.com/gists/$id | Where-Object {$_ -notmatch '\"content\"'};" ^
    "$obj = ($json -join \"`n\") | ConvertFrom-Json;" ^
    "$raw = $obj.files.PSObject.Properties.Value.raw_url;" ^
    "$final = $raw -replace '/raw/[0-9a-f]{40}/','/raw/';" ^
    "$filename = $obj.files.PSObject.Properties.Name;" ^
    "$out1 = \"$id`_RawURL.txt\";" ^
    "$out2 = \"$id`_$filename\";" ^
    "Set-Clipboard -Value $final;" ^
    "Set-Content -Path $out1 -Value $final;" ^
    "curl.exe -s -L $final -o $out2;" ^
    "Write-Host '===============================';" ^
    "Write-Host 'RAW地址: ';" ^
    "Write-Host '';" ^
    "Write-Host $final;" ^
    "Write-Host '';" ^
    "Write-Host 'RAW地址: 已复制到剪贴板';" ^
    "Write-Host 'RAW地址: 已写入文件:' $out1;" ^
    "Write-Host 'Gist已下载到文件:' $out2;" ^
    "Write-Host '===============================';"

echo.
pause
exit


