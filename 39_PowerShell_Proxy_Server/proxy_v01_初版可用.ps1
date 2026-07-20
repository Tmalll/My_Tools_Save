$port = 1080

# 启动监听
$anyIP = [System.Net.IPAddress]::Any
$listener = New-Object System.Net.Sockets.TcpListener($anyIP, $port)
$listener.Start()
Write-Host "HTTP CONNECT 代理已在端口 $port 启动 (多线程安全空间版)..." -ForegroundColor Green

# 核心转发代码块 (给子线程运行)
$scriptBlock = {
    param($clientObj)
    try {
        $c = [System.Net.Sockets.TcpClient]$clientObj
        $stream = $c.GetStream()
        $buffer = New-Object Byte[] 4096
        
        $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
        if ($bytesRead -le 0) { $c.Close(); return }
        $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $bytesRead)
        
        if ($request -match "^CONNECT\s+([^:]+):(\d+)") {
            $targetHost = $Matches[1]
            $targetPort = [Convert]::ToInt32($Matches[2])
            
            $targetClient = New-Object System.Net.Sockets.TcpClient
            $targetClient.Connect($targetHost, $targetPort)
            $targetStream = $targetClient.GetStream()
            
            $response = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 200 Connection Established`r`n`r`n")
            $stream.Write($response, 0, $response.Length)
            
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
    } catch {}
    finally {
        if ($c) { $c.Close(); $c.Dispose() }
    }
}

# 主循环：每来一个连接，就动态创建一个带独立 Runspace 的原生线程
while ($true) {
    if ($listener.Pending()) {
        $client = $listener.AcceptTcpClient()
        
        # 使用 PowerShell 的官方多线程 API 运行，完美解决空间缺失问题
        $ps = [PowerShell]::Create().AddScript($scriptBlock).AddArgument($client)
        $null = $ps.BeginInvoke() 
    }
    [System.Threading.Thread]::Sleep(5)
}