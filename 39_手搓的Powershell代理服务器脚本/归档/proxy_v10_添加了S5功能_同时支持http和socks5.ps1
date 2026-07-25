$port = 1080

# ====================================================================
# 【全局策略开关】控制代理服务器请求上游域名时的 IP 协议优先级
#  0 = 系统判断默认,  4 = 强行优先 IPv4,  6 = 强行优先 IPv6
# ====================================================================
$IPMethod = 0

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
if ($type::GetConsoleMode($hOut, [ref]$mode)) {
    $null = $type::SetConsoleMode($hOut, $mode -bor 0x0004)
}
# ====================================================================

$initialSessionState = [System.Management.Automation.Runspaces.InitialSessionState]::CreateDefault()
$pool = [System.Management.Automation.Runspaces.RunspaceFactory]::CreateRunspacePool(1, 50, $initialSessionState, $Host)
$pool.Open()

$anyIP = [System.Net.IPAddress]::Any
$listener = New-Object System.Net.Sockets.TcpListener($anyIP, $port)
$listener.Start()

Clear-Host
$esc = [char]27
$methodDesc = if($IPMethod -eq 4){"Force IPv4"}elseif($IPMethod -eq 6){"Force IPv6"}else{"OS Default (Dual-Stack)"}
[Console]::WriteLine("${esc}[32m====================================================${esc}[0m")
[Console]::WriteLine("${esc}[32m  Dual Proxy Service (HTTP & SOCKS5 Adaptive v2.7) ${esc}[0m")
[Console]::WriteLine("${esc}[32m  Listening on: 0.0.0.0:$port")
[Console]::WriteLine("${esc}[32m  Log Mode: Native ANSI Color + Dual-Stack Fix")
[Console]::WriteLine("${esc}[32m  IP Strategy: $methodDesc ${esc}[0m")
[Console]::WriteLine("${esc}[32m====================================================${esc}[0m")

$jobTracker = @{}
$lockObj = New-Object System.Object
$globalCounter = 0

$scriptBlock = {
    param($clientObj, $ipMethodConfig)
    try {
        $c = [System.Net.Sockets.TcpClient]$clientObj
        $c.ReceiveTimeout = 30000
        $c.SendTimeout = 30000
        
        $stream = $c.GetStream()
        $remoteEndPoint = $c.Client.RemoteEndPoint.ToString()
        
        $firstByteInt = $stream.ReadByte()
        if ($firstByteInt -lt 0) { return }
        $firstByte = [byte]$firstByteInt

        $targetHost = $null   
        $targetPort = 0
        $isSocks = $false
        $isDomainRequest = $false  
        $logHostStr = ""      

        if ($firstByte -eq 0x05) {
            $isSocks = $true
            $nmethods = $stream.ReadByte()
            if ($nmethods -le 0) { return }
            for ($i = 0; $i -lt $nmethods; $i++) { $null = $stream.ReadByte() }

            $handshakeReply = [byte[]](0x05, 0x00)
            $stream.Write($handshakeReply, 0, $handshakeReply.Length)

            $reqVer = $stream.ReadByte()
            $reqCmd = $stream.ReadByte()
            $reqRsv = $stream.ReadByte()
            $reqAtyp = $stream.ReadByte()
            
            if ($reqVer -ne 0x05 -or $reqCmd -ne 0x01) { return } 

            if ($reqAtyp -eq 0x01) {
                $ip1 = $stream.ReadByte(); $ip2 = $stream.ReadByte(); $ip3 = $stream.ReadByte(); $ip4 = $stream.ReadByte()
                $targetHost = "$ip1.$ip2.$ip3.$ip4"
                $logHostStr = $targetHost
            }
            elseif ($reqAtyp -eq 0x03) {
                $isDomainRequest = $true
                $domainLen = $stream.ReadByte()
                if ($domainLen -le 0) { return }
                $domainBytes = New-Object Byte[] $domainLen
                for ($i = 0; $i -lt $domainLen; $i++) { $domainBytes[$i] = [byte]$stream.ReadByte() }
                $targetHost = [System.Text.Encoding]::ASCII.GetString($domainBytes)
                $logHostStr = $targetHost
            }
            elseif ($reqAtyp -eq 0x04) {
                $ipBytes = New-Object Byte[] 16
                for ($i = 0; $i -lt 16; $i++) { $ipBytes[$i] = [byte]$stream.ReadByte() }
                $targetHost = [System.Net.IPAddress]$ipBytes
                $logHostStr = "[$($targetHost.ToString())]"
            }
            else { return }

            $p1 = $stream.ReadByte()
            $p2 = $stream.ReadByte()
            $targetPort = ($p1 -shl 8) -bor $p2
        }
        else {
            $buffer = New-Object Byte[] 4096
            $buffer[0] = $firstByte
            $bytesRead = $stream.Read($buffer, 1, $buffer.Length - 1)
            $totalBytes = $bytesRead + 1
            
            $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $totalBytes)
            if ($request -match "^CONNECT\s+([^:]+):(\d+)") {
                $targetHost = $Matches[1]
                $targetPort = [Convert]::ToInt32($Matches[2])
                $logHostStr = $targetHost
                if ($targetHost -notmatch "^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$" -and !$targetHost.Contains(":")) {
                    $isDomainRequest = $true
                }
            }
        }

        if ($targetHost -and $targetPort -gt 0) {
            $esc = [char]27
            $timeStr = [DateTime]::Now.ToString("yyyy/MM/dd HH:mm:ss.fff")
            $padRemote = "{0,-22}" -f $remoteEndPoint
            $protoStr = if ($isSocks) { "${esc}[35m[SOCKS5]" } else { "${esc}[33m[HTTP]  " }
            
            $connected = $false
            $resolvedIPStr = "" 
            $finalConnectIP = $null
            
            # --- 核心修复：根据目标类型与协议过滤，精确定位连接 IP ---
            if ($isDomainRequest) {
                try {
                    $ips = [System.Net.Dns]::GetHostAddresses($targetHost)
                    if ($ipMethodConfig -eq 4) {
                        $finalConnectIP = $ips | Where-Object { $_.AddressFamily -eq 'InterNetwork' } | Select-Object -First 1
                        if (!$finalConnectIP) { $finalConnectIP = $ips | Select-Object -First 1 }
                    }
                    elseif ($ipMethodConfig -eq 6) {
                        $finalConnectIP = $ips | Where-Object { $_.AddressFamily -eq 'InterNetworkV6' } | Select-Object -First 1
                        if (!$finalConnectIP) { $finalConnectIP = $ips | Select-Object -First 1 }
                    }
                    else {
                        # 默认策略：系统自适应，但由于下面显式指定 AddressFamily，这里顺应系统的第一个解析
                        $finalConnectIP = $ips | Select-Object -First 1
                    }
                } catch {
                    # DNS 解析失败
                }
            } else {
                # 已经是纯 IP 地址（字符串或 IPAddress 对象）
                $finalConnectIP = if ($targetHost -is [System.Net.IPAddress]) { $targetHost } else { [System.Net.IPAddress]::Parse($targetHost) }
            }

            if ($finalConnectIP) {
                try {
                    # 【关键修正】：使用带有 AddressFamily 参数的构造函数，强行同步两端的协议栈
                    $targetClient = New-Object System.Net.Sockets.TcpClient($finalConnectIP.AddressFamily)
                    $targetClient.ReceiveTimeout = 30000
                    $targetClient.SendTimeout = 30000
                    
                    $resolvedIPStr = if($finalConnectIP.AddressFamily -eq 'InterNetworkV6') { " -> [$($finalConnectIP.ToString())]" } else { " -> $($finalConnectIP.ToString())" }
                    
                    $targetClient.Connect($finalConnectIP, $targetPort)
                    $connected = $true
                } catch {
                    # 连接失败异常捕获
                }
            }

            if ($connected) {
                $atomicLog = "${esc}[34m[$timeStr] ${esc}[37m$padRemote $protoStr ${esc}[36mtcp:$logHostStr`:$targetPort${esc}[93m$resolvedIPStr ${esc}[32m[ACCEPTED]${esc}[0m"
                [Console]::WriteLine($atomicLog)

                $targetStream = $targetClient.GetStream()
                
                if ($isSocks) {
                    $socksSuccessReply = [byte[]](0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00)
                    $stream.Write($socksSuccessReply, 0, $socksSuccessReply.Length)
                } else {
                    $httpSuccessReply = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 200 Connection Established`r`n`r`n")
                    $stream.Write($httpSuccessReply, 0, $httpSuccessReply.Length)
                }
                
                $task1 = $stream.CopyToAsync($targetStream)
                $task2 = $targetStream.CopyToAsync($stream)
                $null = [System.Threading.Tasks.Task]::WhenAny($task1, $task2).Result
                [System.Threading.Tasks.Task]::Delay(500).Wait()
                
                $targetStream.Dispose()
                $targetClient.Dispose()
            } else {
                if ($isSocks) {
                    # 响应 SOCKS5 连接失败 (0x03 网络不可达)
                    $errReply = [byte[]](0x05, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00)
                    $stream.Write($errReply, 0, $errReply.Length)
                }
                [Console]::WriteLine("${esc}[31m[$timeStr] $padRemote $protoStr tcp:$logHostStr`:$targetPort [CONNECT FAILED]${esc}[0m")
            }
        }
    } catch {} finally {
        if ($stream) { $stream.Dispose() }
        if ($c) { $c.Dispose() }
    }
}

$acceptTask = $listener.AcceptTcpClientAsync()
$logTimer = [System.Diagnostics.Stopwatch]::StartNew()

while ($true) {
    if ($acceptTask.IsCompleted) {
        try {
            $client = $acceptTask.Result
            $ps = [PowerShell]::Create()
            $ps.RunspacePool = $pool
            $null = $ps.AddScript($scriptBlock).AddArgument($client).AddArgument($IPMethod)
            $asyncResult = $ps.BeginInvoke()
            
            [System.Threading.Monitor]::Enter($lockObj)
            try {
                $globalCounter++
                $jobTracker[$globalCounter] = @{ PS = $ps; Async = $asyncResult }
            } finally {
                [System.Threading.Monitor]::Exit($lockObj)
            }
        } catch {}
        $acceptTask = $listener.AcceptTcpClientAsync()
    }

    if ($jobTracker.Count -gt 0) {
        [System.Threading.Monitor]::Enter($lockObj)
        try {
            $keys = @($jobTracker.Keys)
            foreach ($key in $keys) {
                $job = $jobTracker[$key]
                if ($job.Async.IsCompleted) {
                    try {
                        $null = $job.PS.EndInvoke($job.Async)
                        $job.PS.Dispose()
                    } catch {}
                    $jobTracker.Remove($key)
                }
            }
        } finally {
            [System.Threading.Monitor]::Exit($lockObj)
        }
    }

    if ($logTimer.ElapsedMilliseconds -ge 10000) {
        $currentProc = [System.Diagnostics.Process]::GetCurrentProcess()
        $memMB = [Math]::Round($currentProc.WorkingSet64 / 1MB, 1)
        $timeStr = [DateTime]::Now.ToString("yyyy/MM/dd HH:mm:ss.fff")
        [Console]::WriteLine("${esc}[93m[$timeStr] [SYSTEM MONITOR] Active Jobs Tracking: $($jobTracker.Count) | Live Process Memory: ${memMB}MB${esc}[0m")
        $logTimer.Restart()
    }

    [System.Threading.Thread]::Sleep(20)
}