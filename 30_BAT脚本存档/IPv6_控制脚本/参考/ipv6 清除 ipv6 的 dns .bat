清除ipv6的dns
netsh interface ipv6 delete dnsservers "Meta" all

清除ipv4的dns
netsh interface ip set dns "Meta" dhcp
