@echo off
echo ¿ªÆôipv6¹«Íø
netsh advfirewall firewall delete rule name="block_ipv6_in"

echo qbittorrent
netsh advfirewall firewall delete rule name="qbittorrent"
netsh advfirewall firewall add    rule name="qbittorrent" dir=in action=allow protocol=tcp localport=45678
netsh advfirewall firewall add    rule name="qbittorrent" dir=in action=allow protocol=udp localport=45678
netsh advfirewall firewall add    rule name="qbittorrent" dir=in action=allow protocol=tcp localport=80 localip=192.168.0.0/16

echo emule
netsh advfirewall firewall delete rule name="emule"
netsh advfirewall firewall add    rule name="emule" dir=in action=allow protocol=tcp localport=55333
netsh advfirewall firewall add    rule name="emule" dir=in action=allow protocol=udp localport=55444
netsh advfirewall firewall add    rule name="emule" dir=in action=allow protocol=tcp localport=888 localip=192.168.0.0/16

echo aria2c
netsh advfirewall firewall delete rule name="aria2c"
netsh advfirewall firewall add    rule name="aria2c" dir=in action=allow protocol=tcp localport=16888 localip=192.168.0.0/16
netsh advfirewall firewall add    rule name="aria2c" dir=in action=allow protocol=tcp localport=11111,56800-56999
netsh advfirewall firewall add    rule name="aria2c" dir=in action=allow protocol=udp localport=11111,56800-56999

echo xray
netsh advfirewall firewall delete rule name="xray"
netsh advfirewall firewall add    rule name="xray" dir=in action=allow protocol=tcp localport=10800-10801 localip=192.168.0.0/16
netsh advfirewall firewall add    rule name="xray" dir=in action=allow protocol=udp localport=10800-10801 localip=192.168.0.0/16


pause
exit

