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

:: 在批处理里定义 bufferSize（单位 MB）这里就是定义一行有多少数据.
:: 如果想要兼容被 certutil 解码 所填值必须是3的倍数 1 / 3 / 6 / 9 / 12 / ...
:: 如果不考虑其他解码器, 则无设置限制
set bufferSize=1
:: 计算字节数
set /a bufferBytes=%bufferSize%*1024*1024


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
        "$input=[System.IO.File]::OpenRead($infile);" ^
        "$output=[System.IO.StreamWriter]::new($outfile,$false,[System.Text.Encoding]::ASCII);" ^
        "$buffer=New-Object byte[] %bufferBytes%;" ^
        "while(($read=$input.Read($buffer,0,$buffer.Length)) -gt 0){" ^
        "  $chunk=[Convert]::ToBase64String($buffer,0,$read);" ^
        "  $output.WriteLine($chunk)" ^
        "};" ^
        "$input.Close();$output.Close();"
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
