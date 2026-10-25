@echo off
setlocal
title Aria2c 下载助手

:MENU
cls
echo ===================================================
echo                Aria2c 下载助手
echo ===================================================
echo  1. [HTTP下载] 从剪贴板读取 URL
echo  2. [HTTP下载] 手动输入 URL
echo  3. [HTTP下载] 从 Input_URL_List.txt 读取列表批量下载
echo  4. [BT下载] 从剪贴板读取 magnet 磁力连接
echo  5. [BT下载] 手动输入 magnet 磁力连接
echo  6. [BT下载] 从 Input_magnet_List.txt 读取磁力列表批量下载
echo  7. [BT下载] 从 Input_Torrent 文件夹批量加载 BT 种子下载
echo ===================================================
echo.

choice /c 1234 /n /m "请选择下载模式 [1-4]: "
if errorlevel 4 goto OPTION_TORRENT
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
    goto MENU
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

echo.
echo 任务已完成。
pause
goto MENU

:: ================= 模式 3: 批量文本下载 =================
:OPTION_LIST
echo.
if not exist "Input_URL_List.txt" (
    echo [错误] 未找到 Input_URL_List.txt 文件！
    echo [提示] 已在当前目录下为您自动创建空的 Input_URL_List.txt 文件。
    echo        请将下载链接写入该文件（每行一个）后重新运行脚本。
    type nul > "Input_URL_List.txt"
    pause
    goto MENU
)

echo [信息] 已找到 Input_URL_List.txt，准备读取列表开始批量下载...
echo.

aria2c -d . -i "Input_URL_List.txt" --check-certificate=false --file-allocation=none ^
    --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36" ^
    --http-proxy=192.168.1.29:10801 --https-proxy=192.168.1.29:10801 ^
    --max-connection-per-server=16 --split=8

echo.
echo 任务已完成。
pause
goto MENU

:: ================= 模式 4: BT 种子批量下载 =================
:OPTION_TORRENT
echo.
if not exist "Input_Torrent" (
    echo [提示] 未找到 Input_Torrent 文件夹，正在为您创建...
    mkdir "Input_Torrent"
    echo [提示] 已自动创建 Input_Torrent 文件夹。
    echo        请将 .torrent 种子文件放入该文件夹后重新运行脚本。
    pause
    goto MENU
)

dir /b /a-d "Input_Torrent\*.torrent" >nul 2>&1
if errorlevel 1 (
    echo [错误] Input_Torrent 文件夹内没有找到任何 .torrent 文件！
    echo [提示] 请将 .torrent 种子文件放入 Input_Torrent 文件夹后重试。
    pause
    goto MENU
)

echo [信息] 已找到种子文件，准备开始批量下载...
echo.

aria2c -d . --check-certificate=false --file-allocation=none ^
    --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36" ^
    --all-proxy==192.168.1.40:10805 ^
    --max-connection-per-server=16 --split=8 ^
    "Input_Torrent\*.torrent"

echo.
echo 任务已完成。
pause
goto MENU














