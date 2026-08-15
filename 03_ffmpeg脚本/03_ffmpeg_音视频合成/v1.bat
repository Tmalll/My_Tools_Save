@echo off
setlocal enabledelayedexpansion

:: =============================================================
:: 1. 寻找 ffmpeg.exe 的位置 (优先系统 PATH，后找当前目录)
:: =============================================================
where ffmpeg >nul 2>nul
if %errorlevel% equ 0 (
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
echo              音视频合成处理脚本
echo ===================================================
echo.

:: =============================================================
:: 2. 获取音频与视频文件路径 (支持拖入或参数传入)
:: =============================================================

:: ---- 获取音频文件 ----
if "%~1" neq "" (
    set "audioName=%~1"
) else (
    echo 请将【音频文件】拖拽到本窗口中，然后按回车：
    set /p "audioName="
)
:: 去除输入可能自带的双引号
set "audioName=!audioName:"=!"

if not exist "!audioName!" (
    echo [错误] 音频文件不存在，请检查路径。
    pause
    exit /b
)
echo [已接收音频]: "!audioName!"
echo.
pause

:: ---- 获取视频文件 ----
if "%~2" neq "" (
    set "videoName=%~2"
) else (
    echo 请将【视频背景文件】拖拽到本窗口中，然后按回车：
    set /p "videoName="
)
:: 去除输入可能自带的双引号
set "videoName=!videoName:"=!"

if not exist "!videoName!" (
    echo [错误] 视频文件不存在，请检查路径。
    pause
    exit /b
)
echo [已接收视频]: "!videoName!"
echo.
pause

:: =============================================================
:: 3. 最终确认路径
:: =============================================================
cls
echo ===================================================
echo 请核对以下文件路径，确认无误后按任意键开始转换：
echo.
echo [音频文件]: "!audioName!"
echo [视频背景]: "!videoName!"
echo ===================================================
echo.
pause

:: 设置输出文件路径（在音频同目录下生成 _output.mp4）
for %%A in ("!audioName!") do (
    set "outputName=%%~dpnA_output.mp4"
)

:: =============================================================
:: 4. 执行 FFmpeg 转码合成
:: =============================================================
:: 参数说明：
:: -stream_loop -1 : 对输入的视频流进行无限循环
:: -i "!videoName!": 输入视频背景
:: -i "!audioName!": 输入音频流
:: -map 0:v:0      : 取第一个输入的视频轨
:: -map 1:a:0      : 取第二个输入的音频轨
:: -c:v libx264    : H.264 视频编码
:: -crf 24         : 画质与体积平衡
:: -preset veryfast: 快速转码
:: -pix_fmt yuv420p: 标准色彩空间，兼容各大视频网站
:: -c:a copy       : 音频直接复制流（无需重新编码，保持原质）
:: -shortest       : 当最短的流（这里是音频）结束时自动停止转码
:: -movflags +faststart: 优化网络播放
:: =============================================================

echo.
echo 正在处理中，请稍候...
echo.

"%ffmpegPath%" -y -stream_loop -1 -i "!videoName!" -i "!audioName!" -map 0:v:0 -map 1:a:0 -c:v libx264 -crf 24 -preset veryfast -pix_fmt yuv420p -c:a copy -shortest -movflags +faststart "!outputName!"

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo 处理成功！
    echo 输出文件: "!outputName!"
    echo ===================================================
) else (
    echo.
    echo [错误] 合成失败，请检查视频/音频文件格式是否兼容。
)

pause
exit /b