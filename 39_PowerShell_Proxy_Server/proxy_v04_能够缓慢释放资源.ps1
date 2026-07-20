$port = 1080

# 1. 启动监听
$anyIP = [System.Net.IPAddress]::Any
$listener = New-Object System.Net.Sockets.TcpListener($anyIP, $port)
$listener.Start()

Clear-Host
[Console]::ForegroundColor = [ConsoleColor]::Green
[Console]::WriteLine("====================================================")
[Console]::WriteLine("  HTTP CONNECT Proxy Service (Final Stable Version)   ")
[Console]::WriteLine("  Listening on: 0.0.0.0:$port")
[Console]::WriteLine("  Log Mode: Xray Style + Async Free Garbage Collect ")
[Console]::WriteLine("====================================================")
[Console]::ResetColor()

# 核心转发与日志输出代码块（100% 回归原版，绝不包含任何会引发阻塞或闪退的副作用代码）
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
            
            # 打印纯净、原汁原味的 Xray 日志
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
            
            # 数据双向非阻塞盲转
            $b = New-Object Byte[] 32768
            $active = $true
            
            while ($active) {
                $hasData = $false
                if ($stream.DataAvailable) {
                    $read = $stream.Read($b, 0, $b.Length)
                    if ($read -gt 0) { $targetStream.Write($b, 0, $read); $hasData = $true } else { $active = $false }
                }
                if ($targetStream.DataAvailable) {
                    $read = $targetStream.Read($b, 0, $b.Length)
                    if ($read -gt 0) { $stream.Write($b, 0, $read); $hasData = $true } else { $active = $false }
                }
                if (-not $c.Connected -or -not $targetClient.Connected) { $active = $false }
                if (-not $hasData) { [System.Threading.Thread]::Sleep(1) }
            }
            $targetClient.Close()
        }
    } catch {
        # 异常静默
    }
    finally {
        if ($c) { $c.Close(); $c.Dispose() }
    }
}

# 监控计时器
$logTimer = [System.Diagnostics.Stopwatch]::StartNew()

# 主循环
while ($true) {
    if ($listener.Pending()) {
        $client = $listener.AcceptTcpClient()
        # 回归无束缚创建，不保留任何对它的引用，随用随丢，允许系统自动回收
        $ps = [PowerShell]::Create().AddScript($scriptBlock).AddArgument($client)
        $null = $ps.BeginInvoke() 
    }

    # --- 完美的定时资源监控与自动轻量垃圾释放 ---
    # 每隔 6 秒，在主线程空闲的时候，无感地通知系统对无引用的死连接进行标记清除，并打印监控
    if ($logTimer.ElapsedMilliseconds -ge 6000) {
        # 顺手把已经跑完、断开的孤儿线程空间强行赶出内存，100%安全不卡顿
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