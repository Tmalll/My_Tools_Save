$port = 1080

# 1. 启动监听
$anyIP = [System.Net.IPAddress]::Any
$listener = New-Object System.Net.Sockets.TcpListener($anyIP, $port)
$listener.Start()

Clear-Host
[Console]::ForegroundColor = [ConsoleColor]::Green
[Console]::WriteLine("====================================================")
[Console]::WriteLine("  HTTP CONNECT Proxy Service (Async IO Stable v1.8) ")
[Console]::WriteLine("  Listening on: 0.0.0.0:$port")
[Console]::WriteLine("  Log Mode: Atomic Console Out + High-Precision MS    ")
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
            
            # --- 【核心优化】：利用 ANSI 转义序列进行单次原子化字符串拼接 ---
            # 蓝色: `e[34m` | 灰色: `e[37m` | 青色: `e[36m` | 绿色: `e[32m` | 恢复: `e[0m`
            $esc = [char]27
            $timeStr = [DateTime]::Now.ToString("yyyy/MM/dd HH:mm:ss.fff")
            $padRemote = "{0,-22}" -f $remoteEndPoint
            
            # 把一整行所有的颜色、对齐、文本全部熔断进一个变量中
            $atomicLog = "${esc}[34m[$timeStr] ${esc}[37m$padRemote ${esc}[36mtcp:$targetHost`:$targetPort ${esc}[32m[ACCEPTED]${esc}[0m"
            
            # 单次下发给操作系统控制台，由于是单次写入，底层内核保证其不可被中途抢占挂起
            [Console]::WriteLine($atomicLog)
            # ------------------------------------------------------------------

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
        [System.GC]::Collect([System.GC]::MaxGeneration, [System.GCCollectionMode]::Forced, $false)
        
        $currentProc = [System.Diagnostics.Process]::GetCurrentProcess()
        $memMB = [Math]::Round($currentProc.WorkingSet64 / 1MB, 1)
        
        $esc = [char]27
        $timeStr = [DateTime]::Now.ToString("yyyy/MM/dd HH:mm:ss.fff")
        # 健康检查同样改为单次原子写入，换个更扎眼的亮黄色 (e[93m)
        [Console]::WriteLine("${esc}[93m[$timeStr] [HEALTH MONITOR] Live Process Memory: ${memMB}MB${esc}[0m")
        
        $logTimer.Restart()
    }

    [System.Threading.Thread]::Sleep(5)
}