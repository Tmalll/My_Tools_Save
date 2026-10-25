$port = 1080

# 1. 启动监听
$anyIP = [System.Net.IPAddress]::Any
$listener = New-Object System.Net.Sockets.TcpListener($anyIP, $port)
$listener.Start()

# 清屏并打印漂亮的首行提示
Clear-Host
[Console]::ForegroundColor = [ConsoleColor]::Green
[Console]::WriteLine("====================================================")
[Console]::WriteLine("  HTTP CONNECT Proxy Service (Runspace-Safe Version) ")
[Console]::WriteLine("  Listening on: 0.0.0.0:$port")
[Console]::WriteLine("  Log Mode: Xray Style + Live Monitor Status         ")
[Console]::WriteLine("====================================================")
[Console]::ResetColor()

# 核心转发与日志输出代码块
$scriptBlock = {
    param($clientObj)
    try {
        $c = [System.Net.Sockets.TcpClient]$clientObj
        $stream = $c.GetStream()
        
        # 获取客户端源 IP 和端口
        $remoteEndPoint = $c.Client.RemoteEndPoint.ToString()
        
        $buffer = New-Object Byte[] 4096
        $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
        if ($bytesRead -le 0) { $c.Close(); return }
        $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $bytesRead)
        
        if ($request -match "^CONNECT\s+([^:]+):(\d+)") {
            $targetHost = $Matches[1]
            $targetPort = [Convert]::ToInt32($Matches[2])
            
            # --- 核心：安全获取健康监控数值 ---
            # 直接通过 .NET 的系统底层获取当前进程占用的物理内存(MB)，开销极低，100%不崩
            $currentProc = [System.Diagnostics.Process]::GetCurrentProcess()
            $memMB = [Math]::Round($currentProc.WorkingSet64 / 1MB, 1)
            # ----------------------------------

            # --- 打印带有资源监控的 Xray 风格日志 ---
            $timeStr = [DateTime]::Now.ToString("yyyy/MM/dd HH:mm:ss")
            [Console]::ForegroundColor = [ConsoleColor]::Blue
            [Console]::Write("[$timeStr] ")
            [Console]::ForegroundColor = [ConsoleColor]::Gray
            [Console]::Write("$remoteEndPoint ")
            [Console]::ForegroundColor = [ConsoleColor]::Cyan
            [Console]::Write("tcp:$targetHost`:$targetPort ")
            [Console]::ForegroundColor = [ConsoleColor]::Green
            [Console]::Write("[ACCEPTED] ")
            # 尾部黄色小字显示当前进程的总内存占用
            [Console]::ForegroundColor = [ConsoleColor]::Yellow
            [Console]::WriteLine("[ProcMem: ${memMB}MB]")
            [Console]::ResetColor()
            # ---------------------------------

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
        # 如果连接发生异常（例如客户端中途取消、连不上目标），可以打印失败日志
        $timeStr = [DateTime]::Now.ToString("yyyy/MM/dd HH:mm:ss")
        [Console]::ForegroundColor = [ConsoleColor]::Red
        [Console]::WriteLine("[$timeStr] $remoteEndPoint -> tcp:$targetHost`:$targetPort [FAILED: $($_.Exception.Message)]")
        [Console]::ResetColor()
    }
    finally {
        if ($c) { $c.Close(); $c.Dispose() }
    }
}

# 用于在主线程进行定时资源整理的计数器
$garbageCollectCounter = 0

# 主循环
while ($true) {
    if ($listener.Pending()) {
        $client = $listener.AcceptTcpClient()
        $ps = [PowerShell]::Create().AddScript($scriptBlock).AddArgument($client)
        $null = $ps.BeginInvoke() 
        
        # 优化项：每接收 15 个连接，主线程顺手强制做一次系统级的垃圾回收
        # 这样即使子线程的空间被系统滞留，主线程也会强行把内存挤出来，防止内存持续上涨
        $garbageCollectCounter++
        if ($garbageCollectCounter -ge 15) {
            [System.GC]::Collect()
            [System.GC]::WaitForPendingFinalizers()
            $garbageCollectCounter = 0
        }
    }
    [System.Threading.Thread]::Sleep(5)
}