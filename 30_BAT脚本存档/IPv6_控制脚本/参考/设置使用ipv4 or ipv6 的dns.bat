
netsh interface ip set dns "ÒÔÌ«Íø" dhcp
netsh interface ipv6 delete dnsservers "ÒÔÌ«Íø" all
netsh interface ipv6 add    dnsservers "ÒÔÌ«Íø" 2001:4860:4860::6464


pause
exit


netsh interface ipv6 set dnsservers name="ÒÔÌ«Íø" source=dhcp
netsh interface ipv6 set dnsservers "ÒÔÌ«Íø" static fec0:0:0:ffff::1 primary



netsh interface ip set dns "ÒÔÌ«Íø" dhcp
netsh interface ip set dns name="Meta" source=static addr=127.0.0.1
netsh interface ip add dns name="Meta" addr=127.0.0.1



