@echo off

set "API_URL=https://api.github.com/repos/apernet/hysteria/releases/tags/v1.3.5"

echo ==================== 开始获取下载地址 ====================
echo.

:: 1. 使用 curl.exe 获取数据 
:: 2. 管道传给 PowerShell 仅做 JSON 解析和对象提取
curl -s "%API_URL%" | powershell -NoProfile -Command "$input | ConvertFrom-Json | ForEach-Object { $_.assets.browser_download_url }"

echo.
echo ==========================================================
pause