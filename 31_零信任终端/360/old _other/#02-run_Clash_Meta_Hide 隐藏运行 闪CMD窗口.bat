@echo off

:: 自动提权
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

:: 隐藏运行
if "%1" == "h" goto begin
mshta vbscript:createobject("wscript.shell").run("""%~nx0"" h",0)(window.close)&&exit
:begin
:: 这下面放要运行的脚本...

"%~dp0\#01-run_Clash_Meta.bat"



exit



















pause
pathping -p 10000 -q 1 localhost >nul
