@echo off
chcp 936 >nul
setlocal enabledelayedexpansion

title 视频转码工具 (FFmpeg -> MP4 H.264/AAC)

echo ========================================================
echo                  视频批量转码工具
echo ========================================================
echo.

where ffmpeg >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 ffmpeg，请确保已将 ffmpeg 添加到系统环境变量 PATH 中！
    goto end
)

echo [信息] ffmpeg 检查通过。
echo.

if "%~1"=="" (
    echo [提示] 请将视频文件或包含视频的文件夹拖放到此脚本图标上！
    goto end
)

for %%A in (%*) do (
    call :ProcessItem "%%~A"
)

goto end

:ProcessItem
set "target=%~1"

if exist "%target%\*" (
    echo ========================================================
    echo 正在处理文件夹: %target%
    echo ========================================================
    
    set "outDir=%target%\output"
    if not exist "!outDir!" mkdir "!outDir!"
    
    :: 遍历文件夹内所有文件，不限制格式，交由 ffmpeg 自动识别
    for %%F in ("%target%\*.*") do (
        call :ConvertFile "%%~fF" "!outDir!"
    )
) else if exist "%target%" (
    echo ========================================================
    echo 正在处理文件: %target%
    echo ========================================================
    
    set "fileDir=%~dp1"
    if "!fileDir:~-1!"=="\\" set "fileDir=!fileDir:~0,-1!"
    
    set "outDir=!fileDir!\output"
    if not exist "!outDir!" mkdir "!outDir!"
    
    call :ConvertFile "%target%" "!outDir!"
) else (
    echo [警告] 路径不存在或无效: %target%
)
exit /b

:ConvertFile
set "inputFile=%~1"
set "outputDir=%~2"
set "fileName=%~n1"

echo [转换中] %~nx1 -^> output\%fileName%.mp4
ffmpeg -i "%inputFile%" -c:v libx264 -crf 23 -c:a aac -b:a 192k "%outputDir%\%fileName%.mp4" -y
echo [完成]   %fileName%.mp4
echo --------------------------------------------------------
exit /b

:end
echo.
echo ========================================================
echo 所有任务处理完毕！
echo ========================================================
pause