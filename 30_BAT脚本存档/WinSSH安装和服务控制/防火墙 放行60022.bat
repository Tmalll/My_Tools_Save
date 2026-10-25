netsh advfirewall firewall add rule name="60022 Allow ALL" dir=in action=allow protocol=TCP localport=60022 remoteip=any profile=any interface=any

pause
exit
