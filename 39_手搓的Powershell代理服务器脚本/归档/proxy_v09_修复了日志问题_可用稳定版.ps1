$port = 1080

# ====================================================================
# 【核心修复】：利用 Windows API 强制开启当前控制台的 ANSI/VT100 虚拟终端颜色支持
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
$hOut = $type::GetStdHandle(-11) # STD_OUTPUT_HANDLE
$mode = 0
if ($type::GetConsoleMode($hOut, [ref]$mode)) {
    # 0x0004 代表 ENABLE_VIRTUAL_TERMINAL_PROCESSING
    $null = $type::SetConsoleMode($hOut, $mode -bor 0x0004)
}
# ====================================================================

# 1. 初始化线程池（锁死解释器开销，保持极低内存占用）
$initialSessionState = [System.Management.Automation.Runspaces.InitialSessionState]::CreateDefault()
$pool = [System.Management.Automation.Runspaces.RunspaceFactory]::CreateRunspacePool(1, 50, $initialSessionState, $Host)
$pool.Open()

# 2. 启动监听
$anyIP = [System.Net.IPAddress]::Any
$listener = New-Object System.Net.Sockets.TcpListener($anyIP, $port)
$listener.Start()

Clear-Host
$esc = [char]27
[Console]::WriteLine("${esc}[32m====================================================${esc}[0m")
[Console]::WriteLine("${esc}[32m  HTTP CONNECT Proxy Service (VT Production v2.1)   ${esc}[0m")
[Console]::WriteLine("${esc}[32m  Listening on: 0.0.0.0:$port")
[Console]::WriteLine("${esc}[32m  Log Mode: Native ANSI Color + Precise Alignment   ${esc}[0m")
[Console]::WriteLine("${esc}[32m====================================================${esc}[0m")

# 异步追踪追踪哈希表
$jobTracker = @{}
$lockObj = New-Object System.Object
$globalCounter = 0

# 核心转发逻辑
$scriptBlock = {
    param($clientObj)
    try {
        $c = [System.Net.Sockets.TcpClient]$clientObj
        $c.ReceiveTimeout = 30000
        $c.SendTimeout = 30000
        
        $stream = $c.GetStream()
        $remoteEndPoint = $c.Client.RemoteEndPoint.ToString()
        
        # 预读请求
        $buffer = New-Object Byte[] 4096
        $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
        if ($bytesRead -le 0) { return }
        $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $bytesRead)
        
        if ($request -match "^CONNECT\s+([^:]+):(\d+)") {
            $targetHost = $Matches[1]
            $targetPort = [Convert]::ToInt32($Matches[2])
            
            # --- 原子化纯净色彩打印（现在有了 API 护航，绝对不会显示乱码） ---
            $esc = [char]27
            $timeStr = [DateTime]::Now.ToString("yyyy/MM/dd HH:mm:ss.fff")
            $padRemote = "{0,-22}" -f $remoteEndPoint
            
            $atomicLog = "${esc}[34m[$timeStr] ${esc}[37m$padRemote ${esc}[36mtcp:$targetHost`:$targetPort ${esc}[32m[ACCEPTED]${esc}[0m"
            [Console]::WriteLine($atomicLog)

            # 连接目标服务器
            $targetClient = New-Object System.Net.Sockets.TcpClient
            $targetClient.ReceiveTimeout = 30000
            $targetClient.SendTimeout = 30000
            $targetClient.Connect($targetHost, $targetPort)
            $targetStream = $targetClient.GetStream()
            
            # 隧道建立成功响应
            $response = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 200 Connection Established`r`n`r`n")
            $stream.Write($response, 0, $response.Length)
            
            # 异步非阻塞盲转
            $task1 = $stream.CopyToAsync($targetStream)
            $task2 = $targetStream.CopyToAsync($stream)
            
            $finishedTask = [System.Threading.Tasks.Task]::WhenAny($task1, $task2).Result
            [System.Threading.Tasks.Task]::Delay(500).Wait() # 优雅留出500ms冲洗尾包
            
            $targetStream.Dispose()
            $targetClient.Dispose()
        }
    } catch {
        # 异常静默
    } finally {
        if ($stream) { $stream.Dispose() }
        if ($c) { $c.Dispose() }
    }
}

$acceptTask = $listener.AcceptTcpClientAsync()
$logTimer = [System.Diagnostics.Stopwatch]::StartNew()

# 主循环
while ($true) {
    # 1. 接入新连接
    if ($acceptTask.IsCompleted) {
        try {
            $client = $acceptTask.Result
            $ps = [PowerShell]::Create()
            $ps.RunspacePool = $pool
            $null = $ps.AddScript($scriptBlock).AddArgument($client)
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

    # 2. 精准无漏主动扫尾清扫
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

    # 3. 定时健康体检
    if ($logTimer.ElapsedMilliseconds -ge 10000) {
        $currentProc = [System.Diagnostics.Process]::GetCurrentProcess()
        $memMB = [Math]::Round($currentProc.WorkingSet64 / 1MB, 1)
        
        $timeStr = [DateTime]::Now.ToString("yyyy/MM/dd HH:mm:ss.fff")
        # 帅气的明黄色系统监控行，无乱码
        [Console]::WriteLine("${esc}[93m[$timeStr] [SYSTEM MONITOR] Active Jobs Tracking: $($jobTracker.Count) | Live Process Memory: ${memMB}MB${esc}[0m")
        
        $logTimer.Restart()
    }

    [System.Threading.Thread]::Sleep(20)
}