$port = 1080

# 1. 启动监听
$anyIP = [System.Net.IPAddress]::Any
$listener = New-Object System.Net.Sockets.TcpListener($anyIP, $port)
$listener.Start()

Clear-Host
[Console]::ForegroundColor = [ConsoleColor]::Green
[Console]::WriteLine("====================================================")
[Console]::WriteLine("  HTTP CONNECT Proxy Service (Async IO Stable v1.7) ")
[Console]::WriteLine("  Listening on: 0.0.0.0:$port")
[Console]::WriteLine("  Log Mode: Xray Style + High-Precision Milliseconds")
[Console]::WriteLine("====================================================")
[Console]::ResetColor()

# 核心转发与日志输出代码块
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
            
            # 【优化】：加入 .fff 精确到毫秒的时间戳
            $timeStr = [DateTime]::Now.ToString("yyyy/MM/dd HH:mm:ss.fff")
            [Console]::ForegroundColor = [ConsoleColor]::Blue
            [Console]::Write("[$timeStr] ")
            [Console]::ForegroundColor = [ConsoleColor]::Gray
            # 靠左对齐源 IP 端口，保证日志上下完美对齐
            [Console]::Write("{0,-22}", $remoteEndPoint)
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
            
            # 内核级非阻塞管道异步盲转
            $task1 = $stream.CopyToAsync($targetStream)
            $task2 = $targetStream.CopyToAsync($stream)
            
            [System.Threading.Tasks.Task]::WhenAny($task1, $task2).Wait()
            
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
        $ps = [PowerShell]::Create().AddScript($scriptBlock).AddArgument($client)
        $null = $ps.BeginInvoke() 
    }

    # --- 每隔 6 秒，在主线程空闲时进行资源深度清扫与高精监控 ---
    if ($logTimer.ElapsedMilliseconds -ge 6000) {
        # 强制异步回收僵尸空间
        [System.GC]::Collect([System.GC]::MaxGeneration, [System.GCCollectionMode]::Forced, $false)
        
        $currentProc = [System.Diagnostics.Process]::GetCurrentProcess()
        $memMB = [Math]::Round($currentProc.WorkingSet64 / 1MB, 1)
        
        $timeStr = [DateTime]::Now.ToString("yyyy/MM/dd HH:mm:ss.fff")
        [Console]::ForegroundColor = [ConsoleColor]::Yellow
        [Console]::WriteLine("[$timeStr] [HEALTH MONITOR] Live Process Memory: ${memMB}MB")
        [Console]::ResetColor()
        
        $logTimer.Restart()
    }

    [System.Threading.Thread]::Sleep(5)
}