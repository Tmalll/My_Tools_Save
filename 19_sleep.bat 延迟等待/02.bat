@echo off
setlocal enabledelayedexpansion

::===========================
:: 配置区
::===========================
:: 总计时秒数
set SECONDS=10

:: 计时间隔
set interval=100

:: 间隔类型, 可选 s / ms
set type=ms
::===========================

:: 生成退格键字符 (Backspace)，用于原地刷新
for /f "tokens=1 delims=#" %%a in ('"prompt #$H# & echo on & for %%b in (1) do rem"') do set "BS=%%a"

if /i "%type%"=="s" goto seconds_mode
if /i "%type%"=="ms" goto ms_mode

echo [错误] type 必须是 s 或 ms
exit /b

:seconds_mode
for /l %%i in (%SECONDS%,-1,1) do (
    <nul set /p "=!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!%%i 秒后脚本开始执行"
    timeout /t %interval% /nobreak >nul
)
echo.
echo 倒计时结束，开始执行脚本！
exit /b

:ms_mode
set /a totalLoops=SECONDS*1000/interval

for /l %%i in (%totalLoops%,-1,1) do (
    set /a remainMs=%%i*interval
    set /a remainSec=remainMs/1000
    set /a dotMs=remainMs %% 1000
    
    :: 构造显示字符串
    set "msg=剩余 !remainSec!.!dotMs! ms 后脚本开始执行"
    
    :: 用退格符删掉上一行（这里预留足够长的退格）
    <nul set /p "=!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!BS!!msg!"

    pathping -p %interval% -q 1 localhost >nul
)

echo.
echo 倒计时结束，开始执行脚本！
exit /b