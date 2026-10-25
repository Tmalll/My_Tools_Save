@echo off
REM 设置 BasicAuthLevel 注册表项
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\WebClient\Parameters" /v "BasicAuthLevel" /t REG_DWORD /d 2 /f
reg add "HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Common\Internet" /v "BasicAuthLevel" /t REG_DWORD /d 2 /f

REM 重启 WebClient 服务
net stop WebClient
net start WebClient

echo 注册表项已设置，WebClient 服务已重启。
pause
exit
