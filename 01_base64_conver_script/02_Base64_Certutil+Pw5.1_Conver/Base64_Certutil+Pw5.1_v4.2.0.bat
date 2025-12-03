@echo off
setlocal enabledelayedexpansion

:: ================= 用户参数 =================
set maxThreads=5

if "%~1"=="" (
    echo 请把文件拖放到此脚本上
    pause
    exit /b
)

:: 清理作业文件夹
if exist ".jobs" rd /s /q ".jobs"
mkdir ".jobs"

:: ================= 记录开始时间 =================
for /f %%T in ('powershell -NoProfile -Command "[int64](Get-Date).ToUniversalTime().Ticks/10000"') do set startTime=%%T

:: ================= 初始化文件队列 =================
set fileIndex=0
for %%F in (%*) do (
    if /I "%%~xF"==".b64" (
        set /a fileIndex+=1
        set "file[!fileIndex!]=%%~fF"
    )
)
set totalFiles=%fileIndex%
set currentIndex=1

:: ================= 并行解码循环 =================
:decodeLoop
set active=0
for %%J in (.jobs\*.tmp) do set /a active+=1

:: 启动新任务直到达到 maxThreads 或没有剩余文件
:fillSlots
if !active! GEQ %maxThreads% goto waitNext
if !currentIndex! GTR %totalFiles% goto waitNext

set "fullpath=!file[%currentIndex%]!"
set "filename=!fullpath:.b64=!"
set "jobfile=.jobs\!currentIndex!.tmp"
type nul > "!jobfile!"

echo 解码中: !fullpath!
start "" /min cmd /c "certutil -f -decode "!fullpath!" "!filename!" >NUL 2>&1 && del ""!jobfile!"" && echo 解码完成: !fullpath!"

set /a currentIndex+=1
set /a active+=1
goto fillSlots

:waitNext
:: 等待任意子任务完成
if !active! GTR 0 (
    pathping -p 100 -q 1 localhost >nul
    echo 检测子任务
    goto decodeLoop
)

:: ================= 所有任务完成 =================
echo.
powershell -NoProfile -Command "$elapsed=[int64](Get-Date).ToUniversalTime().Ticks/10000 - %startTime%; Write-Host ('总计耗时 {0:F3} 秒' -f ($elapsed/1000.0))"
echo 所有文件解码完成!
pause
exit /b
