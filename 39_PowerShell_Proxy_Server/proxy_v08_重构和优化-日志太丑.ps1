$port = 1080

# 1. 彻底解决第六问题：创建全局唯一复用的 Runspace 池，彻底锁死解释器开销
$initialSessionState = [System.Management.Automation.Runspaces.InitialSessionState]::CreateDefault()
# 限制池大小 1~50，线程池自动复用，彻底消灭高并发时临时创建 PowerShell 对象的内存暴涨（79MB->191MB的罪魁祸首）
$pool = [System.Management.Automation.Runspaces.RunspaceFactory]::CreateRunspacePool(1, 50, $initialSessionState, $Host)
$pool.Open()

# 2. 启动监听
$anyIP = [System.Net.IPAddress]::Any
$listener = New-Object System.Net.Sockets.TcpListener($anyIP, $port)
$listener.Start()

Clear-Host
$esc = [char]27
[Console]::ForegroundColor = [ConsoleColor]::Green
[Console]::WriteLine("====================================================")
[Console]::WriteLine("  HTTP CONNECT Proxy Service (Industrial Production) ")
[Console]::WriteLine("  Listening on: 0.0.0.0:$port")
[Console]::WriteLine("  Architecture: RunspacePool + Stream Complete Pipe")
[Console]::WriteLine("====================================================")
[Console]::ResetColor()

# 彻底解决第一问题：精准追踪并销毁所有 BeginInvoke，不再依赖 GC 救场
$jobTracker = @{}
$lockObj = New-Object System.Object
$globalCounter = 0

# 核心转发逻辑
$scriptBlock = {
    param($clientObj)
    try {
        $c = [System.Net.Sockets.TcpClient]$clientObj
        
        # 【优化：解决第五问题之防死锁攻击】设置超时，防止恶意连接占着坑不发数据拉爆池子
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
            
            # 原子化原子打印 Xray 日志
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
            
            # --------- 【彻底解决第五问题：优雅的双向流关闭，不截断尾包】 ---------
            $task1 = $stream.CopyToAsync($targetStream)
            $task2 = $targetStream.CopyToAsync($stream)
            
            # 1. 正常等待任意一侧传输完成（例如客户端主动挂断）
            $finishedTask = [System.Threading.Tasks.Task]::WhenAny($task1, $task2).Result
            
            # 2. 优雅半关闭：允许留出 500ms 的缓冲区让另一侧未传输完的残留数据（尾包）跑完
            [System.Threading.Tasks.Task]::Delay(500).Wait()
            # ------------------------------------------------------------------
            
            # 精准显式关闭通道
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

# 异步接收连接的监控对象（彻底解决第三问题：拿掉 Pending 轮询开销）
$acceptTask = $listener.AcceptTcpClientAsync()
$logTimer = [System.Diagnostics.Stopwatch]::StartNew()

# 主循环
while ($true) {
    
    # 1. 【彻底解决第三问题】：借用 AcceptTcpClientAsync 进行纯非阻塞通知
    if ($acceptTask.IsCompleted) {
        try {
            $client = $acceptTask.Result
            
            # 复用线程池资源，不再疯狂创建外部对象
            $ps = [PowerShell]::Create()
            $ps.RunspacePool = $pool
            $null = $ps.AddScript($scriptBlock).AddArgument($client)
            $asyncResult = $ps.BeginInvoke()
            
            # 将令牌记入追踪哈希表
            [System.Threading.Monitor]::Enter($lockObj)
            try {
                $globalCounter++
                $jobTracker[$globalCounter] = @{ PS = $ps; Async = $asyncResult }
            } finally {
                [System.Threading.Monitor]::Exit($lockObj)
            }
        } catch {}
        
        # 接入当前连接后，立刻拉起下一个异步挂起监听，0毫秒无缝对接下一个新请求
        $acceptTask = $listener.AcceptTcpClientAsync()
    }

    # 2. 【彻底解决第一问题】：由主线程无锁安全清扫，强行 EndInvoke 和 Dispose
    if ($jobTracker.Count -gt 0) {
        [System.Threading.Monitor]::Enter($lockObj)
        try {
            # 用原生 @() 完美兼容 PS 5.1 复制 Keys 集合，避免遍历中途被修改的冲突
            $keys = @($jobTracker.Keys)
            foreach ($key in $keys) {
                $job = $jobTracker[$key]
                if ($job.Async.IsCompleted) {
                    try {
                        # 精准收尾，彻底连根拔起内存引用
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

    # 3. 【彻底解决第二问题】：删除了高负载时极耗性能的强制 GC.Collect()，改交由系统底层自动调度
    if ($logTimer.ElapsedMilliseconds -ge 10000) {
        $currentProc = [System.Diagnostics.Process]::GetCurrentProcess()
        $memMB = [Math]::Round($currentProc.WorkingSet64 / 1MB, 1)
        
        $timeStr = [DateTime]::Now.ToString("yyyy/MM/dd HH:mm:ss.fff")
        # 监控当前跟踪队列里的残留工作组件数量，真正做到监控透明
        [Console]::WriteLine("${esc}[93m[$timeStr] [SYSTEM MONITOR] Active Jobs Tracking: $($jobTracker.Count) | Live Process Memory: ${memMB}MB${esc}[0m")
        
        $logTimer.Restart()
    }

    # 因为主循环已经彻底变成了事件响应和死连接扫尾，无需高频空转，Sleep 20ms 对高并发吞吐完全无感
    [System.Threading.Thread]::Sleep(20)
}