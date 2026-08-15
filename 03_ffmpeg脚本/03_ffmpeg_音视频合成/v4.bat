@echo off
setlocal enabledelayedexpansion

:: =============================================================
:: 1. 留白与淡入淡出配置 (单位：秒)
:: =============================================================
set PAD_HEAD=2
set PAD_TAIL=2

:: 淡入淡出时长配置
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
echo   音视频极速封装 - 淡入淡出渐变版
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
echo.
echo [已接收音频]: "!audioName!"
echo.
echo.
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
echo.
echo [已接收视频]: "!videoName!"
echo.
echo.
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
echo [4] 渐变设置: 淡入 !FADE_IN_TIME! 秒, 淡出 !FADE_OUT_TIME! 秒
echo [5] 临时音频: "!tempAudio!"
echo [6] 最终输出: "!outputName!"
echo ===================================================
echo.
pause

:: =============================================================
:: 步骤 1：处理音频 (淡入渐变 + 淡出渐变 + 前后留白)
:: =============================================================
echo.
echo [步骤 1/2] 正在处理音频轨 - 应用淡入淡出及留白...
echo.

:: 滤镜链说明：
:: 1. afade=t=in:ss=0:d=!FADE_IN_TIME! -> 正向淡入 !FADE_IN_TIME! 秒
:: 2. areverse -> 倒放音频
:: 3. afade=t=in:ss=0:d=!FADE_OUT_TIME! -> 对倒放后的开头（即原结尾）淡入 !FADE_OUT_TIME! 秒
:: 4. areverse -> 再次倒放恢复正常，实现精准结尾淡出
:: 5. [0:a][main][1:a]concat=n=3:v=0:a=1 -> 拼接 [前静音] + [渐变音频] + [后静音]

"%ffmpegPath%" -y ^
  -f lavfi -t !PAD_HEAD! -i "anullsrc=r=48000:cl=stereo" ^
  -f lavfi -t !PAD_TAIL! -i "anullsrc=r=48000:cl=stereo" ^
  -i "!audioName!" ^
  -filter_complex "[2:a]afade=t=in:ss=0:d=!FADE_IN_TIME!,areverse,afade=t=in:ss=0:d=!FADE_OUT_TIME!,areverse[main];[0:a][main][1:a]concat=n=3:v=0:a=1[aout]" ^
  -map "[aout]" ^
  -c:a aac -b:a 320k ^
  "!tempAudio!" 2> "!logFile!"

if !errorlevel! neq 0 (
    echo.
    echo [错误] 步骤 1 音频处理失败
    echo 请查看同目录下的日志文件: "!logFile!"
    pause
    exit /b
)

echo [步骤 1 完成] 带有渐变与留白的临时音频已成功生成
echo.

:: =============================================================
:: 步骤 2：视频循环与极速无损封装 (Copy 模式)
:: =============================================================
echo [步骤 2/2] 正在合并视频与临时音频 - 极速无损 Copy ...
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
    echo 处理完全成功
    echo 最终输出文件: "!outputName!"
    echo 调试日志文件: "!logFile!" 已保留
    echo 临时音频文件: "!tempAudio!" 已保留
    echo ===================================================
) else (
    echo.
    echo [错误] 步骤 2 封装失败, 退出代码: !errorlevel!
)

pause
exit /b