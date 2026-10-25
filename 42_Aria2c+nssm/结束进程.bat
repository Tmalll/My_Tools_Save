@echo off

echo 结束程序进程
:: taskkill /f /t /im Aria2c-Local.exe
taskkill /im Aria2c-Local.exe
pathping -p 100 -q 1 localhost >nul

exit




