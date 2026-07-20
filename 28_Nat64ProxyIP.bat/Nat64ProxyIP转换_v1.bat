@echo off
set "nat64_prefix=2a01:4f9:c010:3f02:64::"
set "target_ipv4=104.20.24.85"

:: 修正后的逻辑：直接将前缀与十六进制部分拼接
for /f "tokens=*" %%a in ('powershell -NoProfile -Command "$b=$env:target_ipv4.Split('.'); $hex='{0:x2}{1:x2}:{2:x2}{3:x2}' -f [byte]$b[0],[byte]$b[1],[byte]$b[2],[byte]$b[3]; $env:nat64_prefix + $hex"') do set "NAT64_V6=%%a"

:: 验证结果
echo 转换后的地址是: %NAT64_V6%


set "项目地址=/brave/brave-browser/releases/latest"
set "API=https://api.github.com/repos%项目地址%"
set "proxy=https://cfproxy.miaosky.top/proxy/"
set "bestIP=%NAT64_V6%"

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

cls
echo. && echo 开始正式下载 && echo.
curl -O -L "%finalurl%" --resolve cfproxy.miaosky.top:443:%bestIP% -v --connect-timeout 5 -m 10
echo.



pause
exit
