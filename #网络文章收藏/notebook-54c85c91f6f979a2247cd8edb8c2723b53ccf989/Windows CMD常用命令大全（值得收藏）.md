 

Windows CMD常用命令大全
前言
1. 常用命令 
1.1 cd命令
1.2 查看目录文件
1.3 创建目录和删除目录
1.4 查看本机ip
1.5 清除屏幕
1.6 复制文件
1.7 移动文件
1.8 删除文件
1.9 ping
1.10 taskkill
1.11 netstat 查看网络连接状态
1.12 find
1.13 tracert
2. 查看cmd下的命令
3. 辅助符号或命令
3.1 ‘|’
3.2 重定向输出符号> >>
3.3 重定向输入符号< <<
3.4 终止一直在运行的命令ctrl+c
3.5 清空cmd窗口内容命令cls
3.6 常用工具
4. 附加一些Windows下的快捷键
前言
cmd是command的缩写.即命令行 。

虽然随着计算机产业的发展，Windows 操作系统的应用越来越广泛，DOS 面临着被淘汰的命运，但是因为它运行安全、稳定，有的用户还在使用，所以一般Windows 的各种版本都与其兼容，用户可以在Windows 系统下运行DOS，中文版Windows XP中的命令提示符进一步提高了与DOS下操作命令的兼容性，用户可以在命令提示符直接输入中文调用文件。

作为一个开发者，我们用的最多的就是windows，但是对于cmd，我不知道大家熟不熟，反正我是一直不怎么熟悉。平时操作linux比较多，反而忽视了cmd相关命令，这里大致总结一些常用的命令，作为记录。

1. 常用命令
1.1 cd命令
代码语言：javascript
复制
//进入d盘
D:
//进入F盘
F:
代码语言：javascript
复制
cd /?     //获取使用帮助

cd \       //跳转到硬盘的根目录

cd C:\WINDOWS  //跳转到当前硬盘的其他文件

d:        //跳转到其他硬盘

cd /d e:\software    //跳转到其他硬盘的其他文件夹，注意此处必须加/d参数。否则无法跳转。

cd..      //跳转到上一层目录
1.2 查看目录文件
代码语言：javascript
复制
//查看当前目录下的文件，类似于linux下的ls
dir

如果是需要查看隐藏文件的或者更多操作的话，可以使用dir /?来查看其它用法，cmd这点挺好的。

代码语言：javascript
复制
python /?

1.3 创建目录和删除目录
代码语言：javascript
复制
//创建目录
md 目录名（文件夹）
//删除目录
rd 目录名（文件夹）
1.4 查看本机ip
代码语言：javascript
复制
ipconfig
1.5 清除屏幕
代码语言：javascript
复制
cls
类似于linux下的clear

1.6 复制文件
代码语言：javascript
复制
copy 路径\文件名 路径\文件名 ：把一个文件拷贝到另一个地方。 
1.7 移动文件
代码语言：javascript
复制
move 路径\文件名 路径\文件名 ：把一个文件移动（就是剪切+复制）到另一个地方。 
1.8 删除文件
代码语言：javascript
复制
//这个是专门删除文件的，不能删除文件夹
del 文件名
1.9 ping
代码语言：javascript
复制
//用来测试网络是否畅通
ping ip(主机名)
1.10 taskkill
列出所有任务及进程号，杀进程

代码语言：javascript
复制
taskkill

taskkill /?  获取使用帮助
taskkill是用来终止进程的。具体的命令规则如下：

代码语言：javascript
复制
TASKKILL [/S system [/U username [/P [password]]]]
{ 
    [/FI filter] [/PID processid | /IM imagename] } [/F] [/T]
描述:

这个命令行工具可用来结束至少一个进程。

可以根据进程 id 或映像名（Image）来结束进程。

参数列表:

代码语言：javascript
复制
/S system 指定要连接到的远程系统。
/U [domain\]user 指定应该在哪个用户上下文
执行这个命令:

代码语言：javascript
复制
/P [password] 为提供的用户上下文指定密码。如果忽略，提示输入。
/F 指定要强行终止的进程。
/FI filter 指定筛选进或筛选出查询的的任务。
/PID process id 指定要终止的进程的PID。
/IM image name 指定要终止的进程的映像名称。通配符 '*'可用来指定所有映像名。
/T Tree kill: 终止指定的进程和任何由此启动的子进程。
/? 显示帮助/用法。
例如:

代码语言：javascript
复制
TASKKILL /S system /F /IM notepad.exe /T
TASKKILL /PID 1230 /PID 1241 /PID 1253 /T
TASKKILL /F /IM QQ.exe
TASKKILL /F /IM notepad.exe /IM mspaint.exe
TASKKILL /F /FI "PID ge 1000" /FI "WINDOWTITLE ne untitle*"
TASKKILL /F /FI "USERNAME eq NT AUTHORITY\SYSTEM" /IM notepad.exe

1.11 netstat 查看网络连接状态
显示协议统计信息和当前 TCP/IP 网络连接。该命令可以查看当前机器建立的所有网络链接状态，以及对应哪个进程。

代码语言：javascript
复制
netstat -help 获取命令行使用帮助信息

netstat -ano  //查看网络连接、状态以及对应的进程id
语法：

代码语言：javascript
复制
netstat [选项]
参数：

代码语言：javascript
复制
-a或--all：显示所有连线中的Socket；
-A<网络类型>或--<网络类型>：列出该网络类型连线中的相关地址；
-c或--continuous：持续列出网络状态；
-C或--cache：显示路由器配置的快取信息；
-e或--extend：显示网络其他相关信息；
-F或--fib：显示FIB；
-g或--groups：显示多重广播功能群组组员名单；
-h或--help：在线帮助；
-i或--interfaces：显示网络界面信息表单；
-l或--listening：显示监控中的服务器的Socket；
-M或--masquerade：显示伪装的网络连线；
-n或--numeric：直接使用ip地址，而不通过域名服务器；
-N或--netlink或--symbolic：显示网络硬件外围设备的符号连接名称；
-o或--timers：显示计时器；
-p或--programs：显示正在使用Socket的程序识别码和程序名称；
-r或--route：显示Routing Table；
-s或--statistice：显示网络工作信息统计表；
-t或--tcp：显示TCP传输协议的连线状况；
-u或--udp：显示UDP传输协议的连线状况；
-v或--verbose：显示指令执行过程；
-V或--version：显示版本信息；
-w或--raw：显示RAW传输协议的连线状况；
-x或--unix：此参数的效果和指定"-A unix"参数相同；
--ip或--inet：此参数的效果和指定"-A inet"参数相同。
1.12 find
代码语言：javascript
复制
find /？获取使用帮助

netstat -ano|find ".8"   //使用管道符，进行模糊查询
1.13 tracert
tracert也被称为Windows路由跟踪实用程序，在命令提示符（cmd）中使用tracert命令可以用于确定IP数据包访问目标时所选择的路径。

代码语言：javascript
复制
  tracert /? 获取使用帮助
2. 查看cmd下的命令
1、使用help命令，查看所有的dos命令

使用这个命令之后，我们可以看到所有的dos命令，并且后面还有中文的解释。简直不要太赞，这样我们就可以根据自己的需求要找到想要使用的命令。

2、找到命令之后，使用 命令+ /?来查看该命令下的其他属性

代码语言：javascript
复制
命令 -help    //第1种形式的使用帮助

命令  /?       //第2种形式的使用帮助
注意：这些字符只能是英文的

3. 辅助符号或命令
3.1 ‘|’
“|”cmd命令中|代表前一个的输出代表后一个的输入

查找特定ip的网络连接及进程号：netstat -ano|find "192.168.1.10"

3.2 重定向输出符号> >>
将原本输出到命令窗口的内容，转存到文件中，如jstack 12912 >d:/s.txt 打印线程到指定文件

cmd > 重定向输出并覆盖源文件。

例如

代码语言：javascript
复制
 echo hello >c:\1.txt  // 1.txt的文件内容先被清空，然后写入hello。
cmd >>重定向输出追加到文件末尾

例如：

代码语言：javascript
复制
 echo hello >>c:\1.txt  // 在1.txt文件末尾加上hello
3.3 重定向输入符号< <<
代码语言：javascript
复制
cmd < file
使cmd命令从file读入

代码语言：javascript
复制
 cmd << text
从命令行读取输入，直到一个与text相同的行结束。

除非使用引号把输入括起来，此模式将对输入内容进行shell变量替换。

如果使用 <<- ，则会忽略接下来输入行首的tab，结束行也可以是一堆tab再加上一个与text相同的内容，可以参考后面的例子。

代码语言：javascript
复制
cmd <<< word
把word（而不是文件word）和后面的换行作为输入提供给cmd。

代码语言：javascript
复制
  cmd <> file
以读写模式把文件file重定向到输入，文件file不会被破坏。仅当应用程序利用了这一特性时，它才是有意义的。

代码语言：javascript
复制
 cmd >| file
功能同>，但即便在设置了noclobber时也会覆盖file文件，注意用的是|而非一些书中说的!，目前仅在csh中仍沿用>!实现这一功能。

3.4 终止一直在运行的命令ctrl+c
有时某个命令一直打印输出结果(如ping 192.168.1.10 -t)，我们想终止这个命令的执行，直接按ctrl+c即可。

3.5 清空cmd窗口内容命令cls
有时cmd内容太多，滚动费尽，需要清空屏幕内容，直接输入cls即可

cmd命令中，按键盘的向上箭头可以直接复制前一个命令

3.6 常用工具
Process Explorer，查询进程的详细信息，如查询java进程启动参数，运行环境，线程信息、网络连接信息、使用了哪些dll，打开了什么句柄。包含注册表、Socket、文件等等。

下载地址：https://docs.microsoft.com/en-us/sysinternals/downloads/process-explorer

4. 附加一些Windows下的快捷键
代码语言：javascript
复制
win+E                 打开文件管器

win+D                 显示桌面

win+L                 锁计算机

alt+F4                 关闭当前程序

ctrl+shift+Esc    打开任务管理器（或者ctrl+alt+delete）

ctrl+F                  在一个文本或者网页里面查找，相当实用（退出一般按ESC）

ctrl+A                  选中所有文本
