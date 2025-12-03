@echo off
setlocal enabledelayedexpansion


echo.
echo.
title coreutils_Conver
echo coreutils_Conver
echo.
echo 编码限制: 
echo 解码限制: 
echo.
echo.


:: 检查是否有拖放文件
if "%~1"=="" (
    echo 请把文件拖放到此脚本上
    pause
    exit /b
)

:: 记录开始时间（毫秒时间戳）
for /f %%T in ('powershell -NoProfile -Command "[Environment]::TickCount"') do set startTime=%%T

:: 遍历所有拖放文件
for %%F in (%*) do (
    set "fullpath=%%~fF"
    set "filename=%%~nxF"
    set "ext=%%~xF"
    
    if /i "!ext!"==".b64" (
        
        echo 解码中: "%%F"
        coreutils.exe base64 -d  "%%~fF" > "%%~dpnF"
        echo 解码完成: "%%~dpnF"
        
    ) else (
        
        echo 编码中: "%%~dpnF"
        set "outfile=%%~dpnxF.b64"
        coreutils.exe base64 -w=0 "%%~fF" > "!outfile!"
        echo 编码完成: "!outfile!"
        
    )
)

:: 记录结束时间（毫秒时间戳）
for /f %%T in ('powershell -NoProfile -Command "[Environment]::TickCount"') do set endTime=%%T
:: 计算耗时（毫秒）
set /a elapsedMs=endTime-startTime
:: 转换成秒.毫秒格式
set /a seconds=elapsedMs / 1000
set /a millis=elapsedMs %% 1000
:: 格式化毫秒为3位
if !millis! lss 10  set "millis=00!millis!"
if !millis! lss 100 set "millis=0!millis!"
echo 所有文件处理完成!
echo 总耗时: !seconds!.!millis! 秒
timeout /t 5 >nul
pause
exit
