@echo off
setlocal enabledelayedexpansion

:: ===== 初始化用户配置 =====
:: 系统架构 x64 / x86
set "ARCH=x64"

:: 更新频道 stable / beta / dev
set "CHANNEL=stable"

:: ===== channel → ap 映射 =====
if /i "%CHANNEL%"=="stable" set "AP=%ARCH%-stable"
if /i "%CHANNEL%"=="beta"   set "AP=%ARCH%-beta"
if /i "%CHANNEL%"=="dev"    set "AP=%ARCH%-dev"

:: 下载CDN来源 1~4 选择下载源
:: CDN 1 = dl.google.com
:: CDN 2 = edgedl.me.gvt1.com
:: CDN 3 = redirector.gvt1.com
:: CDN 4 = www.google.com
set "CDN=1"

echo.
echo 初始化开始信息...
echo.
echo     [INFO] 所选更新频道 Channel: [ %CHANNEL% ]
echo     [INFO] 所选系统架构 Arch: [ %ARCH% ]
echo.
echo     CDN信息:
echo       1 = dl.google.com
echo       2 = edgedl.me.gvt1.com
echo       3 = redirector.gvt1.com
echo       4 = www.google.com
echo     所选CND: [ %CDN% ]
echo.
echo 请确认初始化信息正确...
pause
cls

:: 是否使用CF反代 1=开  0=关
set "USE_CF=1"
set "proxies=https://cfproxy.miaosky.top/proxy/"
set "proxies_hosts=cfproxy.miaosky.top"
rem set "BEST_IP=2606:4700::fb27:dda9:fa5a"
set "BEST_IP=104.20.21.0"

:: ===== 组装 curl 参数 =====
set "CURL_URL=https://update.googleapis.com/service/update2/json"
set "CURL_EXTRA="

if "%USE_CF%"=="1" (
    set "CURL_URL=%proxies%https://update.googleapis.com/service/update2/json"
    if "%BEST_IP%"=="" (
        set "CURL_EXTRA="
    ) else (
        set "CURL_EXTRA=--resolve %proxies_hosts%:443:%BEST_IP%"
    )
)
:: ===== 获取信息 =====
for /f "usebackq tokens=1,2,3 delims=|" %%A in (`curl.exe -m 10 %CURL_EXTRA% -s -X POST "%CURL_URL%" -H "Content-Type: application/json" -H "User-Agent: Chrome" -d "{\"request\":{\"protocol\":\"3.0\",\"os\":{\"platform\":\"win\",\"arch\":\"%ARCH%\",\"version\":\"10.0\"},\"app\":[{\"appid\":\"{8A69D345-D564-463C-AFF1-A69D9E530F96}\",\"updatecheck\":{},\"ap\":\"%AP%\",\"installsource\":\"ondemand\"}]}}" ^| powershell -NoProfile -Command "$input_data = $input | Out-String; try { $json = ($input_data -replace '^[^{]*','') | ConvertFrom-Json; $u = $json.response.app[0].updatecheck; $base = $u.urls.url[0].codebase; $name = $u.manifest.packages.package[0].name; $ver = $u.manifest.version; $folder = ($base -replace '^https?://[^/]+/.*/chrome/','') -replace '/$',''; Write-Output ($ver+'|'+$folder+'|'+$name) } catch { Write-Output 'ERROR|FAIL|FAIL' }"`) do (
    set "VERSION=%%A"
    set "VERNAME=%%B"
    set "PKGNAME=%%C"
)

:: ===== 输出信息 =====
echo.
echo 已获取到的更新信息:
echo Channel: %CHANNEL%
echo version: %VERSION%
echo version_name: %VERNAME%
echo pkg_name: %PKGNAME%
echo.

:: ===== 构造 CDN 拼接下载地址 =====
set "cdn1=https://dl.google.com/release2/chrome/%VERNAME%/%PKGNAME%"
set "cdn2=https://edgedl.me.gvt1.com/edgedl/release2/chrome/%VERNAME%/%PKGNAME%"
set "cdn3=https://redirector.gvt1.com/edgedl/release2/chrome/%VERNAME%/%PKGNAME%"
set "cdn4=https://www.google.com/dl/release2/chrome/%VERNAME%/%PKGNAME%"

:: ===== 选择 CDN =====
if "%CDN%"=="1" set "DLURL=%cdn1%"
if "%CDN%"=="2" set "DLURL=%cdn2%"
if "%CDN%"=="3" set "DLURL=%cdn3%"
if "%CDN%"=="4" set "DLURL=%cdn4%"

echo [INFO] Download URL:
echo %DLURL%

echo. & echo 请确认下载信息和下载地址... & pause
echo. & echo 请确认下载信息和下载地址... & pause
echo. & echo 请确认下载信息和下载地址... & pause


set files_name=%PKGNAME%.7z
:: ===== 检查文件是否已存在 =====
if exist "%files_name%" (
    echo.
    echo [INFO] 检测到文件 %files_name% 已存在，跳过下载。
    echo [INFO] 继续执行后续脚本...
    echo.
    goto NEXT_STEP
)
:: ===== 下载 =====
if "%USE_CF%"=="1" (
    echo [INFO] 使用 CF 代理下载
    curl -L -o %files_name% "%proxies%%DLURL%" --resolve %proxies_hosts%:443:%BEST_IP% -v
) else (
    echo [INFO] 直连下载
    curl -L -o %files_name% "%DLURL%" -v
)
echo.
echo 下载完成 [DONE]
:NEXT_STEP
pause

set "TARGET_DIR=%~dp0Chrome-bin"
set "INSTALLER=%~dp0%files_name%"

:清理旧版本的文件
echo.
echo 清理旧版本的文件...
powershell -NoProfile -Command ^
    "$target = '%TARGET_DIR%';" ^
    "if (!(Test-Path $target)) { New-Item -Path $target -ItemType Directory -Force > $null };" ^
    "Get-ChildItem -Path $target -Recurse | " ^
    "Where-Object { $_.FullName -notmatch 'chrome\+\+\.ini$' -and $_.FullName -notmatch 'version\.dll$' -and $_.Name -notlike '*启动器.vbs' } | " ^
    "Sort-Object FullName -Descending | " ^
    "Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"
echo 清理完成
echo.
pause

:构建7zip解压环境
set "SEVENZIP_DIR=%~dp07zCore"
set "SEVENZIP=%SEVENZIP_DIR%\7za.exe"

if exist "%SEVENZIP%" (
    echo.
    echo [INFO] 已检测到 7-Zip CLI，跳过下载与解压
    echo.
    goto :7ZIP_READY
)

echo.
echo 未检测到7zipCLI解压环境, 开始下载并安装...
echo.

if "%USE_CF%"=="1" (
    echo [INFO] 使用 CF 代理下载
    curl.exe -L -o "%~dp07zr.exe" "%proxies%https://github.com/ip7z/7zip/releases/latest/download/7zr.exe" --resolve %proxies_hosts%:443:%BEST_IP% -v --progress-bar
    curl.exe -L -o "%~dp07z-extra.7z" "%proxies%https://github.com/ip7z/7zip/releases/latest/download/7z2600-extra.7z" --resolve %proxies_hosts%:443:%BEST_IP% -v --progress-bar
) else (
    echo [INFO] 直连下载
    curl.exe -L -o "%~dp07zr.exe" "https://github.com/ip7z/7zip/releases/latest/download/7zr.exe" --progress-bar
    curl.exe -L -o "%~dp07z-extra.7z" "https://github.com/ip7z/7zip/releases/latest/download/7z2600-extra.7z" --progress-bar
)
if not exist "%SEVENZIP_DIR%" mkdir "%SEVENZIP_DIR%"
"%~dp07zr.exe" x "%~dp07z-extra.7z" -o"%SEVENZIP_DIR%" -y > nul
del /f /q "%~dp07zr.exe" "%~dp07z-extra.7z"
:7ZIP_READY
echo [INFO] 7-Zip CLI 准备完成
echo.
pause

:解压新版本的文件
echo.
echo 开始解压新版本的文件...
echo.
echo 解压 Chrome 安装包...
"%SEVENZIP%" x "%INSTALLER%" -o"%~dp0" -y -t7z
echo [DONE] 全部完成
pause
exit


















