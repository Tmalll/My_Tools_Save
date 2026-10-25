@echo off
setlocal enabledelayedexpansion

:: =============================================================
:: 1. 留白与淡入淡出配置 (单位：秒)
:: =============================================================
set PAD_HEAD=2
set PAD_TAIL=2
set FADE_IN_TIME=2
set FADE_OUT_TIME=2

:: 寻找 ffmpeg.exe
where ffmpeg >nul 2>nul
if !errorlevel! equ 0 (
    set "ffmpegPath=ffmpeg"
    echo [信息] 使用系统 PATH 中的 ffmpeg
) else if exist "%~dp0ffmpeg.exe" (
    set "ffmpegPath=%~dp0ffmpeg.exe"
    echo [信息] 系统 PATH 未找到 ffmpeg，使用当前目录版本
) else (
    echo [错误] 找不到 ffmpeg.exe。
    echo 请将其添加到系统环境变量或放入脚本所在目录。
    pause
    exit /b
)

echo.
echo ===================================================
echo   音视频极速封装 - 简洁日志与复用版
echo ===================================================
echo.

:: =============================================================
:: 2. 获取文件路径
:: =============================================================

:: ---- 获取音频 ----
if "%~1" neq "" (
    set "audioName=%~1"
) else (
    echo 请将【音频文件】拖拽到本窗口中，然后按回车：
    set /p "audioName="
)
set "audioName=!audioName:"=!"
if not exist "!audioName!" (
    echo [错误] 音频文件不存在。
    pause
    exit /b
)
echo [已接收音频]: "!audioName!"
echo.

:: ---- 获取视频 ----
if "%~2" neq "" (
    set "videoName=%~2"
) else (
    echo 请将【视频背景文件】拖拽到本窗口中，然后按回车：
    set /p "videoName="
)
set "videoName=!videoName:"=!"
if not exist "!videoName!" (
    echo [错误] 视频文件不存在。
    pause
    exit /b
)
echo [已接收视频]: "!videoName!"
echo.

:: 定义输出文件与统一日志路径
for %%A in ("!audioName!") do set "audioTitle=%%~nA"
for %%B in ("!audioTitle!") do set "cleanTitle=%%~nB"
if "!cleanTitle!"=="" set "cleanTitle=!audioTitle!"

set "outputName=%~dp0!cleanTitle!_output.mkv"
set "logFile=!outputName!.log"
set "tempAudio=%~dp0temp_padded_audio.mkv"

cls
echo ===================================================
echo               确认执行步骤与路径
echo ===================================================
echo [1] 输入音频: "!audioName!"
echo [2] 背景视频: "!videoName!"
echo [3] 留白设置: 前留白 !PAD_HEAD! 秒, 后留白 !PAD_TAIL! 秒
echo [4] 渐变设置: 淡入 !FADE_IN_TIME! 秒, 淡出 !FADE_OUT_TIME! 秒
echo [5] 临时音频: "!tempAudio!"
echo [6] 最终输出: "!outputName!"
echo [7] 运行日志: "!logFile!"
echo ===================================================
echo.

:: =============================================================
:: 3. 模式选择器
:: =============================================================
echo 请选择处理模式:
echo [1] 极速处理: 添加留白 + 淡入淡出渐变 (FLAC 无损转码)
echo [2] 直通模式: 跳过留白渐隐, 直接使用原音频进行 Copy 封装
echo.
set /p "userChoice=请输入数字 (1 或 2) 后按回车: "

if "!userChoice!"=="2" goto MODE_DIRECT_COPY

:: =============================================================
:: 模式 1：音频处理 (留白 + 渐变)
:: =============================================================
:MODE_PADDED_FADE
echo.
echo [步骤 1/2] 正在极速处理音频轨 (优化滤镜 + 留白渐变)...
echo.

:: 初始化日志文件
echo =================================================== > "!logFile!"
echo   任务启动时间: %date% %time% >> "!logFile!"
echo   模式: 模式 1 (留白 + 淡入淡出) >> "!logFile!"
echo =================================================== >> "!logFile!"
echo. >> "!logFile!"
echo === [步骤 1: 音频处理] === >> "!logFile!"

:: 使用 ffprobe/ffmpeg 解析时长
"%ffmpegPath%" -i "!audioName!" 2>> "!logFile!"
for /f "tokens=2-4 delims=:., " %%a in ('findstr /i "Duration" "!logFile!"') do (
    set /a "h=1%%a-100", "m=1%%b-100", "s=1%%c-100"
    set /a "total_sec=h*3600 + m*60 + s"
)

if "!total_sec!"=="" (
    echo [提示] 无法自动解析精确时长，切换至通用滤镜模式...
    set "filterCmd=[2:a]afade=t=in:ss=0:d=!FADE_IN_TIME!,areverse,afade=t=in:ss=0:d=!FADE_OUT_TIME!,areverse[main];[0:a][main][1:a]concat=n=3:v=0:a=1[aout]"
) else (
    set /a "out_start=total_sec - FADE_OUT_TIME"
    if !out_start! lss 0 set "out_start=0"
    set "filterCmd=[2:a]afade=t=in:ss=0:d=!FADE_IN_TIME!,afade=t=out:st=!out_start!:d=!FADE_OUT_TIME![main];[0:a][main][1:a]concat=n=3:v=0:a=1[aout]"
)

:: 导出临时无损 FLAC 音频
"%ffmpegPath%" -y ^
  -f lavfi -t !PAD_HEAD! -i "anullsrc=r=48000:cl=stereo" ^
  -f lavfi -t !PAD_TAIL! -i "anullsrc=r=48000:cl=stereo" ^
  -i "!audioName!" ^
  -filter_complex "!filterCmd!" ^
  -map "[aout]" ^
  -c:a flac ^
  "!tempAudio!" 2>> "!logFile!"

if !errorlevel! neq 0 (
    echo.
    echo [错误] 步骤 1 音频处理失败！
    echo 请查看日志文件: "!logFile!"
    pause
    exit /b
)

echo [步骤 1 完成] 带有渐变与留白的临时音频已成功生成！
echo.

:: 重新指定合成所用的目标音频
set "targetAudio=!tempAudio!"
goto MERGE_VIDEO_AUDIO

:: =============================================================
:: 模式 2：直通模式变量设置
:: =============================================================
:MODE_DIRECT_COPY
echo.
echo [模式 2] 已选择无损直通模式 (Direct Copy)...
echo.

:: 初始化日志文件
echo =================================================== > "!logFile!"
echo   任务启动时间: %date% %time% >> "!logFile!"
echo   模式: 模式 2 (原样直通 Copy) >> "!logFile!"
echo =================================================== >> "!logFile!"

set "targetAudio=!audioName!"

:: =============================================================
:: 统一封装入口 (模式 1 与 模式 2 复用)
:: =============================================================
:MERGE_VIDEO_AUDIO
echo [合成步骤] 正在合并视频与音频 (极速无损 Copy)...
echo.

echo. >> "!logFile!"
echo === [步骤 2: 音视频合成封装] === >> "!logFile!"

"%ffmpegPath%" -y ^
  -stream_loop -1 -i "!videoName!" ^
  -i "!targetAudio!" ^
  -map 0:v:0 -map 1:a:0 ^
  -c:v copy -c:a copy ^
  -shortest ^
  "!outputName!" 2>> "!logFile!"

if !errorlevel! equ 0 (
    echo.
    echo ===================================================
    echo 处理完全成功！
    echo 最终输出文件: "!outputName!"
    echo 详细运行日志: "!logFile!"
    if exist "!tempAudio!" echo 临时音频文件: "!tempAudio!" 已保留
    echo ===================================================
) else (
    echo.
    echo [错误] 合成失败，退出代码: !errorlevel!
    echo 详细错误日志请查看: "!logFile!"
)

pause
exit /b