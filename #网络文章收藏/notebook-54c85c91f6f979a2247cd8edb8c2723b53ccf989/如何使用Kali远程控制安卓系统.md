 

一、查看Metasploit工具中可以在Android系统下使用的payload类型
可以看到有9种可以在Android下使用的payload

这些payload可以作为我们后面攻击的软件的生成工具
二、端口映射问题
如果我们的手机与使用的计算机处在同一局域网，但是虚拟机使用的是NAT模式。那么只有我们使用的计算机才可以访问到该虚拟机，其他设备都是无法访问该虚拟机的。那么就需要端口映射了
假设计算机的IP为（192.168.1.100）。Android手机的IP为（192.168.1.*）。虚拟机的IP为（192.168.169.130）：
第一步：打开VMware虚拟机网络编辑器

第二步：设置ANT端口的映射（设置之后，凡是发往计算机9999端口的流量都会转发到虚拟机的9999端口上，这样虚拟机就能够接收到Android的连接了）


三、远程控制Android手机演示
本案例中，Linux采用桥接模式，与Android手机连接在同一局域网中
①使用msfvenom命令生成被控端payload
第一步：下面我以“android/meterpreter/reverse_tcp”类型的payload为例，然后查看该类型需要的参数（图片显示需要IP和端口）
代码语言：javascript
复制
msfconsole #进入Metasploit软件use android/meterpreter/reverse_tcp #选择payload类型show options #查看payload所需参数

查看完参数之后，退出Metasploit
第二步：生成payload（msfvenom命令中默认没有apk这种格式的文件。此处使用R来替代-f和-o）

可以在kali中找到生成的这个文件，我的是放在/root目录下 

②为软件签名
为什么要签名：
如果使用上面ANT端口映射的话，那么创建的payload就不能够使用虚拟机的IP地址，而只能使用计算机的IP地址
并且这个apk不能直接在Android中直接运行，因为这个apk需要一个签名才可以运行。下面我们为这个apk生成一个签名。创建签名需要使用Keytool、JARsigner、zipalign这3个软件。Kali中内置了前2个，第3个需要安装
第一步：使用keytool生成一个key文件。会让你输入该key的名称、单位、地址等等信息，最终生成一个key文件
代码语言：javascript
复制
keytool -genkey -v -keystore my-release-key.Keystore -alias alias_name -keyalg RSA -keysize 2048 -validity 10000


第二步：使用该key文件配合JARsigner为APK签名
代码语言：javascript
复制
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.Keystore pentest.apk alias_name

第三步：然后使用JARsigner验证签名
代码语言：javascript
复制
jarsigner -verify -verbose -certs pentest.apk

到此为止，就完成了签名过程，此apk就可以在Android中使用了
③开启主动端，等待被控端连接

第一步：使用msfconsole开启Metasploit

第二步：主动端使用handler

第三步：为handler设置参数（payload版本类型、IP地址、端口）

第四步：开启监听（等待被控端接入）

④将生成好的被控端payload安装在Android中，并打开连接到主控端

第一步：将kali中的这个.apk想办法弄到手机里安装（自己想办法），安装时可能会提示危险，不管它，继续安装即可。安装完成之后会在手机上看到一个软件，点击打开就行（不会真有软件打开，一闪而过）


第二步：在Android中打开此软件之后，Kali就会收到连接，之后就可以做相关的事情了

第三步：查看Android中可以使用的命令和功能。Android比较使用的功能有两类：
一类是Webcam（主要与摄像头和录音有关）
一类是Android

第四步：查看Android中可以使用的所有摄像头（可以看到有前置、后置两个摄像头）

⑤远程控制Android手机拍照

第一步：使用后置摄像头（编号为1）拍照（照片存放在/root/目录下）

第二步：在root目录下可以看到有一张拍摄的照片

⑥远程控制Android手机录视频

第一步：使用后置摄像头录制视频（可以看到在root目录下生成一个网页）

第二步：打开这个网页，Android会实时的录制视频，并在该网页中显示


⑦远程控制Android手机录音

直接输入record_mic命令启动Android中的录音机，并在root目录下生成一个wav录音文件


⑧查看Android手机是否已经执行root权限


⑨导出Android手机的电话本

可以看到或得目标手机中的43位联系人方式，并存在“contacts_dump_20190624072811.txt”文件中


⑩导出Android手机的短信记录

可以看到短信已经被导出，存放在“sms_dump_20190624072946.txt”文件中


⑪远程控制目标手机发送短信

向“152*****”的手机发送信息，内容为“helloworld”

⑫对目标手机进行定位，查看目标手机位置信息

查看给的网页就可以实时的查看目标手机所在位置（是一个谷歌地图，可能在国内打不开这个网页）

