@echo off
setlocal enabledelayedexpansion

:: 最小化窗口
cd /d "%~dp0" & title %~nx0
if "%1" neq "min" start /min "" "%~f0" min & exit
:start_script
:: 这下面放最小化之后的脚本...

:: 排除当前脚本, 并且顺序运行当前目录下面其他.bat脚本
for %%f in (*.bat) do (
    if /I not "%%~nxf"=="%~nx0" (
        echo.
        echo = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
        echo.
        echo 正在运行: %%f
        echo.
        echo = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
        echo.
        call "%%f"
        echo.
    )
)

echo 所有其他脚本已执行完毕, 10秒后退出脚本.
echo.
timeout /t 10
:: pause
exit
