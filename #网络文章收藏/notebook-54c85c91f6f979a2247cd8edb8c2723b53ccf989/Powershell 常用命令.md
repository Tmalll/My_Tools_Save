 

powershell 清除历史记录
Remove-Item (Get-PSReadlineOption).HistorySavePath
1
#powershell 美化
#Step 1. 安装必要的插件
# 当前用户安装
# 命令提示
# Install-Module -Name PSReadLine -AllowPrerelease -Force # PSReadLine 
# git 提示
# Install-Module posh-git -Scope CurrentUser # posh-git
# zsh 样式
# Install-Module oh-my-posh -Scope CurrentUser # oh-my-posh


Install-Module -Name PSReadLine -AllowPrerelease -Force # PSReadLine 
# 全局安装
Install-Module posh-git -Scope CurrentUser # posh-git
# zsh 样式
Install-Module oh-my-posh -Scope CurrentUser # oh-my-posh
1
2
3
4
5
6
7
8
9
10
11
12
13
14
然后编辑 powershell 的启动加载文件

code $profile
1
Import-Module posh-git
Import-Module oh-my-posh

Set-Theme PowerLine

# Set-Theme Paradox # 设置主题为 Paradox

Set-PSReadLineOption -PredictionSource History # 设置预测文本来源为历史记录

Set-PSReadlineKeyHandler -Key Tab -Function Complete # 设置 Tab 键补全
Set-PSReadLineKeyHandler -Key "Ctrl+d" -Function MenuComplete # 设置 Ctrl+d 为菜单补全和 Intellisense
Set-PSReadLineKeyHandler -Key "Ctrl+z" -Function Undo # 设置 Ctrl+z 为撤销
Set-PSReadLineKeyHandler -Key UpArrow -Function HistorySearchBackward # 设置向上键为后向搜索历史记录
Set-PSReadLineKeyHandler -Key DownArrow -Function HistorySearchForward # 设置向下键为前向搜索历史纪录
1
2
3
4
5
6
7
8
9
10
11
12
13
14
然后重启 powershell 后，就可以看到新样式了

#万一字体乱码
下载字体

Cascadia Code GitHub releases page(opens new window)

下载好后，安装后缀带 pl 的字体文件

安装好后在 powershell 中配置 或者在 windowsTerminal 的 settings.json 中配置 fontFace

微软官方也给了主题配置

Custom Color Schemes guide | Microsoft Docs(opens new window)

Windows Terminal Powerline Setup | Microsoft Docs(opens new window)

#PowerShell替换字符串(-replace操作符)(opens new window)
#关键词
PowerShell替换字符串(-replace操作符)

#摘要
PowerShell替换字符串(-replace操作符)

PowerShell对字符串的处理，具有非常强大的功能，强于任何一门脚本语言。我们今天来看看替换字符串操作。

PowerShell替换字符串(-replace操作符)

PowerShell对字符串的处理，具有非常强大的功能，强于任何一门脚本语言。我们今天来看看替换字符串操作。
如果我想把字符串“abcd”中的“a”替换为“x”，代码如下：

命令：

PS >"abcd" -replace "a", "x"  
xbcd  
1
2
如果我想把字符串“abcd”中的“bc”替换为空，代码如下：

命令：

PS >"abcd" -replace "bc"  
ad  
1
2
上再是两个简单替换，下面玩玩正则表达式替换：

如果我想把字符串“aaabcde”中的前面所有的字符“a”替换为空，代码如下：

命令：

PS >"aaabcde" -replace "^a\*"  
bcde
1
2
再来一个，如果我想把字符串“dfaq-adfdfsafd-asdfadf”，两个杠之间的替换为“xxx”，代码如下：

命令：

PS >"dfaq-adfdfsafd-asdfadf" -replace "-.\*-","-xxx-"
dfaq-xxx-asdfadf  
1
2
好了，关于PowerShell如何使用-replace操作符替换字符串，洪哥就介绍这么多。洪哥觉得例子是最好的学习方法，您觉得呢？

#Powershell 管道
通过管道可以过滤某些对象和对象的属性，这个功能很实用，因为很多时候我们并不是对所有的结果感兴趣，可能只会对某些结果感兴趣。如果要过滤对象可以使用Where-Object；如果要过滤对象的属性，可以使用Select-Object；如果要自定义个性化的过滤效果可以使用ForEach-Object。最后如果想过滤重复的结果，可是使用Get-Uinque。

#筛选管道结果中的对象
如果你只对管道结果的特定对象感兴趣，可是使用Where-Object对每个结果进行严格筛选，一旦满足你的标准才会保留，不满足标准的就会自动丢弃。例如你通过Get-service查看运行在机器上的当前服务，但是可能只关心哪些正在运行的服务，这时就可是通过每个服务的属性Status进行过滤。但是前提条件是你得事先知道待处理的对象拥有哪些属性。你可以通过Format-List * ，也可以通过Get-memeber。

PS C:Powershell> Get-service | Select-Object -First 1 | Format-List \*

Name                : AdobeARMservice
RequiredServices    : {}
CanPauseAndContinue : False
CanShutdown         : False
CanStop             : True
DisplayName         : Adobe Acrobat Update Service
DependentServices   : {}
MachineName         : .
ServiceName         : AdobeARMservice
ServicesDependedOn  : {}
ServiceHandle       :
Status              : Running
ServiceType         : Win32OwnProcess
Site                :
Container           :
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
PS C:Powershell> Get-service | Select-Object -First 1 | Get-Member -MemberType
Property

   TypeName: System.ServiceProcess.ServiceController

Name                MemberType Definition

----                ---------- ----------

CanPauseAndContinue Property   System.Boolean CanPauseAndContinue {get;}
CanShutdown               Property   System.Boolean CanShutdown {get;}
CanStop                       Property   System.Boolean CanStop {get;}
Container                     Property   System.ComponentModel.IContainer Container {g...
DependentServices       Property   System.ServiceProcess.ServiceController\[\] Dep...
DisplayName                Property   System.String DisplayName {get;set;}
MachineName              Property   System.String MachineName {get;set;}
ServiceHandle               Property   System.Runtime.InteropServices.SafeHandle Ser...
ServiceName                 Property   System.String ServiceName {get;set;}
ServicesDependedOn    Property   System.ServiceProcess.ServiceController\[\] Ser...
ServiceType                   Property   System.ServiceProcess.ServiceType ServiceType...
Site                               Property   System.ComponentModel.ISite Site {get;set;}
Status                           Property   System.ServiceProcess.ServiceControllerStatus...
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
知道了对象有哪些属性，要完成上面提到的需求就很容易了。

PS C:Powershell> get-service | Where-Object {$\_.Status -eq "Running"}

Status   Name               DisplayName

------   ----               -----------

Running  AdobeARMservice        Adobe Acrobat Update Service
Running  AppHostSvc                 Application Host Helper Service
Running  AppIDSvc               Application Identity
Running  Appinfo                Application Information
Running  AudioEndpointBu...    Windows Audio Endpoint Builder
Running  Audiosrv               Windows Audio
Running  BDESVC                 BitLocker Drive Encryption Service
Running  BFE                    Base Filtering Engine
Running  BITS                   Background Intelligent Transfer Ser...
Running  CcmExec                 SMS Agent Host
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
这里稍微解释一下，Where-Object的参数的是一个布尔表达式，$_代表过滤过程中经过管道的当前结果。另外Where-Object还有一个别名 “?” 更形象。

#选择对象的属性
包含在每一个对象中的属性可能有很多，但是并不是所有的属性你都感兴趣，这时可以使用Select-Object 限制对象的属性。接下来的例子演示如果获取机器上匿名帐号的完整信息。

PS C:Usersv-bali.FAREAST> Get-WmiObject Win32\_UserAccount -filter "LocalAccount=True AND Name='guest'"

AccountType  : 512
Caption          : myhomeguest
Domain          : myhome
SID                : S-1-5-21-3064017030-3269374297-2491181182-501
FullName       :
Name        : guest
1
2
3
4
5
6
7
8
如果你只对用户名、描述，启用感兴趣。

PS C:Powershell> Get-WmiObject Win32\_UserAccount -filter "LocalAccount=True AND
 Name='guest'" | Select-Object Name,Description,Disabled

Name                       Description                                 Disabled

----                           -----------                                 --------

guest                      Built-in account for gu...                      True
1
2
3
4
5
6
7
8
Select-Object也支持通配符。

Dir | Select-Object \* -exclude \*A\*
1
#限制对象的数量
列出最后修改的5个文件

PS C:Powershell> Dir | Select-Object -ExcludeProperty "\*N\*" -First 5

    目录: C:Powershell

Mode                LastWriteTime     Length Name

----                -------------     ------ ----

-a---        2011/11/24     18:30      67580 a.html
-a---        2011/11/24     20:04      26384 a.txt
-a---        2011/11/24     20:26      12060 alias
-a---        2011/11/25     11:20        556 employee.xml
-a---        2011/11/29     19:23      21466 function.ps1
1
2
3
4
5
6
7
8
9
10
11
12
13
列出占用CPU最大的5个进程

PS C:Powershell> get-process | sort -Descending cpu | select -First 5

Handles NPM(K)  PM(K)  WS(K) VM(M) CPU(s)   Id ProcessName

------- ------  -----  ----- ----- ------   -- -----------

   1336     98 844304 809388  1081 164.69 3060 iexplore
    224     10  74676  62468   188  81.10 4460 AcroRd32
    130      9  28264  39092   167  70.57 3436 dwm
    169      8   7576  29568   134  65.22 3364 notepad
    989     34  72484  35996   393  62.67 4724 BingDict
1
2
3
4
5
6
7
8
9
10
11
#逐个处理所有管道结果
如果想对管道结果进行逐个个性化处理可是使用ForEach-Object

ls | ForEach-Object {"文件名： 文件大小(M): " -f $\_.Name,$\_.Length/1M}
PS C:Powershell> ls | ForEach-Object {"文件名：{0} 文件大小{1}KB: " -f $\_.Name,
($\_.length/1kb).tostring()}
文件名：a.html 文件大小65.99609375KB:
文件名：a.txt 文件大小25.765625KB:
文件名：alias 文件大小11.77734375KB:
文件名：employee.xml 文件大小0.54296875KB:
文件名：function.ps1 文件大小20.962890625KB:
文件名：LogoTestConfig.xml 文件大小0.181640625KB:
文件名：ls.html 文件大小3.37890625KB:
1
2
3
4
5
6
7
8
9
10
#删除重复对象
Get-Unique可以从已排序的对象列表中删除重复对象。Get-Unique会逐个遍历对象，每次遍历时都会与前一个对象进行比较，如果和前一个对象相等就会抛弃当前对象，否则就保留。所以如果对象列表中没有排序，Get-Unique不能完全发挥作用，只能保证相邻对象不重复。

PS C:Powershell> 1,2,1,2 | Get-Unique
1
2
1
2
PS C:Powershell> 1,2,1,2 | Sort-Object |Get-Unique
1
2
PS C:Powershell> ls | foreach{$\_.extension} | Sort-Object |Get-Unique

.bat
.html
.ps1
.txt
.vbs
.xml
