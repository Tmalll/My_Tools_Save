 今天给大家分享Windows常用cmd网络命令，希望对大家能有所帮助！

1、arp [option] [address]  显示/修改ARP缓存

执行命令：arp -a


参数说明：

代码语言：javascript
复制
显示和修改地址解析协议(ARP)使用的“IP 到物理”地址转换表。
ARP -s inet_addr eth_addr [if_addr]ARP -d inet_addr [if_addr]ARP -a [inet_addr] [-N if_addr] [-v]
  -a            通过询问当前协议数据，显示当前 ARP 项。                如果指定 inet_addr，则只显示指定计算机                的 IP 地址和物理地址。如果不止一个网络                接口使用 ARP，则显示每个 ARP 表的项。  -g            与 -a 相同。  -v            在详细模式下显示当前 ARP 项。所有无效项                和环回接口上的项都将显示。  inet_addr     指定 Internet 地址。  -N if_addr    显示 if_addr 指定的网络接口的 ARP 项。  -d            删除 inet_addr 指定的主机。inet_addr 可                以是通配符 *，以删除所有主机。  -s            添加主机并且将 Internet 地址 inet_addr                与物理地址 eth_addr 相关联。物理地址是用                连字符分隔的 6 个十六进制字节。该项是永久的。  eth_addr      指定物理地址。  if_addr       如果存在，此项指定地址转换表应修改的接口                的 Internet 地址。如果不存在，则使用第一                个适用的接口。示例:  > arp -s 157.55.85.212   00-aa-00-62-c6-09.... 添加静态项。  > arp -a                                  .... 显示 ARP 表。
2、getmac <options> 显示mac地址

执行命令：getmac 


参数说明：

代码语言：javascript
复制
PS C:\Users\Administrator> getmac /?
GETMAC [/S system [/U username [/P [password]]]] [/FO format] [/NH] [/V]
描述:    此工具使管理员能够显示系统上网络适配器的 MAC 地址。
参数列表:    /S     system            指定要连接的远程系统。
    /U     [domain\]user     指定用户上下文，命令在此上下文执行。
    /P     [password]        指定给定用户上下文密码。如果省略则                             提示输入。
    /FO    format            指定输出显示的格式。                             有效值: "TABLE"、"LIST"、"CSV"。
    /NH                      指定在输出中不显示“列标题”。                             只对 TABLE 和 CSV 格式有效。

    /V                       指定显示详细输出。
    /?                       显示此帮助消息。
示例:    GETMAC /?    GETMAC /FO csv    GETMAC /S system /NH /V    GETMAC /S system /U user    GETMAC /S system /U domain\user /P password /FO list /V    GETMAC /S system /U domain\user /P password /FO table /NHPS C:\Users\Administrator>
3、hostname 用来显示主机名


4、ipconfig <options>  显示TCP/IP配置信息 运维人员必备命令

执行命令：ipconfig


代码语言：javascript
复制
用法:    ipconfig [/allcompartments] [/? | /all |                                 /renew [adapter] | /release [adapter] |                                 /renew6 [adapter] | /release6 [adapter] |                                 /flushdns | /displaydns | /registerdns |                                 /showclassid adapter |                                 /setclassid adapter [classid] |                                 /showclassid6 adapter |                                 /setclassid6 adapter [classid] ]
其中    adapter             连接名称                       (允许使用通配符 * 和 ?，参见示例)
    选项:       /?               显示此帮助消息       /all             显示完整配置信息。       /release         释放指定适配器的 IPv4 地址。       /release6        释放指定适配器的 IPv6 地址。       /renew           更新指定适配器的 IPv4 地址。       /renew6          更新指定适配器的 IPv6 地址。       /flushdns        清除 DNS 解析程序缓存。       /registerdns     刷新所有 DHCP 租用并重新注册 DNS 名称       /displaydns      显示 DNS 解析程序缓存的内容。       /showclassid     显示适配器允许的所有 DHCP 类 ID。       /setclassid      修改 DHCP 类 ID。       /showclassid6    显示适配器允许的所有 IPv6 DHCP 类 ID。       /setclassid6     修改 IPv6 DHCP 类 ID。

默认情况下，仅显示绑定到 TCP/IP 的每个适配器的 IP 地址、子网掩码和默认网关。
对于 Release 和 Renew，如果未指定适配器名称，则会释放或更新所有绑定到 TCP/IP 的适配器的 IP 地址租用。
对于 Setclassid 和 Setclassid6，如果未指定 ClassId，则会删除 ClassId。
示例:    > ipconfig                       ... 显示信息    > ipconfig /all                  ... 显示详细信息    > ipconfig /renew                ... 更新所有适配器    > ipconfig /renew EL*            ... 更新所有名称以 EL 开头                                         的连接    > ipconfig /release *Con*        ... 释放所有匹配的连接，                                         例如“有线以太网连接 1”或                                             “有线以太网连接 2”    > ipconfig /allcompartments      ... 显示有关所有隔离舱的                                         信息    > ipconfig /allcompartments /all ... 显示有关所有隔离舱的                                         详细信息
5、netstat <options>  查看网络监听状况

执行命令：netstat


参数说明：

代码语言：javascript
复制
PS C:\Users\Administrator> netstat /?

显示协议统计信息和当前 TCP/IP 网络连接。

NETSTAT [-a] [-b] [-e] [-f] [-n] [-o] [-p proto] [-r] [-s] [-t] [-x] [-y] [interval]

  -a            显示所有连接和侦听端口。  -b            显示在创建每个连接或侦听端口时涉及的                可执行文件。在某些情况下，已知可执行文件托管                多个独立的组件，此时会                显示创建连接或侦听端口时                涉及的组件序列。在此情况下，可执行文件的                名称位于底部 [] 中，它调用的组件位于顶部，                直至达到 TCP/IP。注意，此选项                可能很耗时，并且可能因为你没有足够的                权限而失败。  -e            显示以太网统计信息。此选项可以与 -s 选项                结合使用。  -f            显示外部地址的完全限定                域名(FQDN)。  -n            以数字形式显示地址和端口号。  -o            显示拥有的与每个连接关联的进程 ID。  -p proto      显示 proto 指定的协议的连接；proto                可以是下列任何一个: TCP、UDP、TCPv6 或 UDPv6。如果与 -s                选项一起用来显示每个协议的统计信息，proto 可以是下列任何一个:                IP、IPv6、ICMP、ICMPv6、TCP、TCPv6、UDP 或 UDPv6。  -q            显示所有连接、侦听端口和绑定的                非侦听 TCP 端口。绑定的非侦听端口                不一定与活动连接相关联。  -r            显示路由表。  -s            显示每个协议的统计信息。默认情况下，                显示 IP、IPv6、ICMP、ICMPv6、TCP、TCPv6、UDP 和 UDPv6 的统计信息；                -p 选项可用于指定默认的子网。  -t            显示当前连接卸载状态。  -x            显示 NetworkDirect 连接、侦听器和共享                终结点。  -y            显示所有连接的 TCP 连接模板。                无法与其他选项结合使用。  interval      重新显示选定的统计信息，各个显示间暂停的                间隔秒数。按 CTRL+C 停止重新显示                统计信息。如果省略，则 netstat 将打印当前的                配置信息一次。
6、ping <options> <host>  检查网络连接或者服务是否正常通信

执行命令：ping baidu.com


参数说明：

代码语言：javascript
复制
PS C:\Users\Administrator> ping
用法: ping [-t] [-a] [-n count] [-l size] [-f] [-i TTL] [-v TOS]            [-r count] [-s count] [[-j host-list] | [-k host-list]]            [-w timeout] [-R] [-S srcaddr] [-c compartment] [-p]            [-4] [-6] target_name
选项:    -t             Ping 指定的主机，直到停止。                   若要查看统计信息并继续操作，请键入 Ctrl+Break；                   若要停止，请键入 Ctrl+C。    -a             将地址解析为主机名。    -n count       要发送的回显请求数。    -l size        发送缓冲区大小。    -f             在数据包中设置“不分段”标记(仅适用于 IPv4)。    -i TTL         生存时间。    -v TOS         服务类型(仅适用于 IPv4。该设置已被弃用，                   对 IP 标头中的服务类型字段没有任何                   影响)。    -r count       记录计数跃点的路由(仅适用于 IPv4)。    -s count       计数跃点的时间戳(仅适用于 IPv4)。    -j host-list   与主机列表一起使用的松散源路由(仅适用于 IPv4)。    -k host-list    与主机列表一起使用的严格源路由(仅适用于 IPv4)。    -w timeout     等待每次回复的超时时间(毫秒)。    -R             同样使用路由标头测试反向路由(仅适用于 IPv6)。                   根据 RFC 5095，已弃用此路由标头。                   如果使用此标头，某些系统可能丢弃                   回显请求。    -S srcaddr     要使用的源地址。    -c compartment 路由隔离舱标识符。    -p             Ping Hyper-V 网络虚拟化提供程序地址。    -4             强制使用 IPv4。    -6             强制使用 IPv6。
7、route <options> <cmd> <value>  显示/修改路由表

执行命令： route PRINT -4


参数说明：

代码语言：javascript
复制
PS C:\Users\Administrator> route
操作网络路由表。
ROUTE [-f] [-p] [-4|-6] command [destination]                  [MASK netmask]  [gateway] [METRIC metric]  [IF interface]
  -f           清除所有网关项的路由表。如果与某个               命令结合使用，在运行该命令前，               应清除路由表。
  -p           与 ADD 命令结合使用时，将路由设置为               在系统引导期间保持不变。默认情况下，重新启动系统时，               不保存路由。忽略所有其他命令，               这始终会影响相应的永久路由。
  -4           强制使用 IPv4。
  -6           强制使用 IPv6。
  command      其中之一:                 PRINT     打印路由                 ADD       添加路由                 DELETE    删除路由                 CHANGE    修改现有路由  destination  指定主机。  MASK         指定下一个参数为“netmask”值。  netmask      指定此路由项的子网掩码值。               如果未指定，其默认设置为 255.255.255.255。  gateway      指定网关。  interface    指定路由的接口号码。  METRIC       指定跃点数，例如目标的成本。
用于目标的所有符号名都可以在网络数据库文件 NETWORKS 中进行查找。用于网关的符号名称都可以在主机名称数据库文件 HOSTS 中进行查找。
如果命令为 PRINT 或 DELETE。目标或网关可以为通配符，(通配符指定为星号“*”)，否则可能会忽略网关参数。
如果 Dest 包含一个 * 或 ?，则会将其视为 Shell 模式，并且只打印匹配目标路由。“*”匹配任意字符串，而“?”匹配任意一个字符。示例: 157.*.1、157.*、127.*、*224*。
只有在 PRINT 命令中才允许模式匹配。诊断信息注释:    无效的 MASK 产生错误，即当 (DEST & MASK) != DEST 时。    示例: > route ADD 157.0.0.0 MASK 155.0.0.0 157.55.80.1 IF 1             路由添加失败: 指定的掩码参数无效。             (Destination & Mask) != Destination。
示例:
    > route PRINT    > route PRINT -4    > route PRINT -6    > route PRINT 157*          .... 只打印那些匹配  157* 的项
    > route ADD 157.0.0.0 MASK 255.0.0.0  157.55.80.1 METRIC 3 IF 2             destination^      ^mask      ^gateway     metric^    ^                                                         Interface^      如果未给出 IF，它将尝试查找给定网关的最佳      接口。    > route ADD 3ffe::/32 3ffe::1
    > route CHANGE 157.0.0.0 MASK 255.0.0.0 157.55.80.5 METRIC 2 IF 2
      CHANGE 只用于修改网关和/或跃点数。
    > route DELETE 157.0.0.0    > route DELETE 3ffe::/32
8、telnet <cmd> <options> telnet客户端端口

经常检测用于远程服务器某个服务是否正常

说明：使用的时候需要开启telnet服务功能才可以正常使用。

比如：telnet 192.168.0.12 3306  用来判断对应的3306 mysql端口是否可以正常访问

9、tracert <options> <dest>  跟踪网络跳转路径

执行命令：tracert -d www.baidu.com


参数说明：

代码语言：javascript
复制
PS C:\Users\Administrator> tracert用法: tracert [-d] [-h maximum_hops] [-j host-list] [-w timeout]               [-R] [-S srcaddr] [-4] [-6] target_name选项:    -d                 不将地址解析成主机名。    -h maximum_hops    搜索目标的最大跃点数。    -j host-list       与主机列表一起的松散源路由(仅适用于 IPv4)。    -w timeout         等待每个回复的超时时间(以毫秒为单位)。    -R                 跟踪往返行程路径(仅适用于 IPv6)。    -S srcaddr         要使用的源地址(仅适用于 IPv6)。    -4                 强制使用 IPv4。    -6                 强制使用 IPv6。
