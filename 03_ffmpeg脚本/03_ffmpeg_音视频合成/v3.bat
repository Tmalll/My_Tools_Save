@echo off
setlocal enabledelayedexpansion

:: =============================================================
:: 留白配置 (单位：秒)
:: =============================================================
set PAD_HEAD=2
set PAD_TAIL=3

:: 1. 寻找 ffmpeg.exe
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
echo   音视频极速封装 (分步调试版 - 保留所有临时文件)
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
pause

:: 定义临时文件与最终文件路径
set "logFile=%~dp0ffmpeg_duration.tmp"
set "tempAudio=%~dp0temp_padded_audio.mkv"

for %%A in ("!audioName!") do set "audioTitle=%%~nA"
for %%B in ("!audioTitle!") do set "cleanTitle=%%~nB"
if "!cleanTitle!"=="" set "cleanTitle=!audioTitle!"
set "outputName=%~dp0!cleanTitle!_output.mkv"

cls
echo ===================================================
echo               确认执行步骤与路径
echo ===================================================
echo [1] 输入音频: "!audioName!"
echo [2] 背景视频: "!videoName!"
echo [3] 留白设置: 前留白 !PAD_HEAD! 秒, 后留白 !PAD_TAIL! 秒
echo [4] 临时音频: "!tempAudio!"
echo [5] 最终输出: "!outputName!"
echo ===================================================
echo.
pause

:: =============================================================
:: 步骤 1：处理音频 (增加前留白与后留白，生成 temp_padded_audio.mkv)
:: =============================================================
echo.
echo [步骤 1/2] 正在处理音频轨 (添加前后留白)...
echo.

"%ffmpegPath%" -y ^
  -f lavfi -t !PAD_HEAD! -i "anullsrc=r=48000:cl=stereo" ^
  -i "!audioName!" ^
  -f lavfi -t !PAD_TAIL! -i "anullsrc=r=48000:cl=stereo" ^
  -filter_complex "[0:a][1:a][2:a]concat=n=3:v=0:a=1[aout]" ^
  -map "[aout]" ^
  -c:a aac -b:a 320k ^
  "!tempAudio!" 2> "!logFile!"

if !errorlevel! neq 0 (
    echo.
    echo [错误] 步骤 1 音频处理失败！
    echo 请查看同目录下的日志文件: "!logFile!"
    pause
    exit /b
)

echo [步骤 1 完成] 带有留白的临时音频已成功生成！
echo.

:: =============================================================
:: 步骤 2：视频循环与极速无损封装 (Copy 模式)
:: =============================================================
echo [步骤 2/2] 正在合并视频与临时音频 (极速无损 Copy)...
echo.

"%ffmpegPath%" -y ^
  -stream_loop -1 -i "!videoName!" ^
  -i "!tempAudio!" ^
  -map 0:v:0 -map 1:a:0 ^
  -c:v copy -c:a copy ^
  -shortest ^
  "!outputName!"

if !errorlevel! equ 0 (
    echo.
    echo ===================================================
    echo 处理完全成功！
    echo 最终输出文件: "!outputName!"
    echo 调试日志文件: "!logFile!" 已保留
    echo 临时音频文件: "!tempAudio!" 已保留
    echo ===================================================
) else (
    echo.
    echo [错误] 步骤 2 封装失败！退出代码: !errorlevel!
)

pause
exit /b