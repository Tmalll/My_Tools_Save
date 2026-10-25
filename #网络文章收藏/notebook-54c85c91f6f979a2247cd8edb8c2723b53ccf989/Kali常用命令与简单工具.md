 就可以使用下面学习的命令了，另外，如果你有过计算机基础，那么Mac的terminal和Git的gitbash，都是可以练习大部分的linux命令的。下面我们就学习一些入门的基础命令

sudo，系统管理者的身份执行指令，也就是说，经由sudo所执行的指令就好像是root亲自执行
sudo service apache2 start，开启apache服务
sudo password root，修改root密码
sudo ifconfig，查看网络连接信息
sudo apt update，
sudo apt upgrade，
sudo apt install xxx，
ls，展示当前文件夹内容 
-a，全部的档案，连同隐藏档（开头为.的档案）一起列出来
-l，显示文件和目录的详细资料
pwd，查看当前工作目录的完整路径
cd，切换目录 
cd /home，进入"/home"目录
cd .. ，返回上一级目录
cd ../..，返回上两级目录
cp，复制 
cp 源文件 目标文件
rm，删除
二、Arping的使用方法
Arping用来向局域网内的其他主机发送ARP请求的指令，它可以用来测试局域网内的某个ip是否已经被使用。另外，ARP协议是Address Resolution Protocol的缩写，即地址解析协议。在同一个以太网（局域网）内，通过地址解析协议，源主机可以通过目的主机的ip地址获得目的主机的mac地址。

首先，我们在win7系统上通过ipconfig查找到win7的ip地址：


然后，我们回到kali系统打开命令行工具：


然后我们来实操一下arping的简单命令:

sudo arping [ip]：查看某个ip的mac地址。

sudo arping -c 1 [ip]：查看某个ip的mac地址，并指定count数量。

sudo arping -w 1 [ip]：设定一个扫描时间，单位是秒。


如果你不按CTRL + C的话就会一直跑。


通过-c选项，程序跑了指定的次数后就停止了。


通过-w选项，程序跑了指定的时间后就停止了。

三、hping3 端口扫描
hping是面向命令行的用于生成和解析TCP/IP协议数据包/汇编分析的开源工具。目前最新的版本是3，所以叫做hping3。它支持TCP、UDP、ICMP和RAW-IP协议，具有跟踪路由模式，能够在覆盖的信道之间发送文件以及许多其他功能。

hping3是安全审计、防火墙测试等工作的标配工具。hping优势在于能够定制数据包的各个部分，因此用户可以灵活的对目标进行细致的探测。

下面我们就来学习下hping3的相关命令：

sudo hping3 --help，查看帮助
hping3 -I eth0 -S [ip] -p 80，端口扫描 
-H，--help：显示帮助。
-v，-VERSION：版本信息。
-c，--count：发送数据包的次数。
-i，--interval：包发送间隔时间，单位是毫秒，默认是1，此功能在增加传输率上很重要，在idle/spoofing扫描时，此功能也会被用到，可以参考hping-howto获得更多的信息。-fast，每秒发送十个数据包
-n，-nmeric：数字输出，象征性输出主机地址。
-q，-quite：退出。
-I，--interface：interface name，就是eth0之类的参数。
-v，--verbose，显示更多信息。
-D，--debug：进入debug模式。
-z，--bind：快捷键的使用。
四、nslookup查询DNS的记录
nslookup命令用于查询dns记录，查看域名解析是否正常。在网络故障的时候用来诊断网络问题。使用这款工具，用到最多的一个功能就是查询一个域名的A记录：nslookup domain [dns-server]。如果没指定dns-server，就会使用系统默认的dns服务器。

nslookup -type=type domain [dns-server]：查询其他记录，直接查询返回的是A记录，我们可以指定参数，查询其他记录，比如AAAA、MX等。
type可以是以下类型：

A，地址记录。
AAAA，地址记录。
AFSDB，Andrew文件系统数据库服务记录。
ATMA，ATM地址记录。
CNAME，别名记录。
HINFO，硬件配置记录，包括CPU、操作系统信息。
ISDN，域名对应的ISDN号码。
MB，存放指定邮箱的服务器。
MG，邮件组记录。
MINFO，邮件组和邮箱的信息记录。
MR，改名的邮箱记录。
MX，邮件服务器记录。
NS，名字服务器记录。
PTR，反向记录。
RP，负责人记录。
RT，路由穿透记录。
SRVmTCP服务器信息记录。
TXT，域名对应的文本信息。
X25，域名对应的X25地址记录。
五、dnsenum域名信息收集工具
dnsenum是一款域名信息收集工具。dnsenum的目的是尽可能收集一个域的信息，它能够通过谷歌或者字典文件猜测可能存在的域名，以及对一个网段进行反向查询。它可以查询网站的主机地址信息、域名服务器等信息。

其中：

A（Address）记录是用来指定主机名或域名对应的ip得知记录。
NS（Name Server）记录是域名服务器记录，用来指定该域名由哪个DNS服务器来进行解析。
MX（Mail Exchanger）记录是邮件交换记录，他指向一个邮件服务器，用于电子邮件系统发送邮件时根据收信人的地址后缀来定位邮件服务器。
PTR，记录用于将一个IP地址映射到对应的域名，它可以看成是A记录的反向，IP地址的反向解析。
六、 DNSMap域名暴力穷举
通过dnsmap可以暴力穷举域名。有以下选项：

-w，后加字典文件。

-r，指定结果用常规格式输出文件。

-c，指定结果用csv输出。

-d，设置延迟。

-i，设置忽略ip，遇到虚假ip的时候非常有用。

举例：

代码语言：javascript
复制
dnsmap example.com

dnsmap example.com -w yourwordlist.txt -r /tmp/domainbf_results.txt

dnsmap example.com -r /tmp/ -d 3000

dnsmap example.com -r ./domainbf_results.txt
七、域名查询工具DMitry
DMitry工具是用来查询IP或域名WHOIS信息的。WHOIS是用来查询域名是否已经被注册，以及被注册域名的详细的详情的数据库（如域名所有人和域名注册商）。使用该工具可以查询到域名的注册商和过期时间。

常用参数如下：

-o，将输出保存到host.txt或由-o指定的文件。
-i，对主机的ip地址进行whois查找。
-w，对主机的域名进行whois查找。
-n，在主机上检索Netcraft.com信息。
-s，执行搜索可能的子域。
-e，执行搜索可能的电子邮件地址。
-p，在主机上进行TCP端口扫描。
-f，在现实输出报告过滤端口的主机上执行TCP端口扫描。
-b，读取从扫描端口接收的banner。
-t 0-9，扫描TCP端口时设置TTL，默认为2。
举例：

代码语言：javascript
复制
dmitry -wnpb baidu.com
八、网站防火墙探测工具WafW00f
现在网站为了自身安全，通常都会安装各类防火墙。这些防火墙往往会拦截各种扫描请求，使得测试人员无法正确判断网络相关信息。Kali Linux提供了一款网站防火墙探测工具WafW00f。它可以通过发送正常和带恶意代码的HTTP请求，以探测网站是否存在防火墙，并识别防火墙的类型。

为了实现这一目的，WafW00f会执行如下操作：

发送正常的http请求，然后分析响应，这可以识别出很多WAF。
如果不成功，可能会发送一些带恶意的HTTP请求，使用简单的逻辑推断是哪一个WAF。
如果这也不成功，它会分析之前返回的响应，使用其他简单的算法猜测是否有某个WAF或者安全解决方案响应了我们的攻击。
WafW00f可以检测很多WAF，可以通过-l参数查看检测的WAF类型。
