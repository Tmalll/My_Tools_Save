 说明：

Ubuntu的有线网络配置使用了两种配置方法，所以会有两处配置文件（Deepin应该和这个是一样的）：
第一，/etc/network/interfaces这个配置文件主要用于便于服务器版本的ubuntu系统使用；
第二，/etc/NetworkManager/NetworkManager.conf中也可以配置网络，这个是为了适应移动办公造成的网络环境变化，相应的IP也会变动；
采用的策略是二选一：

当/etc/NetworkManager/NetworkManager.conf中的 managed=false时，以ineterfaces文件中的配置为准；
当/etc/NetworkManager/NetworkManager.conf中的 managed=true时，以NetworkManager目录下的配置为准；
一. ifconfig
ifconfig是Linux中常用的网络配置工具之一，用于配置和显示网络接口的具体情况。

注意事项

用ifconfig命令配置的网卡信息是临时生效的，在网卡重启后或机器重启后，配置就不存在了。
在一些较新的Linux发行版中，ifconfig命令已经被ip命令取代。
可以临时配置IP地址，子网掩码，不能配置网关和DNS(用其他命令配置)。
使用帮助(常用参数）

ifconfig [-a] [-v] [-s] <interface> [[<AF=Address Family.Default:inet>] <address>]  
[netmask <address>]  
[up | down]
​
常用情形

启停网卡
ifconfig eth0 up #启动网卡eth0
ifconfig eth0 down #关闭网卡eth0
单独显示eth0网卡信息
ifconfig eth0
设置网卡的IP地址
ifconfig eth0 192.168.3.127 netmask 255.255.255.0
新增网卡的IP地址
ifconfig eth0 add 192.168.200.200 netmask 255.255.255.0  #这会生成一个eth0:0的虚拟子网卡
删除网卡的IP地址，临时生效
ifconfig eth0 del 192.168.200.200 netmask 255.255.255.0
修改MAC地址，临时生效
ifconfig eth0 hw ether 10:BA:CB:54:86:B3
二. ip
ip命令来自 iproute2 软件包，iproute2 软件包提供了很多命令（rpm -ql iproute |grep bin），本文仅介绍其中几个常用的：

ip address
ip route
ip link
ip address
address可以简写为a或ad或add等

ip address #查看所有IP地址
ip address show ens33 #查看ens33网卡上的IP地址
ip address add 192.168.100.10/24 device ens33 #向ens33网卡上添加一个临时IP地址
ip address del 192.168.10.10/24 device ens33 #从ens33网卡上删除一个临时IP地址
注意：
通过 ip a add 添加的 IP 会在重启主机后失效。
没有修改 IP 地址的命令，若要修改，可以先删除原 IP，再添加新 IP。
ip route

ip route #查看路由
ip route add default via 172.17.0.1 #默认路由（网关）
ip link

ip link #查看所有的网络设备
ip link add [link DEVICE] [name] NAME type TYPE #创建虚拟网络设备
三. nmcli
nmcli 是软件 NetworkManager 的提供的命令。下面介绍 nmcli 四类常用命令：networking、general、connection、device。

nmcli networking

nmcli networking #networing可以简写为n，显示Networmanager是否接管网络设置
nmcli n on #开启网络连接
nmcli n off #关闭网络连接
nmcli general

nmcli general status 或者简写为nmcli g #显示网络状态
nmcli g hostname 或nmcli g h #显示主机名
nmcli g hostname newHostName 或nmcli g h newHostName #更改主机名，存放于/etc/hostname文件中，需要重启NetworkManager生效
nmcli connection

nmcli connection show 或nmcli c #显示所有网络连接的信息
nmcli c s --active或nmcli c s -a #只显示当前启动的连接
nmcli c s ens33 #显示某一特定连接的详细信息
nmcli c up ens33 #启动指定连接
nmcli c down ens33 #关闭指定连接
使用nmcli connection修改连接:

nmcli c modify ens33 [+ | -]选项 选项值 或nmcli c m [+ | -]选项选项值
常用修改示例：
nmcli c m ens33 ipv4.address 192.168.80.10/24  # 修改 IP 地址和子网掩码
nmcli c m ens33 +ipv4.addresses 192.168.80.100/24
nmcli c m ens33 ipv4.method manual             # 修改为静态配置，默认是 auto
nmcli c m ens33 ipv4.gateway 192.168.80.2      # 修改默认网关
nmcli c m ens33 ipv4.dns 192.168.80.2          # 修改 DNS
nmcli c m ens33 +ipv4.dns 223.5.5.5      # 添加一个 阿里的DNS
nmcli c m ens33 connection.autoconnect yes     # 开机启动网卡
注意：
* 必须先修改 ipv4.address，然后才能修改 ipv4.method！
* 用空引号""代替选项的值，可将选项设回默认值！如nmcli c m ens33 ipv4.method ""
​
新增连接配置：（这是一种网络会话功能，比如笔记本电脑在公司网络使用时是手动指定IP地址，拿到家里使用时是DHCP自动分配地址，此时可以创建两个 会话，切换到不同使用环境时，激活相应的网络会话，就可以实现网络信息的自动切换了。）

nmcli c add type 连接类型 选项 选项值
nmcli c add type ethernet con-name ens36 ifname ens36    #con-name就是会话名称，也可称为网络配置文件名称

nmcli c delete ens33 #删除指定连接
nmcli c reload #重新加载网络配置
nmcli device

显示所有网络接口设备的状态
nmcli device status 或 nmcli d
显示所有设备的详细信息
nmcli d show 或 nmcli d sh
显示某一特定设备的详细信息
nmcli d sh ens33
连接设备，如果ens33处于连接状态，会重启ens33网卡
nmcli d connect ens33 或 nmcli d c ens33
断开设备
nmcli d disconnect ens33 或 nmcli d d ens33
其它相关命令：

查看状态：systemctl status NetworkManager 
启动：systemctl start NetworkManager 
重启：systemctl restart NetworkManager 
关闭：systemctl stop NetworkManager 
查看是否开机启动：systemctl is-enabled NetworkManager 
开机启动：systemctl enable NetworkManager 
禁止开机启动：systemctl disable NetworkManager
​
四、 无线网络
iw
iw list #获取所有设备
ifconfig wlan0 up #激活网卡
iw dev wlan0 scan #扫描
iw wlan0 connect foo #连接到没有加密的热点foo上
wpa_passphrase test 12345678 >> /etc/wpa_supplicant.conf #配置连接wifi,test为无线SSID，12345678为密码
wpa_supplicant -B -i wlan0 -c /etc/wpa_supplicant.conf #连接wifi设备
iw wlan0 link #查看连接状态
为wlan0获取ip地址
sudo dhclient wlan0
