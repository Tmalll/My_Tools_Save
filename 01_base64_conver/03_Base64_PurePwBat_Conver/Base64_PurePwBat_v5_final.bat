@echo off
setlocal enabledelayedexpansion

echo ================= 简易说明 ================= 
echo.
echo Certutil(解码) + Powershell-5.1(编码)
echo.
echo 解码限制: Certutil 解码最大支持 2.0GB 的二进制文件 ( 也就是小于 2.66BG 的 base64 文件 )
echo.
echo 编码限制: 最大测试到 5GB 文件编码成功. 但是建议单个 Base64 文件分块小于 2.66GB ( 由 chunkSizeMB 变量控制 )
echo.
echo.

echo ================= 用户参数 =================
echo.
:: 每块原始文件大小 (单位MB)，生成 Base64 文件是原始文件的 1.33 倍, 建议小于2048
set chunkSizeMB=100
echo 分块大小设置为: %chunkSizeMB%MB ( 编码后每个块实际体积= chunkSizeMB * 1.33倍 )
echo.

:: 每行原始字节数 (MB)，必须是3的倍数 1 / 3 / 6 / 9 / ...
set bufferSize=12
echo 每行数据量设置为: %bufferSize%MB ( 这也是缓存,  必须是3的倍数 1 / 3 / 6 / 9 / ... )
echo.

:: FileStream 缓冲区 (MB)
set fsBufSize=1
echo FileStream 缓冲区设置为: %fsBufSize%MB ( 建议值 1 ~ 4MB 高了没用徒增负担 )
echo.

:: 解码线程数
set maxThreads=5
echo 解码线程数设置为: %maxThreads% ( HDD建议值=3, SSD建议值=10+ 或 不限制 ) 
echo.

:: ================= 拖放检测 =================
if "%~1"=="" (
    echo 请把文件拖放到此脚本上
    pause
    exit /b
)

:: ================= 记录开始时间 毫秒级 =================
for /f %%T in ('powershell -NoProfile -Command "[int64](Get-Date).ToUniversalTime().Ticks/10000"') do set startTime=%%T


:: ================= 初始化文件队列 =================
            :: 自动扫描拖拽文件所在目录的全部 .b64 文件
            set fileIndex=0
            :: 取第一个拖拽文件的目录作为工作目录
            set "WORKDIR=%~dp1"
            for %%F in ("%WORKDIR%*.b64") do (
            set /a fileIndex+=1
            set "file[!fileIndex!]=%%~fF"
            )
            set totalFiles=%fileIndex%
            set currentIndex=1

:: ================= 遍历拖放的文件，决定是编码还是解码 =================
for %%F in (%*) do (
    set "fullpath=%%~fF"
    set "filename=%%~nxF"
    set "ext=%%~xF"
    
    if /i "!ext!"==".b64" (
        echo 解码循环脚本开始 && echo.
            

            echo.
            echo ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** *****
            echo.
            echo        工作目录: [ %WORKDIR% ]
            echo.
            echo        自动扫描目录: [ %WORKDIR% ] && echo.
            echo        检测到 %totalFiles% 个 Base64 文件，准备解码... && echo.
            echo ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** *****
            echo.

            echo 解码脚本开始.... && echo.

            :: 只有当 totalFiles > 0 时才需要进入解码流程
            if "!totalFiles!" GTR "0" (

                echo 检测到 Base64 文件，开始解码批处理... && echo. && echo.
                
                echo ***** ***** ***** 生成解码脚本开始 ***** ***** ***** && echo..
                call :make_decode_ps1
                echo ***** ***** ***** 生成解码脚本结束 ***** ***** ***** && echo. && echo.

                echo ***** ***** ***** 解码子程序开始 ***** ***** ***** && echo.
                call :decodeLoop
                echo ***** ***** ***** 解码子程序结束 ***** ***** ***** && echo. && echo.

                echo ***** ***** ***** 合并子程序开始 ***** ***** ***** && echo.
                call :merge_parts
                echo ***** ***** ***** 合并子程序结束 ***** ***** ***** && echo. && echo.

            )
            echo 解码脚本结束.... && echo.

    ) else (
        echo.
            echo ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** *****
            echo.
            echo        工作目录: [ %WORKDIR% ]
            echo.
            echo        要编码的文件为: [ %%~dpnF ]
            echo.
            echo ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** *****
        echo.
        echo 编码开始: "%%~dpnF" && echo.

        rem 编码PS命令
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
            "Write-Host '编码结束: powershell脚本结束...';"
        rem PS脚本结束

        echo. && echo 编码结束: "%%~dpnF" && echo.
    )
)

rd /s /q ".jobs"
:: ================== 记录结束时间 毫秒级 ==================
powershell -NoProfile -Command "$elapsed=[int64](Get-Date).ToUniversalTime().Ticks/10000 - %startTime%; Write-Host ('总计耗时 {0:F3} 秒' -f ($elapsed/1000.0))"
echo. && echo 所有文件处理完成! && echo.


pause
exit




:: ================= 并行解码循环 =================
:decodeLoop
:: 每次回到循环都按锁文件实时统计活跃任务
set "active=0"
for %%J in (.jobs\*.tmp) do set /a active+=1

:fillSlots
:: 动态 slot 填充判定：只有在未满槽且还有待启动文件时才启动新任务
if !active! GEQ %maxThreads% goto :waitNext
if !currentIndex! GTR %totalFiles% goto :waitNext

:: 准备一次启动
set "fullpath=!file[%currentIndex%]!"
set "filename=!fullpath:.b64=!"
set "jobfile=.jobs\!currentIndex!.tmp"

:: 创建锁文件（信号量）
type nul > "!jobfile!"

:: 日志
echo. && echo [ !fullpath! ] 启动解码 [ %time% ]

:: 启动子任务：删除锁文件在 decode.ps1 内完成（成功/失败都释放占位）
start "" /b /min cmd /c ^
"powershell -NoProfile -ExecutionPolicy Bypass -File "".jobs\decode.ps1"" ^
 -InFile ""!fullpath!"" -OutFile ""!filename!"" -JobFile ""!jobfile!"" 2>&1"

:: 推进索引（只增不减）
set /a currentIndex+=1

:: 立即回到 fillSlots，再次判断是否还能继续启动（尽量满槽）
:: 注意：active 是基于锁文件计数，需要重新统计
set "active=0"
for %%J in (.jobs\*.tmp) do set /a active+=1
goto :fillSlots

:waitNext
:: 等待任意一个子任务完成，然后马上补位；
:: 同时确保所有任务都启动完且全部完成后才退出解码阶段。
pathping -p 100 -q 1 localhost >nul

:: 重新统计活跃数
set "active=0"
for %%J in (.jobs\*.tmp) do set /a active+=1

:: 如果还有未启动的文件，且未满槽，立刻补位
if !currentIndex! LEQ %totalFiles% if !active! LSS %maxThreads% goto :fillSlots

:: 如果还有任务在跑，继续等待
if !active! GTR 0 (
    rem echo 等待任意子任务完成中... [ %time% ]
    rem echo 当前active=!active! [ %time% ]
    rem echo 当前currentIndex=!currentIndex! [ %time% ]
    goto :waitNext
)

:: 跑到这里说明：所有文件都启动过且所有子任务已结束
echo 所有文件解码完成! (并行解码 + 动态补位) && echo.
goto :EOF






:: 子程序：自动合并拖放文件所在目录的 .part123 文件
:merge_parts

echo 合并工作目录: "%WORKDIR%" && echo.

:: 检查是否存在分块文件
set "hasParts="
for %%f in ("%WORKDIR%*.part0*") do (
    set "hasParts=1"
    goto :foundParts
)

:foundParts
if not defined hasParts (
    echo 未发现任何 .part00N 分块文件，跳过合并。&& echo.
    goto :merge_parts_END
)

echo 已发现分块文件，将按顺序自动合并... && echo.

:: 获取输出文件名（去除 .partNNN）
for %%f in ("%WORKDIR%*.part001") do (
    set "base=%%~nf"
    set "ext=%%~xf"
)

:: 删除 base 末尾的 partNNN
for /f "tokens=1 delims=. " %%a in ("!base!") do set "OUTNAME=%%a"
set "OUTFILE=%WORKDIR%!OUTNAME!"
echo 输出文件名为: "!OUTFILE!" && echo.

:: 按名称顺序合并, 并且统计数量.
set "LIST="
set /a count=1
for /f "delims=" %%f in ('dir /b /on "%WORKDIR%" ^| findstr /r ".*\.part[0-9][0-9][0-9]$"') do (
    if defined LIST (
        set "LIST=!LIST!+%%f"
    ) else (
        set "LIST=%%f"
    )
    echo 准备合并第 !count! 块: %%f && echo.
    set /a count+=1
)
set /a total=count-1
echo 共 %total% 块，开始合并...

:: 开始合并程序.
copy /b !LIST! "%OUTFILE%" >nul && echo.

echo 合并完成: "%OUTFILE%" && echo.

echo 所有文件合并完成! (排序后 copy /b 方式) && echo.
goto :EOF


:make_decode_ps1
:: ================= 生成解码脚本 =================
:: 调试命令
:: echo. > job.tmp && powershell -NoProfile -ExecutionPolicy Bypass -File decode.ps1 -InFile 5120m.part051.b64 -OutFile 5120m.part051 -JobFile job.tmp

:: 清理作业文件夹
if exist ".jobs" rd /s /q ".jobs"
mkdir ".jobs"

:: 生成解码脚本
>%~dp1.jobs\\decode.ps1 echo param([string]$InFile,[string]$OutFile,[string]$JobFile,
>>%~dp1.jobs\\decode.ps1 echo [int]$DecodeMode=1,   # 工作模式 1=全读, 2=读多行, 3=流式, 4=异步读多行
>>%~dp1.jobs\\decode.ps1 echo [int]$BatchSize=5,        # 一次读取多少行, 只在模式2和4生效.
>>%~dp1.jobs\\decode.ps1 echo [int]$fsBufSizeMB=2,      # FileStream缓冲区大小 推荐范围 1~4MB
>>%~dp1.jobs\\decode.ps1 echo [int]$bufferSizeMB=64)     # 每次读写缓冲区大小 推荐范围 1MB ~ 8MB
>>%~dp1.jobs\\decode.ps1 echo #
>>%~dp1.jobs\\decode.ps1 echo $FSBuf=[int64]$fsBufSizeMB*1024*1024
>>%~dp1.jobs\\decode.ps1 echo $Buf=[int64]$bufferSizeMB*1024*1024
>>%~dp1.jobs\\decode.ps1 echo #
>>%~dp1.jobs\\decode.ps1 echo switch($DecodeMode){
>>%~dp1.jobs\\decode.ps1 echo 1{$fs=[IO.FileStream]::new($OutFile,[IO.FileMode]::Create);$lines=[IO.File]::ReadAllLines($InFile,[Text.Encoding]::ASCII);foreach($l in $lines){if([string]::IsNullOrWhiteSpace($l)){continue};$b=[Convert]::FromBase64String($l);$fs.Write($b,0,$b.Length)};$fs.Close()}
>>%~dp1.jobs\\decode.ps1 echo 2{$r=[IO.StreamReader]::new($InFile,[Text.Encoding]::ASCII,$Buf);$fs=[IO.FileStream]::new($OutFile,[IO.FileMode]::Create,[IO.FileAccess]::Write,[IO.FileShare]::None,$FSBuf);while(-not $r.EndOfStream){$ls=@();for($i=0;$i -lt $BatchSize -and -not $r.EndOfStream;$i++){ $l=$r.ReadLine();if([string]::IsNullOrWhiteSpace($l)){continue};$ls+=$l};if($ls.Count -gt 0){$c=[string]::Join('', $ls);$b=[Convert]::FromBase64String($c);$fs.Write($b,0,$b.Length)}};$r.Close();$fs.Close()}
>>%~dp1.jobs\\decode.ps1 echo 3{$in=[IO.FileStream]::new($InFile,[IO.FileMode]::Open,[IO.FileAccess]::Read);$out=[IO.FileStream]::new($OutFile,[IO.FileMode]::Create);$t=[Security.Cryptography.FromBase64Transform]::new([Security.Cryptography.FromBase64TransformMode]::IgnoreWhiteSpaces);$cs=[Security.Cryptography.CryptoStream]::new($in,$t,[Security.Cryptography.CryptoStreamMode]::Read);$cs.CopyTo($out);$cs.Close();$in.Close();$out.Close()}
>>%~dp1.jobs\\decode.ps1 echo 4{$r=[IO.StreamReader]::new($InFile,[Text.Encoding]::ASCII,$Buf);$fs=[IO.FileStream]::new($OutFile,[IO.FileMode]::Create,[IO.FileAccess]::Write,[IO.FileShare]::None,$FSBuf,[IO.FileOptions]::Asynchronous);while(-not $r.EndOfStream){$ls=@();for($i=0;$i -lt $BatchSize -and -not $r.EndOfStream;$i++){ $lt=$r.ReadLineAsync();$lt.Wait();$l=$lt.Result;if([string]::IsNullOrWhiteSpace($l)){continue};$ls+=$l};if($ls.Count -gt 0){$c=[string]::Join('', $ls);$b=[Convert]::FromBase64String($c);$wt=$fs.WriteAsync($b,0,$b.Length);$wt.Wait()}};$r.Close();$fs.Close()}
>>%~dp1.jobs\\decode.ps1 echo default{Write-Host "错误: 未知的解码模式 $DecodeMode";exit 1}}
>>%~dp1.jobs\\decode.ps1 echo #
>>%~dp1.jobs\\decode.ps1 echo Remove-Item $JobFile -Force # 脚本结束删除 job锁文件
>>%~dp1.jobs\\decode.ps1 echo Start-Sleep -Milliseconds (Get-Random -Minimum 10 -Maximum 50) # 随机等待 0.5 ~ 2 秒之间
>>%~dp1.jobs\\decode.ps1 echo Write-Host "`n[ $InFile ] 解码完成 [ $(Get-Date -Format H.mm.ss.ff) ] PowerShell"


echo 解码脚本已生成 && echo.
goto :EOF

