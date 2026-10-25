echo off

echo 设置当前系统【年月】格式
reg add "HKEY_CURRENT_USER\Control Panel\International" /v sYearMonth /t REG_SZ /d "yyyy'年'MM'月'" /f

echo 设置当前系统【短日期】格式
reg add "HKEY_CURRENT_USER\Control Panel\International" /v sShortDate /t REG_SZ /d "yyyy_MM_dd_ddd" /f

echo 设置当前系统【长日期】格式
reg add "HKEY_CURRENT_USER\Control Panel\International" /v sLongDate /t REG_SZ /d "yyyy'年'MM'月'dd'日' dddd" /f


echo 设置当前系统【时间】格式
reg add "HKEY_CURRENT_USER\Control Panel\International" /v sTime /t REG_SZ /d "." /f
reg add "HKEY_CURRENT_USER\Control Panel\International" /v sTimeFormat /t REG_SZ /d "HH.mm.ss" /f
reg add "HKEY_CURRENT_USER\Control Panel\International" /v sShortTime /t REG_SZ /d "HH.mm" /f

echo 设置当前系统【右下角时间显示秒】
reg add "HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v ShowSecondsInSystemClock /t REG_DWORD /d "1" /f

taskkill /f /im  explorer.exe
ping /n 2 127.1>nul
start explorer.exe







