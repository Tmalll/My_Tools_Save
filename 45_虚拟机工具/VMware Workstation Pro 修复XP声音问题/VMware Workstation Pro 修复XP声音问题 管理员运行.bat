
:: 获取时间戳
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH.mm.ss"') do set "timestamp=%%i"
echo.


ren "C:\Program Files (x86)\VMware\VMware Workstation\x64\zlib1.dll" zlib1.dll-old-%timestamp%

copy "%~dp0zlib1.dll" "C:\Program Files (x86)\VMware\VMware Workstation\x64\zlib1.dll"


pause
exit

