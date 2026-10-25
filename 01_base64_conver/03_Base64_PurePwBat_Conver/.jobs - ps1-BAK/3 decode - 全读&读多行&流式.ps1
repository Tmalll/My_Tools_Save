param(
    [string]$InFile,
    [string]$OutFile,
    [string]$JobFile,
    [int]$DecodeMode = 3,   # 解码方式: 1=一次全读, 2=批量读多行, 3=流式解码
    [int]$BatchSize  = 10   # 仅在 DecodeMode=2 时有效, 一次读多少行
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
    default {
        Write-Host "错误: 未知的解码模式 $DecodeMode"
        exit 1
    }
}

# 删除 JobFile
Remove-Item $JobFile -Force

Write-Host "解码完成: $InFile"
Write-Host "解码脚本结束...."
