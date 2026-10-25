@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
echo 开始执行 [ %~nx0 ]
title [ %~nx0 ]
echo.

:: 最小化窗口
cd /d "%~dp0" & title %~nx0
if "%1" neq "min" start /min "" "%~f0" min & exit
:start_script
:: 这里放后续脚本...

:: 日志文件路径
set "LOGpath=E:\01.userData\ZhuoMian\"

:: 自动运行脚本目录下面的.bat文件...
for %%f in (*.bat) do (

    :: 排除列表
    set "Skip="
    for %%i in (
        "%~nx0"
        "*.bat-dis"
        "测试.bat"
        "模板.bat"
        "备份.bat"
        "旧版脚本.bat"
    ) do (
        if /I "%%~nxf"=="%%~i" set "Skip=1"
    )

    :: 运行核心
    if not defined Skip (
        echo.
        echo = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
        echo.
        echo 正在运行: %%f
        echo.
        echo = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
        echo.
        timeout /t 1 > NUL
        start /min "" cmd /c ""%%f" > "%LOGpath%%%~nf.log" 2>&1"
        echo.
    )
)

echo 所有 [ Rclone 同步脚本 ] 已执行完毕, 10秒后退出脚本.
echo.
timeout /t 10
:: pause
exit

/B /WAIT

/WAIT

/min






