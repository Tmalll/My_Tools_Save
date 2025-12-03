@echo on
setlocal EnableDelayedExpansion

echo ==========================
echo File Split / Merge Tool (高速版)
echo 拖放文件即可分割或合并
echo ==========================
echo.

:: ================= 用户设置 =================
set "CHUNK_MB=100"        :: 每块大小（单位MB）
set "BUFFER_MB=10"        :: 缓冲区大小（单位MB）
set "PART_PAD=3"         :: 分块编号位数（如 3 表示 part001）
:: =============================================

if "%~1"=="" (
    echo 请把文件拖放到此脚本上
    pause
    exit /b
)

for /F %%T in ('powershell -NoProfile -Command "[int](Get-Date -UFormat %%s)"') do set startTime=%%T

:nextfile
set "FILE=%~1"
set "FILENAME=%~nx1"
set "DIR=%~dp1"

echo.
echo ==========================
echo 处理文件: %FILE%
echo ==========================

echo %FILENAME% | find ".part" >nul
if %errorlevel%==0 (
    echo 检测到 .part 文件，开始合并...
    call :merge_parts "%FILE%"
) else (
    echo 检测到普通文件，准备分割...
    call :split_file "%FILE%"
)

shift
if not "%~1"=="" goto nextfile

for /F %%T in ('powershell -NoProfile -Command "[int](Get-Date -UFormat %%s)"') do set endTime=%%T
set /a elapsed=%endTime%-%startTime%

echo.
echo 所有文件处理完成!
echo 总耗时: %elapsed% 秒
timeout /t 5 >nul
pause
exit /b


:: ==============================
:: 子程序：文件分割 (调用 VBS)
:: ==============================
:split_file
setlocal
set "SRC=%~1"

echo 分割大小: %CHUNK_MB% MB, 缓冲区: %BUFFER_MB% MB
echo 正在分割中，请稍候...

:: 在批处理所在目录生成 split.vbs
set "VBS=%~dp0split.vbs"

> "%VBS%" echo Option Explicit
>>"%VBS%" echo Dim args, inputFile, chunkSize, bufferSize, numDigits
>>"%VBS%" echo Set args = WScript.Arguments
>>"%VBS%" echo If args.Count ^< 3 Then
>>"%VBS%" echo ^    WScript.Echo "用法: cscript split.vbs ^<文件路径^> ^<每块大小MB^> ^<缓冲区大小MB^> [序号位数]"
>>"%VBS%" echo ^    WScript.Quit 1
>>"%VBS%" echo End If
>>"%VBS%" echo inputFile = args(0)
>>"%VBS%" echo chunkSize = CLng(args(1)) * 1024 * 1024
>>"%VBS%" echo bufferSize = CLng(args(2)) * 1024 * 1024
>>"%VBS%" echo If args.Count ^>= 4 Then
>>"%VBS%" echo ^    numDigits = CLng(args(3))
>>"%VBS%" echo Else
>>"%VBS%" echo ^    numDigits = 2
>>"%VBS%" echo End If
>>"%VBS%" echo Dim fso: Set fso = CreateObject("Scripting.FileSystemObject")
>>"%VBS%" echo If Not fso.FileExists(inputFile) Then WScript.Echo "错误: 文件不存在 - " ^& inputFile: WScript.Quit 1
>>"%VBS%" echo Dim inStream: Set inStream = CreateObject("ADODB.Stream")
>>"%VBS%" echo inStream.Type = 1: inStream.Open: inStream.LoadFromFile inputFile
>>"%VBS%" echo Dim partNum: partNum = 1
>>"%VBS%" echo Do Until inStream.EOS
>>"%VBS%" echo ^  Dim outFile: outFile = inputFile ^& ".part" ^& Right(String(numDigits,"0") ^& partNum,numDigits)
>>"%VBS%" echo ^  Dim outStream: Set outStream = CreateObject("ADODB.Stream")
>>"%VBS%" echo ^  outStream.Type = 1: outStream.Open
>>"%VBS%" echo ^  Dim chunkWritten: chunkWritten = 0
>>"%VBS%" echo ^  Do While chunkWritten ^< chunkSize And Not inStream.EOS
>>"%VBS%" echo ^    Dim bytesToRead: bytesToRead = bufferSize
>>"%VBS%" echo ^    If chunkWritten + bytesToRead ^> chunkSize Then bytesToRead = chunkSize - chunkWritten
>>"%VBS%" echo ^    Dim buffer: buffer = inStream.Read(bytesToRead)
>>"%VBS%" echo ^    outStream.Write buffer
>>"%VBS%" echo ^    chunkWritten = chunkWritten + LenB(buffer)
>>"%VBS%" echo ^  Loop
>>"%VBS%" echo ^  outStream.SaveToFile outFile, 2
>>"%VBS%" echo ^  outStream.Close
>>"%VBS%" echo ^  WScript.Echo "生成分块: " ^& outFile ^& " (" ^& chunkWritten ^& " 字节)"
>>"%VBS%" echo ^  partNum = partNum + 1
>>"%VBS%" echo Loop
>>"%VBS%" echo inStream.Close
>>"%VBS%" echo WScript.Echo "拆分完成，总共生成 " ^& partNum-1 ^& " 个分块文件."

:: 调用 VBS 脚本
cscript //nologo "%VBS%" "%SRC%" %CHUNK_MB% %BUFFER_MB% %PART_PAD% && del "%VBS%"



endlocal
goto :eof



:: ==============================
:: 子程序：文件合并 (保持原样)
:: ==============================
:merge_parts
setlocal EnableDelayedExpansion
set "FIRST=%~1"
set "DIR=%~dp1"
set "BASENAME=%~n1"

for /f "tokens=1 delims=." %%a in ("%BASENAME%") do set "OUTNAME=%%a"
set "OUTFILE=%DIR%%OUTNAME%"
echo.
echo 合并目标: %OUTFILE%
echo.

set "LIST="
set /a count=0

for %%f in ("%DIR%%OUTNAME%.part*") do (
    set /a count+=1
    if defined LIST (
        set "LIST=!LIST!+%%f"
    ) else (
        set "LIST=%%f"
    )
    echo 正在准备合并第 !count! 块: %%f
)

if not defined LIST (
    echo 未找到任何分块文件。
    endlocal
    goto :eof
)

echo.
echo 正在合并中，共 %count% 个分块...
copy /b !LIST! "%OUTFILE%" >nul
echo 合并完成: "%OUTFILE%"
endlocal
goto :eof
