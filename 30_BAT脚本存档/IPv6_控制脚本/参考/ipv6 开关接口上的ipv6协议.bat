set faceName=以太网

echo 重启ipv6协议
powershell Disable-NetAdapterBinding -Name '%faceName%' -ComponentID 'ms_tcpip6'
powershell Enable-NetAdapterBinding -Name '%faceName%' -ComponentID 'ms_tcpip6'
pathping -p 5000 -q 1 localhost >nul



注册表开启关闭v6协议 需要重启
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" /v DisabledComponents /t REG_DWORD /d 255 /f
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" /v DisabledComponents /f
