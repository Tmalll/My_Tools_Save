@echo off

net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

start "本地计算机证书" certlm.msc 


start "当前用户证书" certmgr.msc 


exit
