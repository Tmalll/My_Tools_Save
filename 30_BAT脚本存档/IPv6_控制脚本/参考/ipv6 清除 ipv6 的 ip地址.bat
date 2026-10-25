set faceName=ÒÔÌ«Íø


echo Çå³ýipv6µØÖ·
powershell "Remove-NetIPAddress -InterfaceAlias '%faceName%' -AddressFamily ipv6 -Confirm:$false"
pathping -p 300 -q 1 localhost >nul


https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netipaddress?view=windowsserver2022-ps
