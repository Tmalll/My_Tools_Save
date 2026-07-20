@echo off
cd /d "%~dp0" & title %~nx0

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

echo 结束后台程序...
taskkill /f /t /im #mihomo.exe
taskkill /f /t /im #mihomo.exe
taskkill /f /t /im #mihomo.exe
echo.
echo.
timeout /t 2 > NUL


echo 删除旧文件...
del /s /q "%~dp0\#core_and_data\*mihomo*.exe"
del /s /q "%~dp0\#core_and_data\geosite.dat"
del /s /q "%~dp0\#core_and_data\geoip.dat"
del /s /q "%~dp0\#core_and_data\geoip.metadb"
del /s /q "%~dp0\#core_and_data\ASN.mmdb"

echo.
echo.
timeout /t 2 > NUL

echo 链接文件...
rem mklink "%~dp0\#core_and_data\#mihomo.exe"   "C:\#mihomo_latest\#mihomo.exe"
mklink "%~dp0\#core_and_data\geosite.dat"       "C:\#mihomo_latest\geosite.dat"
mklink "%~dp0\#core_and_data\geoip.dat"         "C:\#mihomo_latest\geoip.dat"
mklink "%~dp0\#core_and_data\geoip.metadb"      "C:\#mihomo_latest\geoip.metadb"
mklink "%~dp0\#core_and_data\ASN.mmdb"          "C:\#mihomo_latest\GeoLite2-ASN.mmdb"

echo.
echo.
timeout /t 2 > NUL

echo 10秒后退出脚本...
timeout /t 10 > NUL
 
exit
