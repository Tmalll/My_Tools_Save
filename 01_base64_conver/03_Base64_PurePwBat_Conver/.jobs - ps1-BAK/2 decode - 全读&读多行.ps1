param(
    [string]$InFile,
    [string]$OutFile,
    [string]$JobFile,
    [int]$ThresholdMB = 100,   # 阈值，单位 MB，默认 200MB
    [int]$BatchSize   = 2     # 脚本2一次读多少行，默认 10
)

# 获取文件大小（字节）
$fileInfo = Get-Item $InFile
$fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)

Write-Host "输入文件大小: $fileSizeMB MB (阈值: $ThresholdMB MB)"

# 打开输出文件流
$fs = [System.IO.FileStream]::new($OutFile, [System.IO.FileMode]::Create)

if($fileSizeMB -lt $ThresholdMB){
    Write-Host "使用脚本1: 一次性全读解码..."

    # 一次性读取所有行（ASCII 编码）
    $lines = [System.IO.File]::ReadAllLines($InFile, [System.Text.Encoding]::ASCII)

    # 遍历每一行，逐行解码并写入
    foreach($line in $lines){
        if([string]::IsNullOrWhiteSpace($line)){ continue }
        $bytes = [Convert]::FromBase64String($line)
        $fs.Write($bytes, 0, $bytes.Length)
    }
}
else{
    Write-Host "使用脚本2: 批量读取解码 (BatchSize=$BatchSize)..."

    $reader = [System.IO.StreamReader]::new($InFile,[System.Text.Encoding]::ASCII)

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
}

# 关闭文件流
$fs.Close()

# 删除 JobFile
Remove-Item $JobFile -Force

Write-Host "解码完成: $InFile"
Write-Host "解码脚本结束...."
