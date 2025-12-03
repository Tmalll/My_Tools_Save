@echo off
setlocal enabledelayedexpansion

echo.
echo.
echo Certutil(解码) + Powershell-5.1(编码)
echo.
echo 编码限制: 单个 Base64 文件 = 2.66GB (chunkSizeMB 控制)
echo 解码限制: Certutil 最大支持二进制文件 2.5G
echo.
echo.

:: 在批处理里定义（单位 MB）这里就是定义一行有多少数据.
:: 如果想要兼容被 certutil 解码 所填值必须是3的倍数 1 / 3 / 6 / 9 / 12 / ...
:: 如果不考虑其他解码器, 则无设置限制
set bufferSize=12
:: 计算字节数
set /a bufferBytes=%bufferSize%*1024*1024


:: FileStream 缓冲区（单位 MB 推荐 65536 = 64 KB, 建议超过2~4m 因为高了提升不大）
set fsBufSize=1
set /a fsBufBytes=%fsBufSize%*1024*1024


if "%~1"=="" (
    echo 请把文件拖放到此脚本上
    pause
    exit /b
)

:: 记录开始时间（秒）
for /f %%T in ('powershell -NoProfile -Command "[int](Get-Date -UFormat %%s)"') do set startTime=%%T

for %%F in (%*) do (
    set "fullpath=%%~fF"
    set "filename=%%~nxF"
    set "ext=%%~xF"

    if /i "!ext!"==".b64" (
        
        echo 解码中: %%F
        certutil -f -decode "%%~fF" "%%~dpnF" >NUL 2>&1
        echo 解码完成: %%~dpnF
        
    ) else (
        
        echo 编码中: "%%~dpnF"
        powershell -NoProfile -Command ^
        "$infile='%%~fF';" ^
        "$outfile='%%~dpnxF.b64';" ^
        "$FSBuf=%fsBufBytes%;" ^
        "$input  = New-Object System.IO.FileStream($infile,'Open','Read','Read',$FSBuf);" ^
        "$output = New-Object System.IO.StreamWriter($outfile,$false,[System.Text.Encoding]::ASCII,$FSBuf);" ^
        "$buffer = New-Object byte[] %bufferBytes%;" ^
        "$charBufferLen = [Math]::Ceiling($buffer.Length / 3) * 4;" ^
        "$charBuffer = New-Object char[] $charBufferLen;" ^
        "while(($read = $input.Read($buffer,0,$buffer.Length)) -gt 0){" ^
        "    $outLen = [Convert]::ToBase64CharArray($buffer,0,$read,$charBuffer,0);" ^
        "    $output.WriteLine($charBuffer,0,$outLen);" ^
        "};" ^
        "$input.Close(); $output.Close();"
        echo 编码完成: "%%~dpnxF.b64"
        
        
    )
)

:: 记录结束时间（秒）
for /f %%T in ('powershell -NoProfile -Command "[int](Get-Date -UFormat %%s)"') do set endTime=%%T
:: 计算耗时（秒）
set /a elapsed=%endTime%-%startTime%
echo 所有文件处理完成!
echo 总耗时: %elapsed% 秒
timeout /t 5 >nul
pause
exit
