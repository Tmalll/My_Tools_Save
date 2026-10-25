 以下是Linux故障排除命令列表：

命令

描述

hostname

检查和设置服务器的主机名。

host

获取主机 DNS 详细信息

ping

使用ICMP 协议检查是否可以访问远程服务器。它还显示数据包的往返时间。

curl

用于传输数据的跨平台实用程序，它可用于解决多个网络问题。

wget

下载文件的实用程序，可用于对代理连接和连接进行故障排除。

ip

用于配置和检索有关系统网络接口的信息

arp

查看和管理arp 缓存的实用程序。

ss/netstat

检查端口和 Unix 套接字上的连接和 PID。

tracerout和

使用 ICMP 协议并查找读取目标服务器时涉及的跃点，还显示跃点之间花费的时间。

mtr

mtr 是 和 的混合ping体traceroute。它还提供其他信息，如中间宿主和响应能力。

dig

获取与域名关联的 DNS 记录。

nslookup

类似于 dig 的命令。

nc

调试 TCP/UDP 套接字的实用程序。

telnet

用于测试端口上的远程连接

route

获取所有路由表信息

tcpdump

捕获网络数据包并分析它们是否存在网络问题。

lsof

列出所有打开的文件和打开它的进程信息

下面瑞哥会逐一介绍。

重要说明：本文中介绍的每个命令都会有很多的参数选项，文章篇幅有限，不可能一一介绍，具体的命令可以结合man命令进行查询命令的详细使用方法，如man hostname。

1.hostname
hostname命令用于查看机器的主机名和设置主机名：

代码语言：javascript
复制
hostname
可以使用 hostname 命令为机器设置一个新的主机名，例如，

代码语言：javascript
复制
sudo hostname wljslmz.cn
如果您使用“ hostname”命令设置主机名，当您重新启动机器时，主机名将更改为主机名文件中指定的名称（例如：/etc/hostname）。

因此，如果您想永久更改主机名，可以使用/etc/hosts服务器上存在的文件或相关主机名文件。

对于 ubuntu，可以在/etc/hostname文件中更改它。
对于 RHEL、CentOS 和 Fedora，可以在/etc/sysconfig/network文件中更改它。
2.host
host命令用于反向查找 IP 或 DNS 名称。

例如，如果你想查找附加了 IP 的 DNS，你可以使用如下主机命令。

代码语言：javascript
复制
host 8.8.8.8
也可以反向查找与域名关联的 IP 地址，例如：

代码语言：javascript
复制
host wljslmz.cn
3. ping
ping 网络实用程序用于检查远程服务器是否可达，它主要用于检查连通性和排除网络故障。

它提供了以下详细信息。

发送和接收的字节数
发送、接收和丢失的数据包
大约往返时间（以毫秒为单位）
Ping 命令具有以下语法。

代码语言：javascript
复制
ping <IP 或 DNS>
例如，

代码语言：javascript
复制
ping wljslmz.cn
ping IP地址

代码语言：javascript
复制
ping 8.8.8.8
如果你想在不使用 ctrl+c 的情况下限制 ping 输出，那么你可以使用带有数字的“-c”标志：

代码语言：javascript
复制
ping -c 1 wljslmz.cn
4.curl
Curl 实用程序主要用于从服务器传输数据或向服务器传输数据，但是，您可以将其用于网络故障排除。

例如，curl可以使用 telnet 检查端口 22 上的连接。

代码语言：javascript
复制
curl -v telnet://192.168.1.1:22
您可以使用 curl 检查 FTP 连接。

代码语言：javascript
复制
curl ftp://ftptest.net 
您也可以对 Web 服务器连接进行故障排除。

代码语言：javascript
复制
curl http://wljslmz.cn -I
5.wget
该wget命令主要用于获取网页。

您也可以使用它wget来解决网络问题。

例如，您可以使用 wget对代理服务器连接进行故障排除。

代码语言：javascript
复制
wget -e use_proxy=yes http_proxy=<proxy_host:port> http://externalsite.com
您可以通过获取文件来检查网站是否正常运行。

代码语言：javascript
复制
wget www.wljslmz.com
6.ip（ifconfig）
ip命令用于显示和操作路由和网络接口，ip命令是较新版本的. ifconfig 适用于所有系统，但最好使用 ip 命令而不是 ifconfig。 ifconfig

让我们看几个ip命令示例。

显示网络设备和配置
代码语言：javascript
复制
ip addr
您可以将此命令与管道和 grep 结合使用，以获得更精细的输出，例如 eth0 接口的 IP 地址，当您使用需要动态获取 IP 的自动化工具时，它非常有用。

以下命令获取eth0网络接口的 IP 地址：

代码语言：javascript
复制
ip a | grep eth0  | grep "inet" | awk -F" " '{print $2}'
获取特定接口的详细信息：

代码语言：javascript
复制
ip a show eth0
您可以列出路由表：

代码语言：javascript
复制
ip route
ip route list
7.ARP
ARP（地址解析协议）显示了系统与之交互的本地网络的IP地址和MAC地址的缓存表。

代码语言：javascript
复制
arp
示例输出：


8.ss (netstat)
该ss命令是netstat. 您仍然可以netstat在所有系统上使用该命令。

使用sscommand，可以获得比netstatcommand更多的信息。ss 命令很快，因为它从内核用户空间获取所有信息。

现在让我们看一下命令的一些用法ss。

列出所有连接
ss命令将列出您机器上的所有 TCP、UDP 和 Unix 套接字连接：


该ss命令的输出会很大，因此您可以使用“ ss | less”命令使输出可滚动。

过滤掉 TCP、UDP 和 Unix 套接字
如果要过滤掉 TCP、UDP 或 UNIX 套接字详细信息，请在“ss”命令中使用“-t”、“-u”和“-x”标志，它将显示与特定端口的所有已建立连接，如果您想使用带有特定标志的“a”列出已连接和正在侦听的端口，如下所示。


列出所有监听端口
要列出所有侦听端口，请在 ss 命令中使用“-l”标志。要列出特定的 TCP、UDP 或 UNIX 套接字，请使用“-t”、“-u”和“-x”标志以及“-l”，如下所示：


列出所有已建立的
要列出所有已建立的端口，请使用state established如下所示的标志：

代码语言：javascript
复制
ss -t -r state established
要列出所有处于侦听状态的套接字：

代码语言：javascript
复制
ss -t -r state listening
9. traceroute
如果您的系统或服务器中没有traceroute实用程序，您可以从本机存储库安装它。

traceroute是一个网络故障排除实用程序。使用 traceroute，您可以找到特定数据包到达目的地所需的跃点数：

代码语言：javascript
复制
traceroute google.com
这是输出：


上面的输出显示了从 wljslmz AWS ec2 服务器到达 google.com 的跳数 (12)。

10. mtr
该mtr实用程序是一种网络诊断工具，用于解决网络瓶颈问题，它结合了两者的功能ping和traceroute。

例如，以下命令traceroute实时显示输出。

代码语言：javascript
复制
mtr google.com
这是输出：


mtr报告
您可以使用 –report 标志生成报告。当您运行 mtr 报告时，它会向目的地发送 10 个数据包并创建报告：

代码语言：javascript
复制
mtr -n --report google.com

11.dig
如果您有任何与 DNS 查找相关的任务，您可以使用“ dig”命令来查询 DNS 名称服务器。

使用 dig 获取所有 DNS 记录
以下命令返回一个 twitter.com 的所有 DNS 记录和 TTL 信息：

代码语言：javascript
复制
dig twiter.com ANY

用于+short获取不冗长的输出。

代码语言：javascript
复制
dig google.com ANY +short
使用 dig 获取特定的 DNS 记录
例如，如果要获取A record特定域名的 ，可以使用 dig 命令，+short将提供不冗长的信息：

代码语言：javascript
复制
dig www.google.com A +short
同样，您可以使用以下命令单独获取其他记录信息：


使用 dig 进行反向 DNS 查找
您可以使用以下命令使用 dig 执行反向 DNS 查找。替换8.8.8.8成需要的IP：

代码语言：javascript
复制
dig -x 8.8.8.8
12.nslookup
Nslookup （名称服务器查找）实用程序用于检查 DNS 条目，它类似于 dig 命令。

要查看域的 DNS 记录，可以使用以下命令：

代码语言：javascript
复制
nslookup google.com
使用 IP 地址进行反向查找：

代码语言：javascript
复制
nslookup 8.8.8.8
要获取域名的所有 DNS 记录，可以使用以下方法：

代码语言：javascript
复制
nslookup -type=any google.com
13. nc (netcat)
ncnetcat命令被称为网络命令的瑞士军队。

使用nc，您可以检查在特定端口上运行的服务的连接性。

例如，要检查ssh端口是否打开，可以使用以下命令：

代码语言：javascript
复制
nc -v -n 192.168.33.10 22
netcat也可用于通过 TCP/UDP 和端口扫描进行数据传输。

不建议在云环境中进行端口扫描，您需要请求云提供商在您的环境中执行端口扫描操作。

14.telnet
telnet 命令用于对端口上的 TCP 连接进行故障排除。

要使用 telnet 检查端口连接，请使用以下命令：

代码语言：javascript
复制
telnet 10.4.5.5 22
15.route
route命令用于获取系统路由表的详细信息并对其进行操作。让我们看几个路由命令的例子。

列出所有route
执行route不带任何参数的“ ”命令以列出系统或服务器中的所有现有路由。


如果你想获得没有任何主机名的数字形式的完整输出，你可以在 route 命令中使用“-n”标志：


16. tcpdump
该tcpdump命令主要用于对网络流量进行故障排除。

注意：分析tcpdump命令的输出需要一些学习，因此解释它超出了本文的范围。

tcpdump命令适用于系统的网络接口，所以你需要使用管理权限来执行命令。

列出所有网络接口
使用以下命令列出所有接口：

代码语言：javascript
复制
sudo  tcpdump --list-interfaces
在特定接口上捕获数据包
要获取特定接口上的数据包转储，您可以使用以下命令。

注意：按ctrl + c 停止抓包。

代码语言：javascript
复制
sudo tcpdump -i eth0
要限制数据包捕获，您可以使用-c带有数字的标志。

例如：

代码语言：javascript
复制
sudo tcpdump -i eth0 -c 10
在所有接口上捕获数据包
要捕获所有接口上的数据包，请使用any如下所示的标志：

代码语言：javascript
复制
sudo tcpdump -i any
17. lsof
lsof是日常 linux 故障排除中使用的命令。对于使用 Linux 系统的任何人来说，此命令同样重要。

要列出所有打开的文件，请执行lsof命令：

代码语言：javascript
复制
lsof
开发人员和 DevOps 工程师面临的常见错误之一是“绑定失败错误：地址已在使用中”，您可以使用以下命令找到与端口关联的进程 ID，您可以终止进程以释放端口：

代码语言：javascript
复制
lsof -i :8080
总结
