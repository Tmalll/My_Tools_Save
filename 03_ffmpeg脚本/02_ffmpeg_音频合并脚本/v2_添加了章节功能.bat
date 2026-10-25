@echo off
chcp 65001 > nul
setlocal EnableDelayedExpansion

:: 输出文件名, 其扩展名要和被转换的文件一致
set "OUTPUT_NAME=output.webm"

rem 默认硬编码的输入目录（留空则自动使用脚本当前所在目录）
set "DEFAULT_DIR="

:: 指定程序位置
set "FFMPEG=ffmpeg.exe"
set "FFPROBE=ffprobe.exe"

set "DROP_PATH=%~1"
if "%DROP_PATH%"=="" goto USE_DEFAULT
cd /d "%DROP_PATH%" 2>nul
if "%ERRORLEVEL%"=="0" set "INPUT_DIR=%DROP_PATH%"
if "%ERRORLEVEL%"=="0" goto PATH_DONE
set "INPUT_DIR=%~dp1"
goto PATH_DONE

:USE_DEFAULT
if "%DEFAULT_DIR%"=="" set "INPUT_DIR=%~dp0"
if not "%DEFAULT_DIR%"=="" set "INPUT_DIR=%DEFAULT_DIR%"

:PATH_DONE
if "%INPUT_DIR:~-1%"=="\" set "INPUT_DIR=%INPUT_DIR:~0,-1%"
set "OUTPUT_DIR=%INPUT_DIR%\Merge_Output"
set "LIST_FILE=%OUTPUT_DIR%\output_list.txt"
set "OUTPUT_FILE=%OUTPUT_DIR%\%OUTPUT_NAME%"

rem 创建输出目录
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

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
echo (1) 生成列表文件 &
echo (2) 开始合并 &
echo (3) 查看列表文件 &
echo (4) 打开输出目录 &
echo (5) 打开源文件目录 &
echo (0) 退出 &

echo.
echo ==================================================
echo.

set /p CHOICE=请输入选项:

if "%CHOICE%"=="1" goto BUILD_LIST
if "%CHOICE%"=="2" goto MERGE
if "%CHOICE%"=="3" goto VIEW_LIST
if "%CHOICE%"=="4" goto DIR_OUTPUT
if "%CHOICE%"=="5" goto DIR_INPUT
if "%CHOICE%"=="0" exit

goto MENU

rem ==================================================
rem 生成列表
rem ==================================================

:BUILD_LIST

echo.
echo 正在生成列表...
echo.

:: 重置列表文件
echo. > %LIST_FILE%


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

:DIR_OUTPUT

explorer "%OUTPUT_DIR%"
goto MENU


:DIR_INPUT
explorer "%INPUT_DIR%"
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

echo ==================================================
echo 即将开始合并 并自动注入源文件名作为章节
echo ==================================================
echo.
echo 文件数量 : %COUNT%
echo 输出文件 : %OUTPUT_FILE%
echo.
echo ==================================================
echo.

echo.
echo 正在分析视频时长并生成章节元数据...

rem 定义元数据临时文件路径
set "META_FILE=%OUTPUT_DIR%\meta.txt"
echo. > %META_FILE%

rem 核心修正：解除嵌套调用。直接在同一个 PS 环境中通过 & 符号调用批处理传入的 %FFPROBE% 变量，杜绝引号冲突
powershell -NoProfile -ExecutionPolicy Bypass "$utf8 = New-Object System.Text.UTF8Encoding $false; $lines = @(';FFMETADATA1'); $curr = 0; Get-ChildItem -LiteralPath '%INPUT_DIR%' -File | Sort-Object Name | ForEach-Object { $seconds = & '%FFPROBE%' -v quiet -show_entries format=duration -of csv=p=0 $_.FullName; $ms = [int64]([double]$seconds * 1000); $lines += '[CHAPTER]'; $lines += 'TIMEBASE=1/1000'; $lines += 'START=' + $curr; $curr += $ms; $lines += 'END=' + $curr; $lines += 'title=' + $_.BaseName; }; [System.IO.File]::WriteAllLines('%META_FILE%', $lines, $utf8)"

echo.
echo.
echo 正在调用 FFmpeg 进行合并并注入章节...

set "LOG_FILE=%OUTPUT_DIR%\merge.log"
echo. > %LOG_FILE%
del %OUTPUT_FILE% /s

rem 执行合并
"%FFMPEG%" -loglevel level+info -f concat -safe 0 -i "%LIST_FILE%" -i "%META_FILE%" -map_metadata 1 -c copy -y "%OUTPUT_FILE%" >> "%LOG_FILE%" 2>&1

echo.
echo 合并完成！章节已成功写入。
echo.
echo 输出文件: %OUTPUT_FILE%
echo 日志文件: %LOG_FILE%
echo.
explorer "%OUTPUT_DIR%"

pause
goto MENU

:: 日志 级别名称 (Argument),对应数值 (Value),说明与适用场景
:: quiet,-8,完全静默。 不输出任何信息，连严重的崩溃错误都不会显示。通常用于纯自动化脚本且不需要任何返回日志的场景。
:: panic,0,灾难级错误。 只有在发生极其严重、导致整个程序彻底崩溃且无法恢复的错误时才会输出。极其罕见。
:: fatal,8,致命错误。 发生导致当前处理任务（如解码/编码）直接中断、无法继续进行的严重错误时输出。
:: error,16,普通错误。 输出所有错误信息（包括可以跳过或容错的错误）。如果你只想在脚本报错时看到提示，这是最推荐的级别。
:: warning,24,警告信息。 输出所有错误和警告（例如：某些不规范的文件头、丢弃了损坏的帧、时间戳错乱等，但 FFmpeg 仍会尝试继续处理）。
:: info,32,默认级别。 输出版本 Banner、配置参数、流信息以及运行时的常规统计（如速度、帧率、比特率）。
:: verbose,40,冗长信息。 类似于 info，但会吐出更多关于选择的解码器、滤镜配置、以及媒体流更详细的底层探测信息。
:: debug,48,调试级别。 打印所有底层逻辑信息。会把每一个数据包（Packet）、每一帧的组装和同步细节全部记录下来。排查合并翻车（如音视频不同步、Invalid data 报错）时的首选。
:: trace,56,追踪级别。 比 debug 还要疯狂，会把底层内存分配、十六进制打印等最原始的底层 API 调用全部吐出来。日志体积会以极快的速度暴涨。






















