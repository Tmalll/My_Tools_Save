@echo off
chcp 65001 >nul

set LOG=%~dp0IE_Component_Check.txt

echo ============================= > "%LOG%"
echo Windows Version >> "%LOG%"
echo ============================= >> "%LOG%"
ver >> "%LOG%"

echo. >> "%LOG%"
echo ============================= >> "%LOG%"
echo DISM Version >> "%LOG%"
echo ============================= >> "%LOG%"
dism /? | findstr /i "°æ±¾ Version" >> "%LOG%"


echo. >> "%LOG%"
echo ============================= >> "%LOG%"
echo FEATURES >> "%LOG%"
echo ============================= >> "%LOG%"
dism /online /get-features >> "%LOG%" 2>&1


echo. >> "%LOG%"
echo ============================= >> "%LOG%"
echo CAPABILITIES >> "%LOG%"
echo ============================= >> "%LOG%"
dism /online /get-capabilities >> "%LOG%" 2>&1


echo. >> "%LOG%"
echo ============================= >> "%LOG%"
echo PACKAGES Internet Explorer >> "%LOG%"
echo ============================= >> "%LOG%"
dism /online /get-packages | findstr /i "Internet Explorer Browser IE" >> "%LOG%" 2>&1


echo. >> "%LOG%"
echo ============================= >> "%LOG%"
echo WinSxS IE Search >> "%LOG%"
echo ============================= >> "%LOG%"
dir C:\Windows\WinSxS /b | findstr /i "ie explorer internet browser" >> "%LOG%" 2>&1


echo.
echo Íê³É:
echo %LOG%

pause