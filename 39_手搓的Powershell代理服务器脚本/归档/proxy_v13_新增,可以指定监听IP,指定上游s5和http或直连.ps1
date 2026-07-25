$port = 1080

# ====================================================================
# 【全局配置区】配置监听 IP 与上游前置代理
# ====================================================================
# 1. 监听 IP 设置: 可以填 "0.0.0.0", "127.0.0.1", "any", 或者留空 "" 
$ListenIP = "0.0.0.0"

# 2. 上游代理设置 (Outbound Proxy):
#    - "direct" : 本机直接发起连接 (原有行为)
#    - "socks5://127.0.0.1:7890" : 转发给上游 SOCKS5 代理
#    - "http://127.0.0.1:7890"   : 转发给上游 HTTP 代理 (CONNECT 隧道模式)
$Outbound = "direct"

# ====================================================================
# 【系统原生配置区】
# ====================================================================
$IPMethod = 0   # 0 = 系统默认, 4 = 强行优先 IPv4, 6 = 强行优先 IPv6
$DebugMode = 1  # 1: 开启底层排查监控 | 0: 彻底关闭

# ====================================================================
# 强制开启当前控制台的 ANSI/VT100 虚拟终端颜色支持
# ====================================================================
$Win32Signatures = @'
[DllImport("kernel32.dll", SetLastError = true)]
public static extern IntPtr GetStdHandle(int nStdHandle);
[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);
[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);
'@
$type = Add-Type -MemberDefinition $Win32Signatures -Name "Win32Utils" -Namespace "Win32" -PassThru
$hOut = $type::GetStdHandle(-11)
$mode = 0
if ($type::GetConsoleMode($hOut, [ref]$mode)) { $null = $type::SetConsoleMode($hOut, $mode -bor 0x0004) }

# ====================================================================
# 【核心高性能 Core v3.2.2】集成前置上游协议状态机转发（已修正 C# 语法手误）
# ====================================================================
$ProxyCoreSource = @'
using System;
using System.Net;
using System.Net.Sockets;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

public class ProxyCore {
    private static long _activeJobs = 0;
    public static long ActiveJobs { get { return Interlocked.Read(ref _activeJobs); } }

    public static void ProcessClient(object clientObj, int ipMethodConfig, string outboundType, string outboundHost, int outboundPort) {
        Interlocked.Increment(ref _activeJobs);
        Task.Run(async () => {
            TcpClient c = null;
            NetworkStream stream = null;
            TcpClient targetClient = null;
            NetworkStream targetStream = null;
            CancellationTokenSource cts = null;
            string remoteEndPoint = "Unknown";

            try {
                c = (TcpClient)clientObj;
                c.ReceiveTimeout = 30000;
                c.SendTimeout = 30000;
                stream = c.GetStream();
                remoteEndPoint = c.Client.RemoteEndPoint.ToString();

                int firstByteInt = stream.ReadByte();
                if (firstByteInt < 0) return;
                byte firstByte = (byte)firstByteInt;

                string targetHost = null;
                int targetPort = 0;
                bool isSocks = false;
                string logHostStr = "";

                // ----------------------------------------------------
                #region [解析客户端请求协议 (入站)]
                // ----------------------------------------------------
                if (firstByte == 0x05) {
                    isSocks = true;
                    int nmethods = stream.ReadByte();
                    if (nmethods <= 0) return;
                    for (int i = 0; i < nmethods; i++) { stream.ReadByte(); }

                    byte[] handshakeReply = new byte[] { 0x05, 0x00 };
                    await stream.WriteAsync(handshakeReply, 0, handshakeReply.Length);

                    int reqVer = stream.ReadByte();
                    int reqCmd = stream.ReadByte();
                    int reqRsv = stream.ReadByte();
                    int reqAtyp = stream.ReadByte();

                    if (reqVer != 0x05 || reqCmd != 0x01) return;

                    if (reqAtyp == 0x01) {
                        int ip1 = stream.ReadByte(); int ip2 = stream.ReadByte();
                        int ip3 = stream.ReadByte(); int ip4 = stream.ReadByte();
                        targetHost = string.Format("{0}.{1}.{2}.{3}", ip1, ip2, ip3, ip4);
                        logHostStr = targetHost;
                    }
                    else if (reqAtyp == 0x03) {
                        int domainLen = stream.ReadByte();
                        if (domainLen <= 0) return;
                        byte[] domainBytes = new byte[domainLen];
                        for (int i = 0; i < domainLen; i++) { domainBytes[i] = (byte)stream.ReadByte(); }
                        targetHost = Encoding.ASCII.GetString(domainBytes);
                        logHostStr = targetHost;
                    }
                    else if (reqAtyp == 0x04) {
                        byte[] ipBytes = new byte[16];
                        for (int i = 0; i < 16; i++) { ipBytes[i] = (byte)stream.ReadByte(); }
                        IPAddress ipv6Addr = new IPAddress(ipBytes);
                        targetHost = ipv6Addr.ToString();
                        logHostStr = string.Format("[{0}]", targetHost);
                    }
                    else { return; }

                    int p1 = stream.ReadByte();
                    int p2 = stream.ReadByte(); // 已修复：恢复为正确的 C# 局部变量声明
                    targetPort = (p1 << 8) | p2;
                }
                else {
                    byte[] buffer = new byte[4096];
                    buffer[0] = firstByte;
                    int bytesRead = await stream.ReadAsync(buffer, 1, buffer.Length - 1);
                    int totalBytes = bytesRead + 1;

                    string request = Encoding.ASCII.GetString(buffer, 0, totalBytes);
                    Match match = Regex.Match(request, @"^CONNECT\s+([^:]+):(\d+)");
                    if (match.Success) {
                        targetHost = match.Groups[1].Value;
                        targetPort = Convert.ToInt32(match.Groups[2].Value);
                        logHostStr = targetHost;
                    }
                }
                #endregion

                if (!string.IsNullOrEmpty(targetHost) && targetPort > 0) {
                    string timeStr = DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss.fff");
                    string padRemote = string.Format("{0,-22}", remoteEndPoint);
                    string protoStr = isSocks ? "\x1b[35m[SOCKS5]" : "\x1b[33m[HTTP]  ";

                    bool connected = false;
                    string routeLogStr = "";

                    // ----------------------------------------------------
                    #region [核心出站路由与上游握手状态机]
                    // ----------------------------------------------------
                    if (outboundType == "DIRECT") {
                        // 【直连模式】
                        IPAddress finalConnectIP = null;
                        try {
                            IPAddress[] ips = Dns.GetHostAddresses(targetHost);
                            if (ipMethodConfig == 4) {
                                foreach (var ip in ips) { if (ip.AddressFamily == AddressFamily.InterNetwork) { finalConnectIP = ip; break; } }
                                if (finalConnectIP == null && ips.Length > 0) finalConnectIP = ips[0];
                            }
                            else if (ipMethodConfig == 6) {
                                foreach (var ip in ips) { if (ip.AddressFamily == AddressFamily.InterNetworkV6) { finalConnectIP = ip; break; } }
                                if (finalConnectIP == null && ips.Length > 0) finalConnectIP = ips[0];
                            }
                            else {
                                if (ips.Length > 0) finalConnectIP = ips[0];
                            }
                        } catch {}

                        if (finalConnectIP != null) {
                            try {
                                targetClient = new TcpClient(finalConnectIP.AddressFamily);
                                targetClient.ReceiveTimeout = 30000;
                                targetClient.SendTimeout = 30000;
                                routeLogStr = (finalConnectIP.AddressFamily == AddressFamily.InterNetworkV6) ? 
                                    string.Format(" -> [{0}]", finalConnectIP) : string.Format(" -> {0}", finalConnectIP);
                                
                                await targetClient.ConnectAsync(finalConnectIP, targetPort);
                                connected = true;
                            } catch {}
                        }
                    }
                    else if (outboundType == "SOCKS5") {
                        // 【转发到上游 SOCKS5 代理】
                        try {
                            targetClient = new TcpClient(AddressFamily.InterNetwork);
                            targetClient.ReceiveTimeout = 30000;
                            targetClient.SendTimeout = 30000;
                            routeLogStr = string.Format(" -> [S5-Parent: {0}:{1}]", outboundHost, outboundPort);
                            
                            await targetClient.ConnectAsync(outboundHost, outboundPort);
                            targetStream = targetClient.GetStream();

                            // 1. 发送匿名验证握手
                            byte[] s5Auth = new byte[] { 0x05, 0x01, 0x00 };
                            await targetStream.WriteAsync(s5Auth, 0, s5Auth.Length);
                            byte[] s5AuthResp = new byte[2];
                            int readResp = await targetStream.ReadAsync(s5AuthResp, 0, 2);
                            if (readResp == 2 && s5AuthResp[0] == 0x05 && s5AuthResp[1] == 0x00) {
                                // 2. 发送 CONNECT 请求 (统一采用域名打包机制发送给上游)
                                byte[] domainBytes = Encoding.ASCII.GetBytes(targetHost);
                                byte[] s5Req = new byte[7 + domainBytes.Length];
                                s5Req[0] = 0x05; // VER
                                s5Req[1] = 0x01; // CMD (CONNECT)
                                s5Req[2] = 0x00; // RSV
                                s5Req[3] = 0x03; // ATYP (Domain)
                                s5Req[4] = (byte)domainBytes.Length;
                                Array.Copy(domainBytes, 0, s5Req, 5, domainBytes.Length);
                                s5Req[5 + domainBytes.Length] = (byte)((targetPort >> 8) & 0xFF);
                                s5Req[6 + domainBytes.Length] = (byte)(targetPort & 0xFF);

                                await targetStream.WriteAsync(s5Req, 0, s5Req.Length);
                                byte[] s5ConnResp = new byte[10];
                                int readConn = await targetStream.ReadAsync(s5ConnResp, 0, 4);
                                if (readConn == 4 && s5ConnResp[0] == 0x05 && s5ConnResp[1] == 0x00) {
                                    int skipAtyp = s5ConnResp[3];
                                    if (skipAtyp == 0x01) { byte[] b = new byte[6]; await targetStream.ReadAsync(b, 0, 6); }
                                    else if (skipAtyp == 0x03) { int len = targetStream.ReadByte(); byte[] b = new byte[len + 2]; await targetStream.ReadAsync(b, 0, len + 2); }
                                    else if (skipAtyp == 0x04) { byte[] b = new byte[18]; await targetStream.ReadAsync(b, 0, 18); }
                                    connected = true;
                                }
                            }
                        } catch {}
                    }
                    else if (outboundType == "HTTP") {
                        // 【转发到上游 HTTP 代理】
                        try {
                            targetClient = new TcpClient(AddressFamily.InterNetwork);
                            targetClient.ReceiveTimeout = 30000;
                            targetClient.SendTimeout = 30000;
                            routeLogStr = string.Format(" -> [HTTP-Parent: {0}:{1}]", outboundHost, outboundPort);

                            await targetClient.ConnectAsync(outboundHost, outboundPort);
                            targetStream = targetClient.GetStream();

                            string connectHeader = string.Format("CONNECT {0}:{1} HTTP/1.1\r\nHost: {0}:{1}\r\nProxy-Connection: Keep-Alive\r\n\r\n", targetHost, targetPort);
                            byte[] connectHeaderBytes = Encoding.ASCII.GetBytes(connectHeader);
                            await targetStream.WriteAsync(connectHeaderBytes, 0, connectHeaderBytes.Length);

                            byte[] httpRespBuffer = new byte[1024];
                            int totalHttpRead = 0;
                            while (totalHttpRead < httpRespBuffer.Length) {
                                int r = await targetStream.ReadAsync(httpRespBuffer, totalHttpRead, 1);
                                if (r <= 0) break;
                                totalHttpRead++;
                                if (totalHttpRead >= 4 && 
                                    httpRespBuffer[totalHttpRead - 4] == 0x0D && httpRespBuffer[totalHttpRead - 3] == 0x0A &&
                                    httpRespBuffer[totalHttpRead - 2] == 0x0D && httpRespBuffer[totalHttpRead - 1] == 0x0A) {
                                    break;
                                }
                            }
                            string httpRespStr = Encoding.ASCII.GetString(httpRespBuffer, 0, totalHttpRead);
                            if (httpRespStr.Contains("200")) {
                                connected = true;
                            }
                        } catch {}
                    }
                    #endregion

                    // ----------------------------------------------------
                    #region [双向数据管道泵建立]
                    // ----------------------------------------------------
                    if (connected) {
                        Console.WriteLine(string.Format("\x1b[34m[{0}] \x1b[37m{1} {2} \x1b[36mtcp:{3}:{4}\x1b[93m{5} \x1b[32m[ACCEPTED]\x1b[0m", 
                            timeStr, padRemote, protoStr, logHostStr, targetPort, routeLogStr));

                        if (targetStream == null) targetStream = targetClient.GetStream();

                        if (isSocks) {
                            byte[] socksSuccessReply = new byte[] { 0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };
                            await stream.WriteAsync(socksSuccessReply, 0, socksSuccessReply.Length);
                        }
                        else {
                            byte[] httpSuccessReply = Encoding.ASCII.GetBytes("HTTP/1.1 200 Connection Established\r\n\r\n");
                            await stream.WriteAsync(httpSuccessReply, 0, httpSuccessReply.Length);
                        }

                        cts = new CancellationTokenSource();
                        cts.CancelAfter(120000);

                        try {
                            Task task1 = stream.CopyToAsync(targetStream, 8192, cts.Token);
                            Task task2 = targetStream.CopyToAsync(stream, 8192, cts.Token);

                            Task completedTask = await Task.WhenAny(task1, task2);
                            try {
                                if (completedTask == task1) targetClient.Client.Shutdown(SocketShutdown.Send);
                                else c.Client.Shutdown(SocketShutdown.Send);
                            } catch {}

                            await Task.WhenAll(task1, task2).ConfigureAwait(false);
                        } catch {}
                    }
                    else {
                        if (isSocks) {
                            byte[] errReply = new byte[] { 0x05, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };
                            stream.Write(errReply, 0, errReply.Length);
                        }
                        Console.WriteLine(string.Format("\x1b[31m[{0}] {1} {2} tcp:{3}:{4} [CONNECT FAILED]\x1b[0m", 
                            timeStr, padRemote, protoStr, logHostStr, targetPort));
                    }
                    #endregion
                }
            }
            catch {}
            finally {
                if (cts != null) { try { cts.Dispose(); } catch {} }
                if (targetStream != null) { try { targetStream.Dispose(); } catch {} }
                if (targetClient != null) { try { targetClient.Close(); targetClient.Dispose(); } catch {} }
                if (stream != null) { try { stream.Dispose(); } catch {} }
                if (c != null) { try { c.Close(); c.Dispose(); } catch {} }
                Interlocked.Decrement(ref _activeJobs);
            }
        }).ConfigureAwait(false);
    }
}
'@

Add-Type -TypeDefinition $ProxyCoreSource -Language CSharp

# ====================================================================
# 宿主层：监听 IP 解析与上游变量格式化
# ====================================================================
$ListenIPAddress = [System.Net.IPAddress]::Any
if (-not [string]::IsNullOrEmpty($ListenIP) -and $ListenIP -ne "any" -and $ListenIP -ne "0.0.0.0") {
    $ListenIPAddress = [System.Net.IPAddress]::Parse($ListenIP)
}

$OutboundType = "DIRECT"
$OutboundHost = ""
$OutboundPort = 0

if ($Outbound -ne "direct" -and -not [string]::IsNullOrEmpty($Outbound)) {
    if ($Outbound -match "^(socks5|http)://([^:]+):(\d+)") {
        $OutboundType = $Matches[1].ToUpper()
        $OutboundHost = $Matches[2]
        $OutboundPort = [Convert]::ToInt32($Matches[3])
    } else {
        Write-Error "Outbound 格式配置错误，必须为 'direct'、'socks5://ip:port' 或 'http://ip:port'"
        exit
    }
}

$listener = New-Object System.Net.Sockets.TcpListener($ListenIPAddress, $port)
$listener.Start()

# ====================================================================
# 主控制台初始化显示与调度循环
# ====================================================================
Clear-Host
$esc = [char]27
$outboundDesc = if($OutboundType -eq "DIRECT"){"Direct Connect (None)"}else{"${OutboundType} Chain -> ${OutboundHost}:${OutboundPort}"}

[Console]::WriteLine("${esc}[32m====================================================${esc}[0m")
[Console]::WriteLine("${esc}[32m  Dual Proxy Service (HTTP & SOCKS5 Pure .NET v3.2.2)${esc}[0m")
[Console]::WriteLine("${esc}[32m  Listen IP : $($ListenIPAddress.ToString()):$port")
[Console]::WriteLine("${esc}[32m  Engine    : Native .NET ThreadPool Async Infrastructure")
[Console]::WriteLine("${esc}[32m  Outbound  : $outboundDesc ${esc}[0m")
[Console]::WriteLine("${esc}[32m====================================================${esc}[0m")

$logTimer = [System.Diagnostics.Stopwatch]::StartNew()

while ($true) {
    if ($listener.Pending()) {
        try {
            $client = $listener.AcceptTcpClient()
            [ProxyCore]::ProcessClient($client, $IPMethod, $OutboundType, $OutboundHost, $OutboundPort)
        } catch {}
    }

    if ($logTimer.ElapsedMilliseconds -ge 10000) {
        if ($DebugMode -eq 1) {
            $currentProc = [System.Diagnostics.Process]::GetCurrentProcess()
            $currentProc.Refresh()
            
            $activeJobs = [ProxyCore]::ActiveJobs
            if ($activeJobs -eq 0) {
                [System.GC]::Collect(2, [System.GCCollectionMode]::Forced, $true, $true)
                [System.GC]::WaitForPendingFinalizers()
            }

            $heapMB      = [Math]::Round([System.GC]::GetTotalMemory($false) / 1MB, 1)
            $privateMB   = [Math]::Round($currentProc.PrivateMemorySize64 / 1MB, 1)
            $workingMB   = [Math]::Round($currentProc.WorkingSet64 / 1MB, 1)
            $handleCount = $currentProc.HandleCount
            $threadCount = $currentProc.Threads.Count
            
            $timeStr = [DateTime]::Now.ToString("yyyy/MM/dd HH:mm:ss.fff")
            [Console]::WriteLine("${esc}[93m[$timeStr] [SYSTEM MONITOR] Jobs: $activeJobs | Threads: $threadCount | Handles: $handleCount | Heap: ${heapMB}MB | Private: ${privateMB}MB | WorkingSet: ${workingMB}MB${esc}[0m")
        }
        $logTimer.Restart()
    }
    [System.Threading.Thread]::Sleep(20)
}