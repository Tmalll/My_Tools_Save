@echo off
if "%1" == "h" goto begin
mshta vbscript:createobject("wscript.shell").run("""%~nx0"" h",0)(window.close)&&exit
:begin
REM

taskkill /f /t /im aria2c-Local.exe
aria2c-Local.exe --conf-path=aria2.conf