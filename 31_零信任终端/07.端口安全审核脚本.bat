@echo off

:: ===== 提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

:: 把当前系统使用的端口和连接输出到下面的两个文件中.

set "CSV_IN=port_check_in.csv"
set "CSV_OUT=port_check_out.csv"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$in=@();$out=@();Get-NetTCPConnection -State Listen|%%{ $p=Get-Process -Id $_.OwningProcess -EA SilentlyContinue;$in+=[PSCustomObject]@{Name=$p.ProcessName;Port=$_.LocalPort;LocalAddress=$_.LocalAddress;Protocol='TCP';State=$_.State;PID=$_.OwningProcess;Path=$p.Path} };Get-NetUDPEndpoint|%%{ $p=Get-Process -Id $_.OwningProcess -EA SilentlyContinue;$in+=[PSCustomObject]@{Name=$p.ProcessName;Port=$_.LocalPort;LocalAddress=$_.LocalAddress;Protocol='UDP';State='Bound';PID=$_.OwningProcess;Path=$p.Path} };Get-NetTCPConnection|Where-Object {$_.State -in 'Established','TimeWait','CloseWait','SynSent'}|%%{ $p=Get-Process -Id $_.OwningProcess -EA SilentlyContinue;$out+=[PSCustomObject]@{Name=$p.ProcessName;Protocol='TCP';RemoteAddress=$_.RemoteAddress;RemotePort=$_.RemotePort;LocalAddress=$_.LocalAddress;LocalPort=$_.LocalPort;State=$_.State;PID=$_.OwningProcess;Path=$p.Path} };$in|Sort-Object Port,Protocol,Name|Export-Csv -NoTypeInformation -Encoding UTF8 '%~dp0%CSV_IN%';$out|Sort-Object RemotePort,Name|Export-Csv -NoTypeInformation -Encoding UTF8 '%~dp0%CSV_OUT%'"

echo 完成
pause