@echo off
echo 阻止ipv6公网入站通信


netsh advfirewall firewall delete rule name="block_ipv6_in"
netsh advfirewall firewall add    rule name="block_ipv6_in" dir=in action=block protocol=tcp localport=1-20000 remoteip="2000::/3"
netsh advfirewall firewall add    rule name="block_ipv6_in" dir=in action=block protocol=udp localport=1-20000 remoteip="2000::/3"



pause
exit

