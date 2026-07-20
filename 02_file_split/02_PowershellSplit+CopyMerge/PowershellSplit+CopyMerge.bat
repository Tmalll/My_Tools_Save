@echo on
setlocal EnableDelayedExpansion

echo ==========================
echo File Split / Merge Tool (高速版)
echo 拖放文件即可分割或合并
echo 工作路径里不能有空格!!!  工作路径里不能有空格!!!  工作路径里不能有空格!!!
echo ==========================
echo.

:: ================= 用户设置 =================
set "CHUNK_MB=100"        :: 每块大小（单位MB）
set "PART_PAD=3"          :: 分块编号位数（如 3 表示 part001）
:: =============================================

if "%~1"=="" (
    echo 请把文件拖放到此脚本上
    pause
    exit /b
)

set /a CHUNK_SIZE=%CHUNK_MB%*1024*1024

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
:: 子程序：文件分割 (高速版)
:: ==============================
:split_file
setlocal
set "SRC=%~1"
set "DIR=%~dp1"
set "BASE=%~nx1"

echo 分割大小: %CHUNK_MB% MB
echo 正在高速分割中，请稍候...

powershell -NoProfile -Command ^
  "$path=[IO.Path]::GetFullPath('%SRC%');" ^
  "$outDir=[IO.Path]::GetDirectoryName($path);" ^
  "$chunk=[long]%CHUNK_SIZE%;" ^
  "$buf=New-Object byte[] $chunk;" ^
  "$idx=1;" ^
  "$pad=%PART_PAD%;" ^
  "$fs=[IO.File]::OpenRead($path);" ^
  "$total=[math]::Ceiling($fs.Length / $chunk);" ^
  "while(($read=$fs.Read($buf,0,$buf.Length)) -gt 0){" ^
  "  $suffix=$idx.ToString('D'+$pad);" ^
  "  $part=[IO.Path]::Combine($outDir,('{0}.part{1}' -f [IO.Path]::GetFileName($path),$suffix));" ^
  "  $out=[IO.File]::Open($part,[IO.FileMode]::Create,[IO.FileAccess]::Write);" ^
  "  $out.Write($buf,0,$read);" ^
  "  $out.Close();" ^
  "  Write-Host ('正在写入分块 {0}/{1} -> {2}' -f $idx,$total,$part);" ^
  "  $idx++" ^
  "}" ^
  "$fs.Close();" ^
  "Write-Host ('完成，共生成 {0} 个分块。' -f ($idx-1))"

echo 分割完成。
endlocal
goto :eof


:: ==============================
:: 子程序：文件合并
:: ==============================
:merge_parts
setlocal EnableDelayedExpansion
set "FIRST=%~1"
set "DIR=%~dp1"
set "BASENAME=%~nx1"

:: 去掉 .part### 后缀，保留扩展名
for /f "delims=" %%a in ("%BASENAME%") do set "OUTNAME=%%~na"
set "OUTFILE=%DIR%%OUTNAME%"

echo.
echo 合并目标: %OUTFILE%
echo.

set "LIST="
set /a count=1

:: 枚举所有分块文件，按名称顺序
for %%f in ("%DIR%%OUTNAME%.part*") do (
    if defined LIST (
        set "LIST=!LIST!+%%f"
    ) else (
        set "LIST=%%f"
    )
    echo 正在准备合并第 !count! 块: %%f
    set /a count+=1
)

if not defined LIST (
    echo 未找到任何分块文件。
    endlocal
    goto :eof
)

:: 修正总数（减去最后一次多加的 1）
set /a total=count-1

echo.
echo 正在合并中，共 %total% 个分块...
echo !LIST!
copy /b !LIST! "%OUTFILE%" >nul
echo 合并完成: "%OUTFILE%"
endlocal
goto :eof

