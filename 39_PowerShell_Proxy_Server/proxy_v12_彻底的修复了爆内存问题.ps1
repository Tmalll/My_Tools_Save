$port = 1080

# ====================================================================
# 【全局策略开关】控制代理服务器请求上游域名时的 IP 协议优先级
#  0 = 系统判断默认,  4 = 强行优先 IPv4,  6 = 强行优先 IPv6
# ====================================================================
$IPMethod = 0
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
# 【底噪兼容版 Core】去除了所有 C# 6.0 高级语法，完美兼容旧版编译器
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
    
    // 兼容 C# 5.0 的传统属性写法
    public static long ActiveJobs {
        get { return Interlocked.Read(ref _activeJobs); }
    }

    public static void ProcessClient(object clientObj, int ipMethodConfig) {
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
                bool isDomainRequest = false;
                string logHostStr = "";

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
                        isDomainRequest = true;
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
                    int p2 = stream.ReadByte();
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
                        if (!Regex.IsMatch(targetHost, @"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$") && !targetHost.Contains(":")) {
                            isDomainRequest = true;
                        }
                    }
                }

                if (!string.IsNullOrEmpty(targetHost) && targetPort > 0) {
                    string timeStr = DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss.fff");
                    string padRemote = string.Format("{0,-22}", remoteEndPoint);
                    string protoStr = isSocks ? "\x1b[35m[SOCKS5]" : "\x1b[33m[HTTP]  ";

                    bool connected = false;
                    string resolvedIPStr = "";
                    IPAddress finalConnectIP = null;

                    if (isDomainRequest) {
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
                    }
                    else {
                        IPAddress.TryParse(targetHost, out finalConnectIP);
                    }

                    if (finalConnectIP != null) {
                        try {
                            targetClient = new TcpClient(finalConnectIP.AddressFamily);
                            targetClient.ReceiveTimeout = 30000;
                            targetClient.SendTimeout = 30000;

                            resolvedIPStr = (finalConnectIP.AddressFamily == AddressFamily.InterNetworkV6) ? 
                                string.Format(" -> [{0}]", finalConnectIP) : 
                                string.Format(" -> {0}", finalConnectIP);
                            
                            await targetClient.ConnectAsync(finalConnectIP, targetPort);
                            connected = true;
                        } catch {}
                    }

                    if (connected) {
                        Console.WriteLine(string.Format("\x1b[34m[{0}] \x1b[37m{1} {2} \x1b[36mtcp:{3}:{4}\x1b[93m{5} \x1b[32m[ACCEPTED]\x1b[0m", 
                            timeStr, padRemote, protoStr, logHostStr, targetPort, resolvedIPStr));

                        targetStream = targetClient.GetStream();

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
                                if (completedTask == task1) {
                                    targetClient.Client.Shutdown(SocketShutdown.Send);
                                } else {
                                    c.Client.Shutdown(SocketShutdown.Send);
                                }
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
# 主控制台初始化显示与调度
# ====================================================================
$anyIP = [System.Net.IPAddress]::Any
$listener = New-Object System.Net.Sockets.TcpListener($anyIP, $port)
$listener.Start()

Clear-Host
$esc = [char]27
$methodDesc = if($IPMethod -eq 4){"Force IPv4"}elseif($IPMethod -eq 6){"Force IPv6"}else{"OS Default (Dual-Stack)"}
[Console]::WriteLine("${esc}[32m====================================================${esc}[0m")
[Console]::WriteLine("${esc}[32m  Dual Proxy Service (HTTP & SOCKS5 Pure .NET v3.1) ${esc}[0m")
[Console]::WriteLine("${esc}[32m  Listening on: 0.0.0.0:$port")
[Console]::WriteLine("${esc}[32m  Engine: Native .NET ThreadPool Async Infrastructure")
[Console]::WriteLine("${esc}[32m  IP Strategy: $methodDesc ${esc}[0m")
[Console]::WriteLine("${esc}[32m====================================================${esc}[0m")

$logTimer = [System.Diagnostics.Stopwatch]::StartNew()

while ($true) {
    if ($listener.Pending()) {
        try {
            $client = $listener.AcceptTcpClient()
            [ProxyCore]::ProcessClient($client, $IPMethod)
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