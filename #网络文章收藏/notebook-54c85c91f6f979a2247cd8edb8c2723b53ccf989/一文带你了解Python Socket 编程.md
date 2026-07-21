Socket又称为套接字，它是所有网络通信的基础。网络通信其实就是进程间的通信，Socket主要是使用IP地址，协议，端口号来标识一个进程。端口号的范围为0~65535(用户端口号一般大于1024)，协议有很多种，一般我们经常用到的就是TCP，IP，UDP。下面我们来详细了解下Socket吧。



一、导入Socket模块
因为要操作套接字，所以需要用到套接字模块，系统中自带的就很不错，下面我们来导入：

  import socket

二、Socket基本用法
1.建立一个简单的Socket连接
#创建Tcp/Ip套接字
  s=socket.socket(socket.AF_INET,socket.SOCK_STREAM) #流式Socket
#创建Udp/Ip套接字
  s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM) #数据报式Socket
  socket.AF_UNIX  #只能够用于单一的Unix系统进程间通信
  socket.AF_INET6  #只能够用于IPv6通信
  socket.SOCK_RAW  #原始套接字，可以处理ICMP、ARP等网络报文，其它的不行
  socket.SOCK_SEQPACKET  #可靠的连续数据包服务
2.协议对应端口
应用程序    FTP   TFTP  TELNET  SMTP  DNS   HTTP  SSH   MYSQL  POP3   MONGO
  端口     21,20  69     23     25    53    80    22    3306   110   27017
  协议      TCP   UDP    TCP    TCP   UDP   TCP   TCP    TCP   TCP    TCP
3.Socket函数
#创建Socket连接，比Connect更高级，可以自动解析不是数字的host地址,兼容IPv4和 IPv6
  socket.create_connection(address=('localhost',4320),timeout=4,source_address=('localhost',4320))  #前后两个端口号一定要是一致，不然会报错

#构建一对已连接的套接字对象,新创建的套接字都是不可继承的
  socket.socketpair(family=socket.AF_INET,type=socket.SOCK_STREAM,proto=0)

#从文件描述符获取到socket连接对象
  socket.fromfd(fd=ab.fileno(),family=socket.AF_INET,type=socket.SOCK_STREAM,proto=0)

#套接字对象的类型
  socket.SocketType

#返回套接字的5元组列表地址 ，支持IPV4/IPV6解析
  socket.getaddrinfo(host='localhost',port=3453,family=socket.AF_INET,type=socket.SOCK_STREAM,proto=socket.IPPROTO_TCP,flags=0)
  output:
  [(<AddressFamily.AF_INET: 2>, <SocketKind.SOCK_STREAM: 1>, 6, '', ('127.0.0.1', 3453))]

#获取主机名
  socket.gethostname()
  socket.getfqdn()
  socket.getfqdn(socket.gethostname())

#将主机名转化为IP地址
  socket.gethostbyname('www.baidu.com') #不支持IPV6解析
  socket.gethostbyname_ex('www.baidu.com') #返回三元组,(主机名,相同地址的其它可用主机名的列表,IPv4 地址列表)

#网络ip地址
  socket.gethostbyname(socket.getfqdn(socket.gethostname()))

#将ip地址转化为主机名，返回三元组(主机名,相同地址的其它可用主机名的列表,IPv4地址列表),支持IPV4/IPV6
  socket.gethostbyaddr('192.168.1.4')

#解析主机名或者IP地址
  socket.getnameinfo(('192.168.1.4',5434),0)

#判断是否支持IPV6
  socket.has_ipv6

#返回服务所使用的端口号
  socket.getservbyname('https','tcp') #第一个参数为服务协议：Https,Http;第二个为传输协议:Tcp Udp

#返回端口所对应的服务
  socket.getservbyport(443,'tcp')

#设置主机名(仅限于Unix)
  socket.sethostname(name)

#返回网卡信息的列表(仅限于Unix)
  socket.if_nameindex()

#32位字节存储Ip地址(序列化)
  socket.inet_aton('127.0.0.1')

#将32位字节转化为Ip地址(反序列化)
  socket.inet_ntoa(b'\x7f\x00\x00\x01')
图片

4.套接字函数
1).服务器端函数
  s.bind((host,port)) #将地址绑定到套接字,以(host,port)的元祖形式
  s.listen(num)  #建立最多num个连接，最好别太大
  s.accept()     #等待并接受客户端的连接，返回新的套接字对象和(host,port)元祖
2).客户端函数
  s.connect((host,port)) #建立与服务器的连接,以(host,port)的元祖形式
  s.connect_ex((host,port)) #和上面的功能差不多，只是出错了不抛异常，只是返回出错码
3).通用函数
  s.recv(size,flag)       #接收最多size个大小的数据，flag可以忽略，返回值为数据是字符串形式
  s.send(str,flag)        #发送str数据,返回值是要发送的字节数量，可能数据未全部发送
  s.sendall(str,flag)     #发送全部str数据，成功返回None，失败则抛出异常
  s.recv(size,flag)       #接受最多size个数据，并以字符串形式返回
  s.recvfrom(str,flag)    #与recv相同，但是返回值是(接收数据的字符串,发送数据的套接字地址)的元祖形式
  s.sendto(str,flag,address) #连接到当前套接字的远程地址。返回值是发送的字节数,主要用于UDP
  s.getpeername()     #返回连接套接字的远程地址。返回值通常是元组（host,port）
  s.getsockname()     #返回套接字自己的地址。通常是一个元组(host,port)
  s.setsockopt(level,optname,value) # 设置给定套接字选项的值。
#假如端口被socket使用过，并且利用socket.close()来关闭连接，但此时端口还没有释放，要经过TIME_WAIT的过程之后才能使用；为了实现端口的马上复用，可以选择setsocket()函数来达到目的。
#level：选项定义的层次。支持SOL_SOCKET、IPPROTO_TCP、IPPROTO_IP和IPPROTO_IPV6。
#optname：需设置的选项。SO_REUSEADDR SO_REUSEPORT
#value：设置选项的值。
  s.getsockopt(level,optname,buflen) #返回套接字选项的值。buflen:缓存长度
  s.settimeout(time)  #设置socket连接超时时间,单位为秒，超时一般在刚创建套接字时设置
  s.gettimeout()      #返回当前超时的时间，单位是秒，如果没有设置超时，则返回None。
  s.close()           #关闭套接字
  s.fileno()          #套接字的文件描述符
  s.shutdown(how)     # 关闭连接一边或两边
  s.setblocking(bool) #是否阻塞（默认True），如果设置False，那么accept和recv时一旦无数据，则报错。
  s.makefile()        #创建一个与该套接字相关联的文件
5.一个简单的客户端与服务端交互
  Server.py
  
  import socket 
  s=socket.socket(socket.AF_INET, socket.SOCK_STREAM)             # 创建socket对象
  s.bind(('127.0.0.1',4323))                                      # 绑定地址
  s.listen(5)                                                     # 建立5个监听
  while True:
      conn,addr= s.accept()                                       # 等待客户端连接
      print('欢迎{}'.format(addr))                              #打印访问的用户信息
      while True:
          data=conn.recv(1024) 
          dt=data.decode('utf-8')                                 #接收一个1024字节的数据 
          print('收到：',dt)
          aa=input('服务器发出：') 
          if aa=='quit':
              conn.close()                                        #关闭来自客户端的连接
              s.close()                                           #关闭服务器端连接
          else:
              conn.send(aa.encode('utf-8'))                       #发送数据
  Client.py

  import socket   
  import sys
  c=socket.socket()                                           # 创建socket对象
  c.connect(('127.0.0.1',4323))                                #建立连接
  while True:
      ab=input('客户端发出：')
      if ab=='quit':
          c.close()                                               #关闭客户端连接
          sys.exit(0)
      else:
          c.send(ab.encode('utf-8'))                               #发送数据
          data=c.recv(1024)                                        #接收一个1024字节的数据
          print('收到：',data.decode('utf-8'))                    #输出接收的信息
图片

可以看到我们实现了一个全双工的Tcp/Ip聊天工具，对于服务器和客户端来说，均可收发文件。
