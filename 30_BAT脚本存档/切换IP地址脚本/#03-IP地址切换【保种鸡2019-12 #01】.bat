
echo "设置IP地址和网络掩码。"
netsh interface ip set address "物理网络" source=static addr=192.168.1.80 mask=255.255.255.0
netsh interface ip set address "虚拟内网1" source=static addr=192.168.88.80 mask=255.255.255.0

echo "设置网关地址"
netsh interface ip add address name="物理网络" gateway=192.168.1.33 gwmetric=0
netsh interface ip add address name="虚拟内网1" gateway=192.168.88.33 gwmetric=0

echo "设置【物理网络】DNS地址"
netsh interface ip set dns name="物理网络" source=static addr=192.168.1.99
netsh interface ip add dns name="物理网络" addr=192.168.1.131
netsh interface ip add dns name="物理网络" addr=192.168.1.130

echo "设置【虚拟内网1】DNS地址"
netsh interface ip set dns name="虚拟内网1" source=static addr=192.168.88.99
netsh interface ip add dns name="虚拟内网1" addr=192.168.88.131
netsh interface ip add dns name="虚拟内网1" addr=192.168.88.130

ipconfig /flushdns

pause


