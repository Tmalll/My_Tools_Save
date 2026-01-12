@echo off
setlocal enabledelayedexpansion

:: 设置图片文件
set "picName=176846146.jpg"
set "picNamePath=%~dp0%picName%"


:: 1. 寻找 ffmpeg.exe 的位置 (优先系统 PATH，后找当前目录)
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
    exit
)

:: 2. 检查是否有文件拖入
if "%~1"=="" (
    echo [错误] 请将音频文件拖拽到此脚本图标上执行。
    pause
    exit
)

:: 3. 获取拖入文件的路径
set "audioName=%~1"

:: 4. 验证是否为有效音频
"%ffmpegPath%" -i "%audioName%" 2> "%~dp0output.tmp"

set "isValid="
for /F "tokens=1,2,3,4,5,6 delims=:., " %%i in ('type "%~dp0output.tmp"') do (
    if "%%i"=="Duration" (
        set "isValid=1"
        call :calcLength %%j %%k %%l %%m
    )
)

:: 判定是否获取成功
if not defined isValid (
    echo [错误] 无法识别文件 "%~nx1" 的时长。
    if exist "%~dp0output.tmp" del "%~dp0output.tmp"
    pause
    exit
)

:: =============================================================
:: 核心转换逻辑：针对网站上传优化
:: =============================================================
:: -r 5: 每秒5帧，兼顾速度与拖动流畅度
:: -preset veryfast: 兼顾速度与体积
:: -crf 24: 标准画质
:: -pix_fmt yuv420p: 必须使用此格式，否则 B站/Youtube 可能黑屏或发灰
:: -movflags +faststart: 优化网络播放，视频边下载边播放
:: =============================================================
:: CRF	质量 / 体积
:: 0	无损（非常大，不推荐上传）
:: 16~18	极高质量
:: 19~23	高质量（常用区间）
:: 24~28	可接受，体积小
:: 29+	明显劣化
:: =============================================================
:: -preset：可选参数 + 含义
:: ultrafast
:: superfast
:: veryfast
:: faster
:: fast
:: medium   (默认)
:: slow
:: slower
:: veryslow
:: placebo

:: x264
"%ffmpegPath%"  -r 1 -f image2 -loop 1 -i "%picNamePath%" -i "%audioName%"   -c:a copy   -vf "scale=-2:1080,format=yuv420p"   -c:v libx264  -crf 24  -preset veryfast  -tune stillimage  -movflags +faststart  -shortest  -y "%audioName%.mp4"


:: 清理临时文件
if exist "%~dp0output.tmp" del "%~dp0output.tmp"

echo.
echo 处理完成！
echo 输出文件: "%audioName%.mp4"
pause
exit

:calcLength
set /A s=%3
set /A s=s+%2*60
set /A s=s+%1*60*60
set /A VIDEO_LENGTH_S = s+1
set /A VIDEO_LENGTH_MS = s*1000 + %4
echo Video duration %1:%2:%3.%4 = %VIDEO_LENGTH_MS%ms = %VIDEO_LENGTH_S%s
goto :EOF