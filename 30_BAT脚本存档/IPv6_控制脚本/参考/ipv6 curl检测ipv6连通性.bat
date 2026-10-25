pathping -p 5000 -q 1 localhost >nul
set logaddress="E:\01.userData\ZhuoMian\ipv6.txt"
del /s /q %logaddress%
echo %date% %time% >> %logaddress%
echo. >> %logaddress%
curl -s -m 2 6.ipw.cn >> %logaddress% && echo. && echo 获取ipv6成功
echo. >> %logaddress%
ping -n 3 -w 1000 6.ipw.cn >> %logaddress% && echo. && echo ping ipv6 成功 && echo.
echo. >> %logaddress%