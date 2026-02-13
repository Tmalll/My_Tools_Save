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

if /i "%type%"=="s" goto seconds_mode
if /i "%type%"=="ms" goto ms_mode

echo [错误] type 必须是 s 或 ms
exit /b


::========================================
:: 秒级倒计时模式
::========================================
:seconds_mode
for /l %%i in (%SECONDS%,-1,1) do (
    echo %%i 秒后脚本开始执行
    timeout /t %interval% /nobreak >nul
)
echo 倒计时结束，开始执行脚本！
exit /b


::========================================
:: 毫秒级倒计时模式
::========================================
:ms_mode
:: 计算总循环次数 = 秒数 * 1000 / interval
set /a totalLoops=SECONDS*1000/interval

for /l %%i in (%totalLoops%,-1,1) do (
    set /a remainMs=%%i*interval
    set /a remainSec=remainMs/1000

    echo 剩余 !remainSec!.!remainMs! ms 后脚本开始执行

    :: pathping 延时
    pathping -p %interval% -q 1 localhost >nul
)

echo 倒计时结束，开始执行脚本！
exit /b
