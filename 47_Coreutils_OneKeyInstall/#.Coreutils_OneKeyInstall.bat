@echo off
setlocal enabledelayedexpansion

:: ================= 配置区域 =================
set "API_URL=https://api.github.com/repos/uutils/coreutils/releases/latest"
set "KEYWORDS=x86_64-pc-windows-msvc"

echo.
echo API地址: %API_URL%
echo.
echo 筛选条件: [ %KEYWORDS% ]
echo.

set "DOWNLOAD_URL="
for /f "delims=" %%I in ('curl -s "%API_URL%" ^| powershell -NoProfile -Command "$j=$input|ConvertFrom-Json;$u=$j.assets.browser_download_url;$k='%KEYWORDS%'-split','|?{$_};if($k){$u=$u|?{$url=$_;$m=$true;foreach($k_ in $k){if($url -notmatch [regex]::Escape($k_)){$m=$false;break}};$m}};$u"') do (
    set "DOWNLOAD_URL=!DOWNLOAD_URL! %%I"
)

:: 清理 URL 前后的空格
for /f "tokens=*" %%A in ("%DOWNLOAD_URL%") do set "DOWNLOAD_URL=%%A"

:: 从 URL 中解析提取出原始文件名
for %%I in ("%DOWNLOAD_URL%") do set "FILENAME=%%~nxI"

echo 解析到的下载地址: 
echo %DOWNLOAD_URL%
echo.
echo 解析到的文件名:
echo %FILENAME%
echo.
pause
cls

echo.
echo 下载文件...
echo.
set "ZIP_FILE=%~dp0%FILENAME%"
if exist "%ZIP_FILE%" (
    echo 发现已存在包文件: %FILENAME%，跳过下载。
) else (
    echo 正在下载包文件...
    curl -L -O "%DOWNLOAD_URL%"
)
echo.

:: 前面的下载脚本..
pause

:: 安装位置
set "TARGET_DIR=C:\#coreutils"
set "TEMP_DIR=%~dp0coreutils_temp"

echo.
echo 正在解压并重命名目录...
rmdir /s /q "%TARGET_DIR%" > NUL 2>&1
rmdir /s /q "%TEMP_DIR%" > NUL 2>&1
mkdir "%TARGET_DIR%" > NUL 2>&1
mkdir "%TEMP_DIR%" > NUL 2>&1
echo.

echo 解压文件到临时文件夹...
powershell -NoProfile -Command "Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%TEMP_DIR%' -Force"
echo.

echo 移动文件至安装目录...
powershell -NoProfile -Command "Move-Item '%TEMP_DIR%\coreutils*\*' '%TARGET_DIR%' -Force"
echo.

echo 清理临时目录...
if exist "%TEMP_DIR%" rd /s /q "%TEMP_DIR%"
echo.

echo 安装完成...
explorer.exe "%TARGET_DIR%"
echo.

pause
exit