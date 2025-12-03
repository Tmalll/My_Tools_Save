@echo off
setlocal enabledelayedexpansion

echo.
echo.
echo Powershell + Certutil
echo.
echo 编码限制: 最大测试5G编码成功
echo 解码限制: 小于 2GB 的二进制文件.
echo 解码限制: 小于 2.66GB 的 Base64 文件.
echo.
echo.


:: ================== 可调参数 ==================
:: 流式编码块大小（MB）必须是3的倍数, 6 / 9 / 12 / ...
set "ENCODE_CHUNK_MB=12"
:: ============================================

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
        
        echo 编码中: "%%~dpnF" 单行 Base64 版本
        powershell -NoProfile -Command ^
        "$infile='%%~fF';" ^
        "$outfile='%%~dpnxF.b64';" ^
        "$inStream=[System.IO.File]::OpenRead($infile);" ^
        "$outStream=[System.IO.File]::Create($outfile);" ^
        "$writer=New-Object System.IO.StreamWriter($outStream);" ^
        "$bufferSize=%ENCODE_CHUNK_MB%*1024*1024; $buffer = New-Object byte[] $bufferSize;" ^
        "while(($read=$inStream.Read($buffer,0,$buffer.Length)) -gt 0){" ^
        "  $chunk=[Convert]::ToBase64String($buffer,0,$read);" ^
        "  $writer.Write($chunk);" ^
        "};" ^
        "$writer.Close();$inStream.Close();$outStream.Close();"
        echo 编码完成: "%%~dpnxF.b64" 单行 Base64 版本
        
    )
)

:: 记录结束时间（秒）
for /f %%T in ('powershell -NoProfile -Command "[int](Get-Date -UFormat %%s)"') do set endTime=%%T
:: 计算耗时（秒）
set /a elapsed=%endTime%-%startTime%
echo 所有文件处理完成!
echo 总耗时: %elapsed% 秒
pause
exit
