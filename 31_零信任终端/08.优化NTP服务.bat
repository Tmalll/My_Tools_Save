@echo off

:: ===== 提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

:优化NTP
echo 修改注册表, 优化NTP同步间隔...
:: 调整最大同步间隔
   reg add "HKLM\SYSTEM\CurrentControlSet\Services\W32Time\Config" /v MaxPosPhaseCorrection /t REG_DWORD /d 4294967295 /f
   reg add "HKLM\SYSTEM\CurrentControlSet\Services\W32Time\Config" /v MaxNegPhaseCorrection /t REG_DWORD /d 4294967295 /f
:: 调整同步间隔
   reg add "HKLM\SYSTEM\CurrentControlSet\Services\W32Time\TimeProviders\NtpClient" /v SpecialPollInterval /t REG_DWORD /d 300 /f
:: 取消失败间隔
::    REG DELETE "HKLM\SYSTEM\CurrentControlSet\Services\W32Time\Config" /v HoldPeriod /f
::    reg add "HKLM\SYSTEM\CurrentControlSet\Services\W32Time\Config" /v HoldPeriod /t REG_DWORD /d 0 /f
echo.

echo 指定NTP服务器为 192.168.1.20,0x8
w32tm /config /manualpeerlist:"192.168.1.20,0x8" /syncfromflags:manual /update
:: 0x9 = 特殊轮询模式
:: 0x8 = 客户端模式（推荐手动配置）
echo.

pause && cls

echo 设置服务自动启动
sc config w32time start= auto
sc failure w32time reset= 0 actions= restart/60000/restart/180000/restart/300000
echo.

echo 重启 w32tm 服务
net stop w32time || sc stop w32time
echo.
timeout /t 2 > NUL
net start w32time || sc start w32time
echo.

pause && cls

echo 重新开始同步, 并且检查同步状态
w32tm /resync
w32tm /query /status
echo.

pause && cls

echo 检查NTP设置
w32tm /query /configuration
echo.

pause && cls

echo 测试NTP服务器
w32tm /stripchart /computer:192.168.1.33 /samples:3 /dataonly
pause && cls
w32tm /stripchart /computer:192.168.1.20 /samples:3 /dataonly
pause && cls
w32tm /stripchart /computer:ntp.aliyun.com /samples:3 /dataonly

pause
exit
:: ---------- ---------- ---------- 万恶的脚本结束分割线 ---------- ---------- ----------
:: ---------- ---------- ---------- 万恶的脚本结束分割线 ---------- ---------- ----------
:: ---------- ---------- ---------- 万恶的脚本结束分割线 ---------- ---------- ----------



echo 优化NTP服务, 解除123端口监听.
reg add "HKLM\SYSTEM\CurrentControlSet\Services\W32Time\TimeProviders\NtpServer" /v Enabled /t REG_DWORD /d 0 /f 
sc stop W32Time 
sc start W32Time


:: w32tm /register
:: w32tm /unregister




:: 测试NTP服务器

w32tm /stripchart /computer:192.168.1.33 /samples:5 /dataonly

netsh advfirewall firewall add rule name="NTP 123" dir=out action=allow protocol=UDP remoteport=123 remoteip=localsubnet

for /l %i in (1,1,20) do @w32tm /stripchart /computer:192.168.1.33 /samples:1 /dataonly

for /l %i in (1,1,20) do @w32tm /stripchart /computer:192.168.1.20 /samples:1 /dataonly


w32tm /stripchart /computer:192.168.1.33 /samples:10 /packetinfo
w32tm /stripchart /computer:192.168.1.20 /samples:10 /packetinfo




net stop w32time
net start w32time



w32tm /config /manualpeerlist:"192.168.1.33,0x8" /syncfromflags:manual /update
w32tm /config /manualpeerlist:"ntp.aliyun.com,0x8" /syncfromflags:manual /update

w32tm /config /manualpeerlist:"192.168.1.20,0x8" /syncfromflags:manual /update


w32tm /resync /rediscover

w32tm /resync /force

w32tm /debug /disable


w32tm /config /manualpeerlist:"192.168.1.20,0x8" /syncfromflags:manual /update
net stop w32time
net start w32time
w32tm /resync






w32tm /resync /force













