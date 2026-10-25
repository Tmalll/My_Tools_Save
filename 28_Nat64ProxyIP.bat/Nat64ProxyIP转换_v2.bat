@echo off
setlocal enabledelayedexpansion

:: ================= 配置区 =================
set "nat64_prefix=2a01:4f9:c010:3f02:64::"
set "target_ipv4=104.20.24.85"
set "CF_API_TOKEN=9MvmrZxW4qvTWg0pCm5x1ecNPSJIMOGWl4nUczOP"
set "ZONE_ID=d362e0bd36b803be9068be789bf22747"
set "HOSTNAME=nat64proxyip222.miaosky.top"
:: ==========================================


echo [1/5] 正在转换 NAT64 地址...

:: 1. 转换 IPv4 → NAT64 IPv6
for /f "tokens=*" %%a in ('
    powershell -NoProfile -Command ^
        "$b='%target_ipv4%'.Split('.');" ^
        "$hex='{0:x2}{1:x2}:{2:x2}{3:x2}' -f [byte]$b[0],[byte]$b[1],[byte]$b[2],[byte]$b[3];" ^
        "Write-Output ('%nat64_prefix%' + $hex)"
') do set "NAT64_V6=%%a"

set "IP=%NAT64_V6%"
echo 目标 IPv6: %IP%
echo.


:: ================================
:: IPv6 规范化函数（展开为完整 8 组）
:: ================================
set "TMP_IPFILE=%TEMP%\cf_ip.txt"

> "%TMP_IPFILE%" powershell -NoProfile -Command ^
    "function norm([string]$ip) {" ^
    "  $bytes = ([System.Net.IPAddress] $ip).GetAddressBytes();" ^
    "  $parts = @();" ^
    "  for ($i=0; $i -lt 16; $i+=2) {" ^
    "    $parts += ('{0:x2}{1:x2}' -f $bytes[$i],$bytes[$i+1]);" ^
    "  }" ^
    "  return ($parts -join ':');" ^
    "}" ^
    "Write-Output (norm '%IP%')"

set /p IP_NORM=<"%TMP_IPFILE%"
del "%TMP_IPFILE%" >nul 2>&1

echo 规范化后 IPv6: %IP_NORM%
echo.


echo [2/5] 正在查询 Cloudflare DNS 记录...


:: ================================
:: 查询 AAAA 记录
:: ================================
set "TMP_JSON=%TEMP%\cf_dns.json"

curl -s -X GET "https://api.cloudflare.com/client/v4/zones/%ZONE_ID%/dns_records?type=AAAA&name=%HOSTNAME%" ^
    -H "Authorization: Bearer %CF_API_TOKEN%" ^
    -H "Content-Type: application/json" > "%TMP_JSON%"

echo.


:: ================================
:: 使用 PowerShell 解析 JSON
:: ================================
for /f "usebackq tokens=1,2 delims=|" %%A in (`
    powershell -NoProfile -Command ^
        "$j = Get-Content '%TMP_JSON%' -Raw | ConvertFrom-Json;" ^
        "if ($j.result.Count -gt 0) {" ^
        "  $id=$j.result[0].id; $ip=$j.result[0].content;" ^
        "  Write-Output ($id+'|'+$ip)" ^
        "} else { Write-Output 'null|null' }"
`) do (
    set "RECORD_ID=%%A"
    set "CURRENT_DNS_IP=%%B"
)

del "%TMP_JSON%" >nul 2>&1


echo 当前记录 ID: %RECORD_ID%
echo 当前 DNS IP: %CURRENT_DNS_IP%
echo.


:: ================================
:: 规范化 Cloudflare 返回的 IPv6
:: ================================
set "TMP_IPFILE=%TEMP%\cf_ip2.txt"

> "%TMP_IPFILE%" powershell -NoProfile -Command ^
    "function norm([string]$ip) {" ^
    "  if ($ip -eq 'null') { return 'null' }" ^
    "  $bytes = ([System.Net.IPAddress] $ip).GetAddressBytes();" ^
    "  $parts = @();" ^
    "  for ($i=0; $i -lt 16; $i+=2) {" ^
    "    $parts += ('{0:x2}{1:x2}' -f $bytes[$i],$bytes[$i+1]);" ^
    "  }" ^
    "  return ($parts -join ':');" ^
    "}" ^
    "Write-Output (norm '%CURRENT_DNS_IP%')"

set /p CURRENT_NORM=<"%TMP_IPFILE%"
del "%TMP_IPFILE%" >nul 2>&1

echo 规范化后 DNS IP: %CURRENT_NORM%
echo.


:: ================================
:: 判断是否需要更新
:: ================================
if "%CURRENT_NORM%"=="%IP_NORM%" (
    if NOT "%CURRENT_NORM%"=="null" (
        echo [3/5] DNS 记录已是最新，无需更新。
        pause
        exit /b 0
    )
)


:: ================================
:: 已存在 → 更新记录
:: ================================
if NOT "%RECORD_ID%"=="null" (
    echo [3/5] 发现现有记录，正在更新 IPv6 地址...
    echo.

    curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/%ZONE_ID%/dns_records/%RECORD_ID%" ^
        -H "Authorization: Bearer %CF_API_TOKEN%" ^
        -H "Content-Type: application/json" ^
        --data "{\"type\":\"AAAA\",\"name\":\"%HOSTNAME%\",\"content\":\"%IP%\",\"ttl\":1,\"proxied\":false}"

    echo.
    echo [4/5] ? 已更新 %HOSTNAME% 的 IPv6 地址为：%IP%
    pause
    exit /b 0
)


:: ================================
:: 不存在 → 创建记录
:: ================================
echo [3/5] 未找到现有记录，正在创建新 AAAA 记录...
echo.

curl -s -X POST "https://api.cloudflare.com/client/v4/zones/%ZONE_ID%/dns_records" ^
    -H "Authorization: Bearer %CF_API_TOKEN%" ^
    -H "Content-Type: application/json" ^
    --data "{\"type\":\"AAAA\",\"name\":\"%HOSTNAME%\",\"content\":\"%IP%\",\"ttl\":1,\"proxied\":false}"

echo.
echo [4/5] ? 已创建 %HOSTNAME% 的 IPv6 地址记录：%IP%

pause
exit /b 0
