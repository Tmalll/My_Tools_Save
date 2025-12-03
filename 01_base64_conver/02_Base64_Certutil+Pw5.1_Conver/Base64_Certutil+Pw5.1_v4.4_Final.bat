@echo off
setlocal enabledelayedexpansion

echo ================= 简易说明 ================= 
echo.
echo Certutil.exe(解码) + Powershell-5.1(编码)
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

:: 每行原始字节数 (MB)，为兼容certutil解码必须是3的倍数 1 / 3 / 6 / 9 / ...
set bufferSize=12
echo 每行数据量设置为: %bufferSize%MB ( 这也是缓存, 要兼容 certutil解码 需设置为3的倍数 3 / 6 / 9 / ... )
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

                :: 清理作业文件夹
                if exist ".jobs" rd /s /q ".jobs"
                mkdir ".jobs"
                
                echo ***** ***** ***** 解码子程序开始 ***** ***** ***** && echo.
                call :decodeLoop
                echo ***** ***** ***** 解码子程序结束 ***** ***** ***** && echo.
                echo.
                echo ***** ***** ***** 合并子程序开始 ***** ***** ***** && echo.
                call :merge_parts
                echo ***** ***** ***** 合并子程序结束 ***** ***** ***** && echo.

            )
            echo.
            
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

:decodeEND

:: ================== 记录结束时间 毫秒级 ==================
powershell -NoProfile -Command "$elapsed=[int64](Get-Date).ToUniversalTime().Ticks/10000 - %startTime%; Write-Host ('总计耗时 {0:F3} 秒' -f ($elapsed/1000.0))"
echo. && echo 所有文件处理完成! && echo.


pause
exit




:: ================= 并行解码循环 =================
:decodeLoop
set active=0
for %%J in (.jobs\*.tmp) do set /a active+=1

:: 启动新任务直到达到 maxThreads 或没有剩余文件
:fillSlots
if !active! GEQ %maxThreads% goto :waitNext
if !currentIndex! GTR %totalFiles% goto :waitNext

set "fullpath=!file[%currentIndex%]!"
set "filename=!fullpath:.b64=!"
set "jobfile=.jobs\!currentIndex!.tmp"
type nul > "!jobfile!"

echo 解码中: !fullpath! && echo.
start "" /min cmd /c "certutil -f -decode "!fullpath!" "!filename!" >NUL 2>&1 && del ""!jobfile!"" && echo 解码完成: !fullpath!" && set /a active+=1 && set /a currentIndex+=1

goto :fillSlots

:waitNext
:: 等待任意子任务完成
if !active! GTR 0 (
    pathping -p 100 -q 1 localhost >nul
    :: echo 检测子任务
    goto :decodeLoop
)

rd /s /q ".jobs"
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


