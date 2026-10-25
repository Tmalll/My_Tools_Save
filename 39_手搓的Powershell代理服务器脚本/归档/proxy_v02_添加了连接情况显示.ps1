$port = 1080

# 启动监听
$anyIP = [System.Net.IPAddress]::Any
$listener = New-Object System.Net.Sockets.TcpListener($anyIP, $port)
$listener.Start()

# 清屏并打印漂亮的首行提示
Clear-Host
[Console]::ForegroundColor = [ConsoleColor]::Green
[Console]::WriteLine("====================================================")
[Console]::WriteLine("  HTTP CONNECT Proxy Service (Multi-Runspace Version) ")
[Console]::WriteLine("  Listening on: 0.0.0.0:$port")
[Console]::WriteLine("  Log Mode: Xray Style Real-time Flow Logs")
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
            
            # --- 打印 Xray 风格的访问日志 ---
            $timeStr = [DateTime]::Now.ToString("yyyy/MM/dd HH:mm:ss")
            # 格式：[时间] [客户端地址] tcp:目标地址:端口 [ACCEPTED]
            [Console]::ForegroundColor = [ConsoleColor]::Blue
            [Console]::Write("[$timeStr] ")
            [Console]::ForegroundColor = [ConsoleColor]::Gray
            [Console]::Write("$remoteEndPoint ")
            [Console]::ForegroundColor = [ConsoleColor]::Cyan
            [Console]::Write("tcp:$targetHost`:$targetPort ")
            [Console]::ForegroundColor = [ConsoleColor]::Green
            [Console]::WriteLine("[ACCEPTED]")
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

# 主循环
while ($true) {
    if ($listener.Pending()) {
        $client = $listener.AcceptTcpClient()
        $ps = [PowerShell]::Create().AddScript($scriptBlock).AddArgument($client)
        $null = $ps.BeginInvoke() 
    }
    [System.Threading.Thread]::Sleep(5)
}