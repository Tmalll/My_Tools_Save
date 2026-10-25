
http抓包工具 HttpToolkit-1.26.1

抓到了就好，而且这个结果很有价值。

```
User-Agent: WinHttpClient
```

这说明 MuMu Downloader **基本就是用 WinHTTP 封装写的**，没有伪装浏览器 UA。

---

## 根据你的需求，我推荐的软件（按推荐程度排序）

你的需求其实很明确：

* ✅ 免费
* ✅ 最好开源
* ✅ 能抓 Windows EXE
* ✅ 能看 HTTPS
* ✅ 最好支持代理模式（你已经有 Proxifier）
* ✅ 最好能导出 curl

下面是我实际会推荐的。

---

# ① mitmproxy（★★★★★ 最推荐）

官方网站：

[mitmproxy](https://mitmproxy.org?utm_source=chatgpt.com)

GitHub：

[mitmproxy GitHub](https://github.com/mitmproxy/mitmproxy?utm_source=chatgpt.com)

## 优点

* 完全免费
* 完全开源
* 没有功能限制
* 社区很活跃
* HTTP/1、HTTP/2 都支持
* HTTPS 支持很好
* 可以配合 Proxifier
* 可以导出 curl

例如：

```
mitmweb
```

浏览器打开：

```
http://127.0.0.1:8081
```

界面其实已经很不错。

---

# ② Reqable（★★★★☆）

官方网站：

[Reqable](https://reqable.com?utm_source=chatgpt.com)

国产。

### 优点

* UI 很漂亮
* Windows 支持很好
* 导出 curl
* HTTPS 简单

### 缺点

不是开源。

免费版有一些高级功能限制。

不过抓 MuMu 完全够了。

---

# ③ mitmproxy + Proxifier（我觉得最舒服）

其实你已经有：

```
Proxifier
```

那基本已经解决了：

> 怎么让程序走代理

剩下：

```
Proxifier
      ↓

mitmproxy

      ↓

Internet
```

即可。

这种方案比 HTTP Toolkit 自由得多。

---

# ④ Fiddler Classic

现在我已经不太推荐了。

原因：

* UI 太老
* 很多年没大更新
* .NET Framework
* HTTPS 配置麻烦

唯一优势：

教程很多。

---

# ⑤ Burp Suite Community

免费。

但是：

完全是给 Web 安全人员设计的。

抓一个 Downloader 属于：

拿大炮打蚊子。

---

# ⑥ Charles

很好。

但是收费。

---

# HTTP Toolkit 为什么难用？

其实它设计目标就不是：

> Windows 下所有程序抓包。

它更偏向：

* 浏览器
* Electron
* Node.js
* APP 调试

Anything 模式就是：

```
开一个代理

↓

等你自己配代理
```

很多 Windows Downloader 根本不会自动走系统代理。

所以你最后还是用了：

```
Proxifier
```

实际上：

**真正起作用的是 Proxifier。**

HTTP Toolkit 只是：

```
代理服务器
```

而已。

---

# 如果是我搭环境

我会这样：

```
MuMu Downloader

↓

Proxifier

↓

mitmproxy

↓

Internet
```

以后：

任何：

```
EXE

CLI

PowerShell

curl

Node

Python

Go
```

全部都能抓。

---

# 另外，你现在已经知道 UA 了

其实已经可以把 curl 写得和官方非常接近：

```bash
curl ^
  --http1.1 ^
  -A "WinHttpClient" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -H "Connection: Keep-Alive" ^
  --data-urlencode "architecture=x86_64" ^
  --data-urlencode "channel=gw-win" ^
  --data-urlencode "downloader_version=6.0.1" ^
  --data-urlencode "language=zh-Hans" ^
  --data-urlencode "machine={...}" ^
  --data-urlencode "n=MuMu_6.0.1_PH3Px8C" ^
  --data-urlencode "uuid=fffc5ae7-ef13-4a1d-a9a9-b4b7ec24cfa2" ^
  https://api.mumu.nie.netease.com/api/v2/download/nx
```

---

## 最后推荐一个很多人不知道的工具：Echo Mirage

如果你以后主要是**逆向 Windows 客户端**（下载器、启动器、游戏更新器等），我反而建议了解一下 **Echo Mirage**。

它不是传统意义上的抓包软件，而是 **API Hook 网络分析工具**，直接 Hook `WinHTTP`、`WinINet` 等 Windows 网络 API，因此：

* **不需要安装 CA 证书**；
* **不需要代理**；
* **即使程序不走系统代理，也能看到请求**；
* **还能看到调用栈和明文 Header/Body**。

不过，它**已经停止维护多年，也不是开源软件**，兼容性不如现代工具，更适合逆向分析而不是日常使用。

综合来看，如果以后你经常分析这类 Windows 下载器，我会建议保留 **Proxifier + mitmproxy** 作为主力方案：稳定、免费、开源，而且适用范围比 HTTP Toolkit 更广。
