@echo off
if defined _M goto :minimize
set _M=1&start "" /min "%~f0" %*&exit
:minimize
rem ==== 这下面写脚本 ====


echo 111 > %~dp0test.txt
timeout /t 5 >nul
echo exit >> %~dp0test.txt

exit