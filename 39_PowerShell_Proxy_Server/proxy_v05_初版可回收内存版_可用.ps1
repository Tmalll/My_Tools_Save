$port = 1080

# 1. 启动监听
$anyIP = [System.Net.IPAddress]::Any
$listener = New-Object System.Net.Sockets.TcpListener($anyIP, $port)
$listener.Start()

Clear-Host
[Console]::ForegroundColor = [ConsoleColor]::Green
[Console]::WriteLine("====================================================")
[Console]::WriteLine("  HTTP CONNECT Proxy Service (Async IO Stable v1.6) ")
[Console]::WriteLine("  Listening on: 0.0.0.0:$port")
[Console]::WriteLine("  Log Mode: Xray Style + Kernel Non-Blocking Streams")
[Console]::WriteLine("====================================================")
[Console]::ResetColor()

# 核心转发与日志输出代码块（抛弃了旧版哈希表追踪，回归最稳定的随用随丢机制，无任何报错隐患）
$scriptBlock = {
    param($clientObj)
    try {
        $c = [System.Net.Sockets.TcpClient]$clientObj
        $stream = $c.GetStream()
        $remoteEndPoint = $c.Client.RemoteEndPoint.ToString()
        
        $buffer = New-Object Byte[] 4096
        $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
        if ($bytesRead -le 0) { $c.Close(); return }
        $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $bytesRead)
        
        if ($request -match "^CONNECT\s+([^:]+):(\d+)") {
            $targetHost = $Matches[1]
            $targetPort = [Convert]::ToInt32($Matches[2])
            
            # 打印纯净、原汁原味的 Xray 日志（不包含进程获取，降级托管对象暴涨）
            $timeStr = [DateTime]::Now.ToString("yyyy/MM/dd HH:mm:ss")
            [Console]::ForegroundColor = [ConsoleColor]::Blue
            [Console]::Write("[$timeStr] ")
            [Console]::ForegroundColor = [ConsoleColor]::Gray
            [Console]::Write("$remoteEndPoint ")
            [Console]::ForegroundColor = [ConsoleColor]::Cyan
            [Console]::Write("tcp:$targetHost`:$targetPort ")
            [Console]::ForegroundColor = [ConsoleColor]::Green
            [Console]::WriteLine("[ACCEPTED]")
            [Console]::ResetColor()

            # 连接目标服务器
            $targetClient = New-Object System.Net.Sockets.TcpClient
            $targetClient.Connect($targetHost, $targetPort)
            $targetStream = $targetClient.GetStream()
            
            # 隧道建立成功响应
            $response = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 200 Connection Established`r`n`r`n")
            $stream.Write($response, 0, $response.Length)
            
            # --------- 融合同行核心建议：使用系统内核的 .NET 异步管道盲转 ---------
            # 彻底砍掉耗费线程栈和 CPU 的 while 忙循环检测
            # 开启两个非阻塞的异步任务，交由 Windows 内核完成端口进行数据对倒
            $task1 = $stream.CopyToAsync($targetStream)
            $task2 = $targetStream.CopyToAsync($stream)
            
            # 当任意一方断开连接、或传输彻底结束时，立刻触发同步退出
            [System.Threading.Tasks.Task]::WhenAny($task1, $task2).Wait()
            # ------------------------------------------------------------------
            
            # 显式精准关闭通道
            $targetStream.Dispose()
            $targetClient.Dispose()
        }
    } catch {
        # 异常静默
    }
    finally {
        if ($stream) { $stream.Dispose() }
        if ($c) { $c.Close(); $c.Dispose() }
    }
}

# 监控计时器
$logTimer = [System.Diagnostics.Stopwatch]::StartNew()

# 主循环
while ($true) {
    if ($listener.Pending()) {
        $client = $listener.AcceptTcpClient()
        # 创建后无保留，随用随丢，给底层 GC 留出最佳的自动回收发挥空间
        $ps = [PowerShell]::Create().AddScript($scriptBlock).AddArgument($client)
        $null = $ps.BeginInvoke() 
    }

    # --- 每隔 6 秒，在主线程空闲时进行资源深度清扫与监控 ---
    if ($logTimer.ElapsedMilliseconds -ge 6000) {
        # 顺手强制清理毫无引用的僵尸空间和流碎片
        [System.GC]::Collect([System.GC]::MaxGeneration, [System.GCCollectionMode]::Forced, $false)
        
        $currentProc = [System.Diagnostics.Process]::GetCurrentProcess()
        $memMB = [Math]::Round($currentProc.WorkingSet64 / 1MB, 1)
        
        $timeStr = [DateTime]::Now.ToString("yyyy/MM/dd HH:mm:ss")
        [Console]::ForegroundColor = [ConsoleColor]::Yellow
        [Console]::WriteLine("[$timeStr] [HEALTH MONITOR] Live Process Memory: ${memMB}MB")
        [Console]::ResetColor()
        
        $logTimer.Restart()
    }

    [System.Threading.Thread]::Sleep(5)
}