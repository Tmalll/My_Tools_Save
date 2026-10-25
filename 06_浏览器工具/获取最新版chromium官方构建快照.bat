@echo off

echo [INFO] 正在获取 Win_x64 最新版本号...
for /f "delims=" %%i in ('curl.exe -v -s "https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Win_x64%%2FLAST_CHANGE?alt=media" 2^>^&1 ^| powershell -NoProfile -Command "$input | ForEach-Object { if ($_ -match '^\d+$') { $_; $global:found=$true } else { Write-Error $_.Replace([char]0, '') } }; if (-not $global:found) { exit 1 }"') do set "X64_VER=%%i"
echo.

echo [INFO] 正在获取 Win (x86) 最新版本号...
for /f "delims=" %%i in ('curl.exe -v -s "https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Win%%2FLAST_CHANGE?alt=media" 2^>^&1 ^| powershell -NoProfile -Command "$input | ForEach-Object { if ($_ -match '^\d+$') { $_; $global:found=$true } else { Write-Error $_.Replace([char]0, '') } }; if (-not $global:found) { exit 1 }"') do set "X86_VER=%%i"
echo.

set "X64_DIR=https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html?prefix=Win_x64/%X64_VER%/"
set "X86_DIR=https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html?prefix=Win/%X86_VER%/"

set "X64_DL=https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Win_x64%%2F%X64_VER%%%2Fchrome-win.zip?alt=media"
set "X86_DL=https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Win%%2F%X86_VER%%%2Fchrome-win.zip?alt=media"

echo.
echo 【Win_x64 平台】
echo 最新版本号: %X64_VER%
echo 对应目录页: %X64_DIR%
echo 压缩包直链: %X64_DL%
echo.
echo 【Win_x86 平台】
echo 最新版本号: %X86_VER%
echo 对应目录页: %X86_DIR%
echo 压缩包直链: %X86_DL%
echo.

pause
exit