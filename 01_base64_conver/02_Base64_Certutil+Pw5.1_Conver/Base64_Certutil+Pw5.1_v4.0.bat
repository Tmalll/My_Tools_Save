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

:: ================= 用户可调参数 =================
:: 每块原始文件大小 (MB)，生成 Base64 文件约 chunkSizeMB*4/3
set chunkSizeMB=100
:: 每行原始字节数 (MB)，必须是3的倍数，保持原 v2 设置
set bufferSize=12
:: FileStream 缓冲区 (MB)
set fsBufSize=1
:: 解码线程数
set maxThreads=4

:: ================= 计算字节数 =================
echo 设置分块大小 = %chunkSizeMB%
set /a bufferBytes=%bufferSize%*1024*1024
set /a fsBufBytes=%fsBufSize%*1024*1024

if "%~1"=="" (
    echo 请把文件拖放到此脚本上
    pause
    exit /b
)

:: ================= 记录开始时间 毫秒级 =================
for /f %%T in ('powershell -NoProfile -Command "[int64](Get-Date).ToUniversalTime().Ticks/10000"') do set startTime=%%T

for %%F in (%*) do (
    set "fullpath=%%~fF"
    set "filename=%%~nxF"
    set "ext=%%~xF"

    if /i "!ext!"==".b64" (
        echo 解码中: %%F
        set /a jobCount+=1
        start "decodeJob%%~nF" /min cmd /c "certutil -f -decode "%%~fF" "%%~dpnF" >NUL 2>&1  && echo 解码完成: %%~dpnF"
        if !jobCount! geq %maxThreads% (
            echo WaitJobs1 被调用1
            call :WaitJobs1
            set jobCount=0
        )
    ) else (        
        echo 编码中: "%%~dpnF"
        
        powershell -NoProfile -Command ^
          "$infile='%%~fF';" ^
          "$chunkSizeMB=%chunkSizeMB%;" ^
          "$bufferSizeMB=%bufferSize%;" ^
          "$fsBufSizeMB=%fsBufSize%;" ^
          "$chunkSize=[int64]$chunkSizeMB*1024*1024;" ^
          "$bufferSize=[int64]$bufferSizeMB*1024*1024;" ^
          "$FSBuf=[int64]$fsBufSizeMB*1024*1024;" ^
          "$fileLength=(Get-Item $infile).Length;" ^
          "$totalChunks=[Math]::Ceiling([double]$fileLength / [double]$chunkSize);" ^
          "for($chunkIndex=1;$chunkIndex -le $totalChunks;$chunkIndex++) {" ^
          "  $offset=[int64]($chunkIndex-1)*$chunkSize;" ^
          "  $chunkLength=[Math]::Min($chunkSize,[int64]$fileLength-$offset);" ^
          "  $outfile = $infile + '.part' + ($chunkIndex.ToString('D3')) + '.b64';" ^
          "  Write-Host '生成块: ' + $outfile;" ^
          "  $fs=[IO.FileStream]::new($infile,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read,$FSBuf);" ^
          "  $fs.Seek($offset,[IO.SeekOrigin]::Begin) | Out-Null;" ^
          "  $sw=[IO.StreamWriter]::new($outfile,$false,[Text.Encoding]::ASCII,$FSBuf);" ^
          "  $buffer=[byte[]]::new($bufferSize);" ^
          "  $charLen=[Math]::Ceiling($buffer.Length/3.0)*4;" ^
          "  $charBuffer=[char[]]::new($charLen);" ^
          "  $remaining=$chunkLength;" ^
          "  while($remaining -gt 0){" ^
          "    $read=[int]([Math]::Min([int64]$buffer.Length,[int64]$remaining));" ^
          "    $n=$fs.Read($buffer,0,$read);" ^
          "    if($n -le 0){ break }" ^
          "    $outLen=[Convert]::ToBase64CharArray($buffer,0,$n,$charBuffer,0);" ^
          "    $sw.WriteLine($charBuffer,0,$outLen);" ^
          "    $remaining-=$n;" ^
          "  };" ^
          "  $sw.Close(); $fs.Close();" ^
          "};" ^
          "Write-Host '编码完成: 所有块 Base64 文件生成完毕';"
        echo 编码完成: "%%~dpnF"
    )
)

:: 统计和计算循环耗时
:: for /f %%T in ('powershell -NoProfile -Command "[int64](Get-Date).ToUniversalTime().Ticks/10000"') do set WaitJobs_startTime=%%T

:: ================== 等待所有子进程 ==================
:: 循环2, 使用现在的双检测
call :WaitJobs2
:: 设定等待时间 (单位毫秒)
set waittime=100
pathping -p %waittime% -q 1 localhost >nul

:: 循环2, 使用现在的双检测
call :WaitJobs2

:: 统计和计算循环耗时
:: powershell -NoProfile -Command "$elapsed=[int64](Get-Date).ToUniversalTime().Ticks/10000 - %WaitJobs_startTime% - %waittime%; Write-Host ('循环和等待共耗时 {0:F3} 秒' -f ($elapsed/1000.0))"


:: ================== 记录结束时间 毫秒级 ==================
echo.
powershell -NoProfile -Command "$elapsed=[int64](Get-Date).ToUniversalTime().Ticks/10000 - %startTime% - %waittime%; Write-Host ('总计耗时 {0:F3} 秒' -f ($elapsed/1000.0))"
echo 所有文件处理完成!
timeout /t 5 >nul
pause
exit

:: pathping -p 333 -q 1 localhost >nul


:: 循环1
:WaitJobs1
:waitloop1
echo WaitJobs1 被调用2
for /f %%N in ('tasklist /fi "windowtitle eq decodeJob*" ^| find /c "cmd.exe"') do set running=%%N
if !running! geq %maxThreads% (
    :: pathping -p 10 -q 1 localhost >nul
    echo WaitJobs1 被调用3
    goto waitloop1
)
echo WaitJobs1 被调用4 循环结束!
exit /b




:: 循环2
:WaitJobs2
set noJobs=0
:waitloop2
set running=0
for /f "skip=3 tokens=1" %%P in ('tasklist /fi "windowtitle eq decodeJob*"') do (
    if "%%P"=="cmd.exe" set running=1
)
if !running!==1 (
    set noJobs=0
    goto waitloop2
) else (
    set /a noJobs+=1
    if !noJobs! lss 2 (
        goto waitloop2
    )
)

echo.
echo ----- ----- ----- 循环2 执行记录 ----- ----- -----
echo.
    
exit /b






:: ...你的任务...

:: 记录结束时间并计算耗时（秒，小数格式）




