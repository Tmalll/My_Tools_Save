@echo off
echo 通用github下载脚本

set "项目地址=/brave/brave-browser/releases/latest"
set "API=https://api.github.com/repos%项目地址%"
set "proxy=https://cfproxy.miaosky.top/proxy/"
set "bestIP=2606:4700::fb27:dda9:fa5a"

:: 检查 PowerShell
where powershell >nul 2>nul
if errorlevel 1 (
  echo [ERROR] PowerShell 未安装或不可用.
  pause
  exit /b 1
)

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


if not defined dlurl (
  echo [ERROR] 未能获取下载地址.
  pause
  exit /b 1
)

echo.
echo [OK] 找到下载地址:
echo %dlurl%
echo.

:: 检查 curl
where curl >nul 2>nul
if errorlevel 1 (
  echo [ERROR] curl 未安装或不可用.
  pause
  exit /b 1
)

:: 拼接代理 + 下载地址
set "finalurl=%proxy%%dlurl%"

echo.
echo 完整下载地址为: %finalurl%
echo.

echo 测试下载地址
curl -L "%finalurl%" --range 0-0 --resolve cfproxy.miaosky.top:443:%bestIP% ^
        -o NUL --silent ^
     -w "\n 相应的HTTP代码为: [ %%{http_code} ] \n\n 所请求的服务器IP地址为: [ %%{remote_ip} ]\n"
echo.
pause

echo. && echo 开始正式下载 && echo.
curl -O -L "%finalurl%" --resolve cfproxy.miaosky.top:443:%bestIP%
echo.


if errorlevel 1 (
  echo [ERROR] 下载失败.
  pause
  exit /b 1
)

echo [OK] 下载完成.
pause
exit /b 0
