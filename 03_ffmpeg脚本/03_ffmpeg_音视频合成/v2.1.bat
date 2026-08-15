@echo off
setlocal enabledelayedexpansion

:: =============================================================
:: 1. 寻找 ffmpeg.exe 的位置 (优先系统 PATH，后找当前目录)
:: =============================================================
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
echo     音视频极速无损封装脚本 (MKV 万能无损直通版)
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
:: 3. 设置输出路径 (固定在脚本所在目录 %~dp0，清理多重扩展名)
:: =============================================================
for %%A in ("!audioName!") do set "audioTitle=%%~nA"

:: 如果文件名包含 .mkv.mp4 这种双扩展名，再次清理一次后缀
for %%B in ("!audioTitle!") do set "cleanTitle=%%~nB"
if "!cleanTitle!"=="" set "cleanTitle=!audioTitle!"

set "outputName=%~dp0!cleanTitle!_output.mkv"

cls
echo ===================================================
echo 请核对以下文件路径，确认无误后按任意键开始转换：
echo.
echo [音频文件]: "!audioName!"
echo [视频背景]: "!videoName!"
echo [输出路径]: "!outputName!"
echo ===================================================
echo.
pause

:: =============================================================
:: 4. 执行 FFmpeg 极速封装 (MKV 容器 + 双 Copy)
:: =============================================================
echo.
echo 正在极速封装中...
echo.

"%ffmpegPath%" -y -stream_loop -1 -i "!videoName!" -i "!audioName!" -map 0:v:0 -map 1:a:0 -c:v copy -c:a copy -shortest "!outputName!"

:: 修正：使用 !errorlevel! 准确读取 FFmpeg 的退出码
if !errorlevel! equ 0 (
    echo.
    echo ===================================================
    echo 处理完成！(已保存至脚本所在目录)
    echo 输出文件: "!outputName!"
    echo ===================================================
) else (
    echo.
    echo [错误] 封装失败！退出代码: !errorlevel!
)

pause
exit /b