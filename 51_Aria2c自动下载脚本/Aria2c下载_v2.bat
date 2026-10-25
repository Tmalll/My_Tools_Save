@echo off
setlocal
title Aria2c 下载助手

:MENU
cls
echo ===================================================
echo                Aria2c 下载助手
echo ===================================================
echo  1. 从剪贴板读取 URL
echo  2. 手动输入 URL
echo  3. 从 Input_URL_List.txt 读取列表批量下载
echo ===================================================
echo.

choice /c 123 /n /m "请选择下载模式 [1-3]: "
if errorlevel 3 goto OPTION_LIST
if errorlevel 2 goto OPTION_MANUAL
if errorlevel 1 goto OPTION_CLIPBOARD

:: ================= 模式 1: 剪贴板读取 =================
:OPTION_CLIPBOARD
echo.
echo [信息] 正在从剪贴板读取内容...
set "dl_URL="
for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Clipboard"') do set "dl_URL=%%i"

if not defined dl_URL (
    echo [提示] 剪贴板中未读取到内容！
    set /p "dl_URL=请手动输入或粘贴 URL: "
)
goto SINGLE_DOWNLOAD_PREP

:: ================= 模式 2: 手动输入 URL =================
:OPTION_MANUAL
echo.
set "dl_URL="
set /p "dl_URL=请输入 URL: "
goto SINGLE_DOWNLOAD_PREP

:: ================= 单文件下载前的通用处理 =================
:SINGLE_DOWNLOAD_PREP
if not defined dl_URL (
    echo [错误] 未提供有效的 URL！
    pause
    exit /b
)

echo.
echo 当前确定的 URL:
echo "%dl_URL%"
echo.

set "dl_Name="
set /p "dl_Name=请输入文件名(留空按回车将自动使用当前时间戳): "

if not defined dl_Name (
    for /f %%i in ('powershell -NoProfile -Command "(Get-Date -Format 'yyyy-MM-dd_HH.mm.ss') + '.mp4'"') do set "dl_Name=%%i"
)

echo.
echo 最终确定的文件名: %dl_Name%
echo 开始下载...
echo.

aria2c -d . -o "%dl_Name%" --check-certificate=false --file-allocation=none "%dl_URL%" ^
    --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36" ^
    --http-proxy=192.168.1.29:10801 --https-proxy=192.168.1.29:10801 ^
    --max-connection-per-server=16 --split=8

goto END

:: ================= 模式 3: 批量文本下载 =================
:OPTION_LIST
echo.
if not exist "Input_URL_List.txt" (
    echo [错误] 未找到 Input_URL_List.txt 文件！
    echo [提示] 已在当前目录下为您自动创建空的 Input_URL_List.txt 文件。
    echo        请将下载链接写入该文件（每行一个）后重新运行脚本。
    type nul > "Input_URL_List.txt"
    pause
    exit /b
)

echo [信息] 已找到 Input_URL_List.txt，准备读取列表开始批量下载...
echo.

aria2c -d . -i "Input_URL_List.txt" --check-certificate=false --file-allocation=none ^
    --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36" ^
    --http-proxy=192.168.1.29:10801 --https-proxy=192.168.1.29:10801 ^
    --max-connection-per-server=16 --split=8

goto END

:END
echo.
echo 任务已完成。
pause
exit /b