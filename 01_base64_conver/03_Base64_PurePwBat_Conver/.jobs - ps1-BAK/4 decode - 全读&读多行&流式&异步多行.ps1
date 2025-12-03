param(
    [string]$InFile,
    [string]$OutFile,
    [string]$JobFile,
    [int]$DecodeMode = 4,   # 解码方式: 1=一次全读, 2=批量读多行, 3=流式解码, 4=异步批量读多行
    [int]$BatchSize  = 5   # 仅在 DecodeMode=2 或 4 时有效, 一次读多少行
)

Write-Host "解码模式: $DecodeMode"

switch ($DecodeMode) {
    1 {
        Write-Host "使用方式1: 一次性全读解码..."
        $fs = [System.IO.FileStream]::new($OutFile, [System.IO.FileMode]::Create)
        $lines = [System.IO.File]::ReadAllLines($InFile, [System.Text.Encoding]::ASCII)
        foreach($line in $lines){
            if([string]::IsNullOrWhiteSpace($line)){ continue }
            $bytes = [Convert]::FromBase64String($line)
            $fs.Write($bytes, 0, $bytes.Length)
        }
        $fs.Close()
    }
    2 {
        Write-Host "使用方式2: 批量读取解码 (BatchSize=$BatchSize)..."
        $reader = [System.IO.StreamReader]::new($InFile,[System.Text.Encoding]::ASCII)
        $fs     = [System.IO.FileStream]::new($OutFile,[System.IO.FileMode]::Create)

        while(-not $reader.EndOfStream){
            $lines = @()
            for($i=0; $i -lt $BatchSize -and -not $reader.EndOfStream; $i++){
                $line = $reader.ReadLine()
                if([string]::IsNullOrWhiteSpace($line)){ continue }
                $lines += $line
            }

            if($lines.Count -gt 0){
                $chunk = [string]::Join('', $lines)
                $bytes = [Convert]::FromBase64String($chunk)
                $fs.Write($bytes,0,$bytes.Length)
            }
        }

        $reader.Close()
        $fs.Close()
    }
    3 {
        Write-Host "使用方式3: FromBase64Transform + CryptoStream 流式解码..."
        $inStream = [System.IO.FileStream]::new($InFile,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read)
        $outStream = [System.IO.FileStream]::new($OutFile,[System.IO.FileMode]::Create)
        $transform = [System.Security.Cryptography.FromBase64Transform]::new(
            [System.Security.Cryptography.FromBase64TransformMode]::IgnoreWhiteSpaces
        )
        $cryptoStream = [System.Security.Cryptography.CryptoStream]::new($inStream,$transform,[System.Security.Cryptography.CryptoStreamMode]::Read)
        $cryptoStream.CopyTo($outStream)
        $cryptoStream.Close()
        $inStream.Close()
        $outStream.Close()
    }
    4 {
        Write-Host "使用方式4: 异步批量读取解码 (BatchSize=$BatchSize)..."
        $reader = [System.IO.StreamReader]::new($InFile,[System.Text.Encoding]::ASCII)
        $fs     = [System.IO.FileStream]::new($OutFile,[System.IO.FileMode]::Create,[System.IO.FileAccess]::Write,[System.IO.FileShare]::None,4096,[System.IO.FileOptions]::Asynchronous)

        while(-not $reader.EndOfStream){
            $lines = @()
            for($i=0; $i -lt $BatchSize -and -not $reader.EndOfStream; $i++){
                $lineTask = $reader.ReadLineAsync()
                $lineTask.Wait()   # 等待异步结果
                $line = $lineTask.Result
                if([string]::IsNullOrWhiteSpace($line)){ continue }
                $lines += $line
            }

            if($lines.Count -gt 0){
                $chunk = [string]::Join('', $lines)
                $bytes = [Convert]::FromBase64String($chunk)
                $writeTask = $fs.WriteAsync($bytes,0,$bytes.Length)
                $writeTask.Wait()  # 等待写入完成
            }
        }

        $reader.Close()
        $fs.Close()
    }
    default {
        Write-Host "错误: 未知的解码模式 $DecodeMode"
        exit 1
    }
}

# 删除 JobFile
Remove-Item $JobFile -Force

Write-Host "解码完成: $InFile"
Write-Host "解码脚本结束...."
