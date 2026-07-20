@echo off
setlocal enabledelayedexpansion

:: ================= 配置区 =================
set "nat64_prefix=2a01:4f9:c010:3f02:64::"
set "target_ipv4=104.20.24.85"
set "CF_API_TOKEN=9MvmrZxW4qvTWg0pCm5x1ecNPSJIMOGWl4nUczOP"
set "ZONE_ID=d362e0bd36b803be9068be789bf22747"
set "HOSTNAME=nat64proxyip.miaosky.top"
:: ==========================================


echo [1/4] 正在生成 NAT64 IPv6（完全展开格式）...
for /f "tokens=*" %%a in ('
    powershell -NoProfile -Command ^
        "$prefix = ([System.Net.IPAddress] '%nat64_prefix%').GetAddressBytes();" ^
        "$ipv4 = '%target_ipv4%'.Split('.') | ForEach-Object { [byte]$_ };" ^
        "$parts = @();" ^
        "for ($i=0; $i -lt 16; $i+=2) { $parts += ('{0:x2}{1:x2}' -f $prefix[$i],$prefix[$i+1]); }" ^
        "$parts[6] = ('{0:x2}{1:x2}' -f $ipv4[0],$ipv4[1]);" ^
        "$parts[7] = ('{0:x2}{1:x2}' -f $ipv4[2],$ipv4[3]);" ^
        "Write-Output ($parts -join ':');"
') do set "IP=%%a"
echo 目标 IPv6（展开格式）: %IP%
echo.


echo [2/4] 正在查询 Cloudflare DNS 记录...
set "TMP_JSON=%TEMP%\cf_dns.json"
curl -s -X GET "https://api.cloudflare.com/client/v4/zones/%ZONE_ID%/dns_records?type=AAAA&name=%HOSTNAME%" ^
    -H "Authorization: Bearer %CF_API_TOKEN%" ^
    -H "Content-Type: application/json" > "%TMP_JSON%"
echo.

:: 解析 JSON
for /f "usebackq tokens=1,2 delims=|" %%A in (`
    powershell -NoProfile -Command ^
        "$j = Get-Content '%TMP_JSON%' -Raw | ConvertFrom-Json;" ^
        "if ($j.result.Count -gt 0) {" ^
        "  Write-Output ($j.result[0].id + '|' + $j.result[0].content)" ^
        "} else { Write-Output 'null|null' }"
`) do (
    set "RECORD_ID=%%A"
    set "CURRENT_DNS_IP=%%B"
)

del "%TMP_JSON%" >nul 2>&1

echo 当前记录 ID: %RECORD_ID%
echo 当前 DNS IP: %CURRENT_DNS_IP%
echo 新 IPv6:     %IP%
echo.


:: 将 Cloudflare 返回的 IPv6 也展开
if NOT "%CURRENT_DNS_IP%"=="null" (
    for /f "tokens=*" %%a in ('
        powershell -NoProfile -Command ^
            "$bytes = ([System.Net.IPAddress] '%CURRENT_DNS_IP%').GetAddressBytes();" ^
            "$p = @();" ^
            "for ($i=0; $i -lt 16; $i+=2) { $p += ('{0:x2}{1:x2}' -f $bytes[$i],$bytes[$i+1]); }" ^
            "Write-Output ($p -join ':');"
    ') do set "CURRENT_NORM=%%a"
) else (
    set "CURRENT_NORM=null"
)
echo 当前 DNS IP（展开）: %CURRENT_NORM%
echo.

:: 判断是否需要更新
if "%CURRENT_NORM%"=="%IP%" (
    if NOT "%CURRENT_NORM%"=="null" (
        echo [3/4] DNS 记录已是最新，无需更新。
        pause
        exit /b 0
    )
)


:: ================================
:: 已存在 → 更新记录
:: ================================
if NOT "%RECORD_ID%"=="null" (
    echo [3/4] 发现现有记录，正在更新 IPv6 地址...
    echo.

    curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/%ZONE_ID%/dns_records/%RECORD_ID%" ^
        -H "Authorization: Bearer %CF_API_TOKEN%" ^
        -H "Content-Type: application/json" ^
        --data "{\"type\":\"AAAA\",\"name\":\"%HOSTNAME%\",\"content\":\"%IP%\",\"ttl\":1,\"proxied\":false}"

    echo.
    echo [4/4] ? 已更新 %HOSTNAME% 的 IPv6 地址为：%IP%
    pause
    exit /b 0
)


:: ================================
:: 不存在 → 创建记录
:: ================================
echo [3/4] 未找到现有记录，正在创建新 AAAA 记录...
echo.

curl -s -X POST "https://api.cloudflare.com/client/v4/zones/%ZONE_ID%/dns_records" ^
    -H "Authorization: Bearer %CF_API_TOKEN%" ^
    -H "Content-Type: application/json" ^
    --data "{\"type\":\"AAAA\",\"name\":\"%HOSTNAME%\",\"content\":\"%IP%\",\"ttl\":1,\"proxied\":false}"

echo.
echo [4/4] ? 已创建 %HOSTNAME% 的 IPv6 地址记录：%IP%

pause
exit /b 0
