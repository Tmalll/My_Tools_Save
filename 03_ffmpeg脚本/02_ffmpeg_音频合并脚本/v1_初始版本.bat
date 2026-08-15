@echo off
rem 强制当前窗口使用 UTF-8 环境
chcp 65001 > nul
setlocal EnableDelayedExpansion

rem ==================================================
rem 配置区
rem ==================================================

set "FFMPEG=ffmpeg.exe"
set "INPUT_DIR=E:\01.userData\ZhuoMian\新建文件夹"
set "OUTPUT_DIR=E:\01.userData\ZhuoMian\新建文件夹\Output"
set "OUTPUT_NAME=output.webm"

rem ==================================================
rem 自动变量
rem ==================================================

set "LIST_FILE=%OUTPUT_DIR%\output_list.txt"
set "LOG_FILE=%OUTPUT_DIR%\merge.log"
set "OUTPUT_FILE=%OUTPUT_DIR%\%OUTPUT_NAME%"

if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

rem ==================================================
:MENU
cls

echo ==================================================
echo FFmpeg 无损媒体合并器 UTF-8 增强版
echo ==================================================
echo.
echo 当前设置:
echo.
echo 输入目录  : %INPUT_DIR%
echo 输出目录  : %OUTPUT_DIR%
echo 输出文件  : %OUTPUT_FILE%
echo.
echo ==================================================
echo.
echo 生成列表文件1
echo 开始合并2
echo 查看列表文件3
echo 打开输出目录4
echo.
echo 退出0
echo.
echo ==================================================
echo.

set /p CHOICE=请输入选项:

if "%CHOICE%"=="1" goto BUILD_LIST
if "%CHOICE%"=="2" goto MERGE
if "%CHOICE%"=="3" goto VIEW_LIST
if "%CHOICE%"=="4" goto OPEN_DIR
if "%CHOICE%"=="0" exit

goto MENU

rem ==================================================
rem 生成列表
rem ==================================================

:BUILD_LIST

echo.
echo 正在生成列表...
echo.

rem 核心修正：利用 .NET 强制输出不带 BOM 的绝对纯净 UTF-8 文本，彻底解决 unknown keyword 报错
powershell -NoProfile -ExecutionPolicy Bypass "$utf8 = New-Object System.Text.UTF8Encoding $false; [System.IO.File]::WriteAllLines('%LIST_FILE%', (Get-ChildItem -LiteralPath '%INPUT_DIR%' -File | Sort-Object Name | ForEach-Object {'file ''' + $_.FullName.Replace('\','/').Replace('''','''\''''') + ''''}), $utf8)"

if not exist "%LIST_FILE%" (
    echo.
    echo 生成失败！
    pause
    goto MENU
)

for /f %%A in ('powershell -NoProfile -Command "Get-Content -LiteralPath '%LIST_FILE%' | Measure-Object | Select-Object -ExpandProperty Count"') do set COUNT=%%A

echo.
echo 列表生成完成
echo 文件数量: %COUNT%
echo.
echo 列表位置:
echo %LIST_FILE%
echo.

notepad "%LIST_FILE%"

pause
goto MENU

rem ==================================================
rem 查看列表
rem ==================================================

:VIEW_LIST

if not exist "%LIST_FILE%" (
    echo.
    echo 尚未生成列表文件！
    pause
    goto MENU
)

notepad "%LIST_FILE%"

goto MENU

rem ==================================================
rem 打开输出目录
rem ==================================================

:OPEN_DIR

explorer "%OUTPUT_DIR%"
goto MENU

rem ==================================================
rem 开始合并
rem ==================================================

:MERGE

if not exist "%LIST_FILE%" (
    echo.
    echo 请先生成列表文件！
    pause
    goto MENU
)

for /f %%A in ('powershell -NoProfile -Command "Get-Content -LiteralPath '%LIST_FILE%' | Measure-Object | Select-Object -ExpandProperty Count"') do set COUNT=%%A

echo.
echo ==================================================
echo 即将开始合并
echo ==================================================
echo.
echo 文件数量 : %COUNT%
echo 输出文件 : %OUTPUT_FILE%
echo.
echo ==================================================
echo.

set /p CONFIRM=确认开始合并? Y 或者 N:

if /I not "%CONFIRM%"=="Y" goto MENU

echo.
echo 正在调用 FFmpeg 进行无损合并 已经开启 Debug 详细日志...

"%FFMPEG%" -loglevel debug -f concat -safe 0 -i "%LIST_FILE%" -c copy -y "%OUTPUT_FILE%" >> "%LOG_FILE%" 2>&1

echo.
echo 合并完成！
echo.
echo 输出文件: %OUTPUT_FILE%
echo 日志文件: %LOG_FILE%
echo.

pause
goto MENU