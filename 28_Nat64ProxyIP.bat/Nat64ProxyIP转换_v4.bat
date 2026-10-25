@echo off
setlocal enabledelayedexpansion

:: ================= 配置区 =================
set "nat64_prefix=2602:fc59:b0:64::"
set "target_ipv4=104.20.24.85"
set "CF_API_TOKEN=9MvmrZxW4qvTWg0pCm5x1ecNPSJIMOGWl4nUczOP"
set "ZONE_ID=d362e0bd36b803be9068be789bf22747"
set "HOSTNAME=nat64proxyip.miaosky.top"
:: ==========================================


:转换Nat64地址
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
echo 转换后的Nat64地址(展开格式): %IP%
echo.
pause



:测试Nat64地址
set "项目地址=/brave/brave-browser/releases/latest"
set "API=https://api.github.com/repos%项目地址%"
set "proxy=https://cfproxy.miaosky.top/proxy/"
set "bestIP=%IP%"

echo 项目地址为: [ %项目地址% ]
echo API地址为: [ %API% ]
echo 使用前置代理为: [ %proxy% ]
echo 使用优选IP为: [ %bestIP% ]

:: 获取包含 win32-x64.zip 的下载地址
for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command ^
  "$ErrorActionPreference='SilentlyContinue';" ^
  "$u='%API%';" ^
  "$headers=@{'User-Agent'='curl/8.0'; 'Accept'='application/vnd.github+json'};" ^
  "$r=Invoke-RestMethod -Uri $u -Headers $headers -TimeoutSec 20;" ^
  "$asset=$r.assets | Where-Object { $_.browser_download_url -like '*win32-x64.zip' } | Select-Object -First 1;" ^
  "if($asset){ $asset.browser_download_url }"`) do (
  set "dlurl=%%A"
)

echo.
echo [OK] 找到下载地址:
echo %dlurl%
echo.

:: 拼接代理 + 下载地址
set "finalurl=%proxy%%dlurl%"

echo.
echo 完整下载地址为: 
echo    %finalurl%
echo.

echo. && echo 开始正式下载 && echo.
curl -o NUL -L "%finalurl%" --resolve cfproxy.miaosky.top:443:%bestIP% -v  --connect-timeout 5 -m 10
echo.

echo 测试完成. 确认是否更新DDNS记录. 3
pause
echo 测试完成. 确认是否更新DDNS记录. 2
pause
echo 测试完成. 确认是否更新DDNS记录. 1
pause
cls



:更新DDNS
echo 正在查询 Cloudflare 上的 DNS 记录...
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
        echo 当前 DNS 记录已是最新，无需更新。
        pause
        exit /b 0
    )
)


:: ================================
:: 已存在 → 更新记录
:: ================================
if NOT "%RECORD_ID%"=="null" (
    echo 发现现有旧的DNS记录存在，正在更新 IPv6 地址...
    echo.

    curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/%ZONE_ID%/dns_records/%RECORD_ID%" ^
        -H "Authorization: Bearer %CF_API_TOKEN%" ^
        -H "Content-Type: application/json" ^
        --data "{\"type\":\"AAAA\",\"name\":\"%HOSTNAME%\",\"content\":\"%IP%\",\"ttl\":1,\"proxied\":false}"

    echo.
    echo 新的DNS记录已更新 %HOSTNAME% 的 IPv6 地址为：%IP%
    pause
    exit /b 0
)


:: ================================
:: 不存在 → 创建记录
:: ================================
echo 未找到现有记录，正在创建新 AAAA 记录...
echo.

curl -s -X POST "https://api.cloudflare.com/client/v4/zones/%ZONE_ID%/dns_records" ^
    -H "Authorization: Bearer %CF_API_TOKEN%" ^
    -H "Content-Type: application/json" ^
    --data "{\"type\":\"AAAA\",\"name\":\"%HOSTNAME%\",\"content\":\"%IP%\",\"ttl\":1,\"proxied\":false}"

echo.
echo 新的域名解析已创建 %HOSTNAME% 的 IPv6 地址记录：%IP%

pause
exit /b 0
