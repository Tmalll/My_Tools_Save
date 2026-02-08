@echo off
echo 通用github下载脚本

set "项目地址=/brave/brave-browser/releases/latest"
set "API=https://api.github.com/repos%项目地址%"
set "proxy=https://cfproxy.miaosky.top/proxy/"
set "bestIP=2606:4700::fb27:dda9:fa5a"

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

echo 测试下载地址
curl -L "%finalurl%" --range 0-0 --resolve cfproxy.miaosky.top:443:%bestIP% ^
        -o NUL --silent ^
     -w "\n 相应的HTTP代码为: [ %%{http_code} ] \n\n 所请求的服务器IP地址为: [ %%{remote_ip} ]\n"
echo.

echo. && echo 开始正式下载 && echo.
curl -O -L "%finalurl%" --resolve cfproxy.miaosky.top:443:%bestIP%
echo.

echo.
echo [OK] 下载完成.
echo.

echo [ 解压安装包 ]
powershell -Command "Get-ChildItem -Filter 'brave-*-win32-x64.zip' | ForEach-Object { Write-Host ''; Write-Host '开始解压:' $_.FullName; Expand-Archive -Path $_.FullName -DestinationPath . -Force }" && echo. && echo [ 解压成功完成 ] && echo.

echo [ 删除多余安装包 ]
timeout /t 3 >nul
del /q brave-*-win32-x64.zip && echo [ 删除完成 ] && echo.


pause
exit
