@echo off
setlocal enabledelayedexpansion

:: --------------------------------------------------
:: 基础路径与参数定义
:: --------------------------------------------------
:: 目标工作文件夹...
set "TARGET=%~dp0Xray-core"

:: 指定生成列表文件位置...
set "ArchiveFiles_LIST=%TARGET%_1_archive_files-list.txt"

:: 需要加入列表/校验的扩展名 (7z支持的常见压缩包格式)...
set "ArchiveEXT=7z,zip,rar,001,cab,iso,tar,gz,bz2,xz,zst,lzma,arj,chm,cpio,dmg,lzh,rpm,wim,xar,z"

:: 校验用的原始Aria2-List.txt位置...
set "ARIA2_LIST=%~dp0aria2-list.txt"

:: sha256sum.exe 程序位置...
set "SHA256SUM=sha256sum.exe"

:: 输出文件位置...
set "SHA_LIST=%TARGET%_2_sha256-list.txt"
set "ARIA2_LIST_OK=%TARGET%_3_CompareLOG.ARIA2_LIST.sha256-OK.log"
set "ARIA2_LIST_FAIL=%TARGET%_3_CompareLOG.ARIA2_LIST.sha256-FAIL.log"
set "ARIA2_LIST_LOST=%TARGET%_3_CompareLOG.ARIA2_LIST.sha256-LOST.log"

set "DGST_Files_OK=%TARGET%_4_CompareLOG.DGST_Files.sha256-OK.log"
set "DGST_Files_FAIL=%TARGET%_4_CompareLOG.DGST_Files.sha256-FAIL.log"
set "DGST_Files_LOST=%TARGET%_4_CompareLOG.DGST_Files.sha256-LOST.log"

set "AFUT_Files_OK=%TARGET%_5_CompareLOG.AFUT-OK.log"
set "AFUT_Files_ERROR=%TARGET%_5_CompareLOG.AFUT-ERROR.log"


:: --------------------------------------------------
:: 菜单交互界面
:: --------------------------------------------------
:MENU
cls
echo ==================================================
echo               Xray-Core SHA256 校验工具
echo ==================================================
echo  1. 生成文件列表 (Archive File List)
echo  2. 生成 [ SHA256 ] 文件 (Generate SHA256)
echo  3. 对比 [ Aria2-List.txt ] 文件
echo  4. 对比 [ .DGST ] 文件
echo  5. 针对校验值缺失的文件进行压缩包完整性测试 (7z t AFUT Test)
echo  6. 清理生成的日志和临时文件
echo  7. 一键顺序执行步骤 1-5
echo  0. 退出脚本
echo ==================================================
set "CHOICE="
set /p "CHOICE=请选择操作步骤 [0-7]: "

if "%CHOICE%"=="1" goto STEP_1
if "%CHOICE%"=="2" goto STEP_2
if "%CHOICE%"=="3" goto STEP_3
if "%CHOICE%"=="4" goto STEP_4
if "%CHOICE%"=="5" goto STEP_5
if "%CHOICE%"=="6" goto STEP_6
if "%CHOICE%"=="7" goto STEP_ALL
if "%CHOICE%"=="0" goto STEP_0

echo.
echo [错误] 输入选项无效，请重新选择。
timeout /t 2 >nul
goto MENU

:: --------------------------------------------------
:: 1. 生成文件列表
:: --------------------------------------------------
:STEP_1
echo.
echo [Archive File List Generator]
powershell -NoProfile -Command "$target=$env:TARGET;$list=$env:ArchiveFiles_LIST;$ext=$env:ArchiveEXT.Split(',');Get-ChildItem -LiteralPath $target -Recurse -File | Where-Object {$ext -contains $_.Extension.TrimStart('.').ToLower()} | Select-Object -ExpandProperty FullName | Out-File -Encoding Default $list"
chcp 936 >nul
echo.
echo 列表已生成: %ArchiveFiles_LIST%
echo.
pause
goto MENU

:: --------------------------------------------------
:: 2. 生成SHA256文件
:: --------------------------------------------------
:STEP_2
echo.
echo [Generate SHA256]
powershell -NoProfile -Command "$outenc=[Text.Encoding]::UTF8;[Console]::OutputEncoding=$outenc;$enc=[Text.Encoding]::GetEncoding(936);$list=$env:ArchiveFiles_LIST;$sha=$env:SHA256SUM;$out=$env:SHA_LIST;Remove-Item $out -Force -ErrorAction SilentlyContinue;[IO.File]::WriteAllText($out,'',$enc);$files=Get-Content -Encoding Default $list;$total=$files.Count;$i=0;foreach($f in $files){$i++;Write-Host ('['+$i+'/'+$total+'] '+$f);$r=& $sha $f;if($r){$r=$r.TrimStart('\');[IO.File]::AppendAllText($out,$r+[Environment]::NewLine,$enc)}};$text=[IO.File]::ReadAllText($out,$enc);$text=$text -replace '\\\\','\';[IO.File]::WriteAllText($out,$text,$enc)"
chcp 936 >nul
echo.
echo SHA256 已写入并优化斜杠: %SHA_LIST%
echo.
pause
goto MENU

:: --------------------------------------------------
:: 3. 对比Aria2-List.txt文件
:: --------------------------------------------------
:STEP_3
echo.
echo [Compare - ARIA2_LIST]
powershell -NoProfile -Command "$sha=$env:SHA_LIST;$aria=$env:ARIA2_LIST;$ok=$env:ARIA2_LIST_OK;$fail=$env:ARIA2_LIST_FAIL;$lost=$env:ARIA2_LIST_LOST;Remove-Item $ok,$fail,$lost -ErrorAction SilentlyContinue;New-Item $ok,$fail,$lost -ItemType File -Force | Out-Null;$remote=@{};$current='';Get-Content -Encoding Default $aria | Foreach-Object {if($_ -match 'download/(v[^/]+)/([^/\s]+)'){ $current=$matches[1]+'|'+$matches[2] };if($_ -match 'checksum=sha-256=(.+)'){ $remote[$current]=$matches[1].ToLower() }};$lines=Get-Content -Encoding Default $sha;$total=$lines.Count;$w=$total.ToString().Length;$maxPathLen=0;foreach($line in $lines){if($line -match '^([0-9a-f]{64})\s+(.+)$'){$p=$matches[2] -replace '\\\\','\';if($p.Length -gt $maxPathLen){$maxPathLen=$p.Length}}};$i=0;$failCount=0;$failList=@();foreach($line in $lines){$i++;if($line -match '^([0-9a-f]{64})\s+(.+)$'){ $hash=$matches[1].ToLower();$path=$matches[2] -replace '\\\\','\';$ver=[regex]::Match($path,'v[0-9]+\.[0-9]+\.[0-9]+').Value;$file=[IO.Path]::GetFileName($path);$key=$ver+'|'+$file;$idx='['+$i.ToString().PadLeft($w)+'/'+$total.ToString().PadLeft($w)+'] ';$remVal=$remote[$key];if(-not $remote.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($remVal)){ $status='Checking is LOST ';$remDisp='LOST';$color='Yellow';$targetFile=$lost }elseif($remVal -eq $hash){ $status='Checking is OK   ';$remDisp=$remVal;$color='Green';$targetFile=$ok }else{ $status='Checking is FAIL ';$remDisp=$remVal;$color='Red';$targetFile=$fail;$failCount++;$failList+=$path };$paddedPath=$path.PadRight($maxPathLen);$logStr=$idx+$status+'| '+$paddedPath+' | LOCAL='+$hash+' REMOTE='+$remDisp;Write-Host $idx -NoNewline;Write-Host $status -ForegroundColor $color -NoNewline;Write-Host ('| '+$path);$logStr | Out-File $targetFile -Encoding Default -Append }};$tmpCount=[IO.Path]::Combine($env:TEMP,'sha256_fail_count.txt');$tmpList=[IO.Path]::Combine($env:TEMP,'sha256_fail_list.txt');[IO.File]::WriteAllText($tmpCount,$failCount.ToString());[IO.File]::WriteAllText($tmpList,($failList -join [Environment]::NewLine))"
chcp 936 >nul
echo.
echo [Compare - ARIA2_LIST - OK]   %ARIA2_LIST_OK%
echo [Compare - ARIA2_LIST - FAIL] %ARIA2_LIST_FAIL%
echo [Compare - ARIA2_LIST - LOST] %ARIA2_LIST_LOST%
echo.
pause
goto MENU

:: --------------------------------------------------
:: 4. 对比.DGST文件
:: --------------------------------------------------
:STEP_4
echo.
echo [Compare DGST_Files ]
powershell -NoProfile -Command "$target=$env:TARGET;$sha=$env:SHA_LIST;$ok=$env:DGST_Files_OK;$fail=$env:DGST_Files_FAIL;$lost=$env:DGST_Files_LOST;Remove-Item $ok,$fail,$lost -ErrorAction SilentlyContinue;New-Item $ok,$fail,$lost -ItemType File -Force | Out-Null;$remote=@{};Get-ChildItem -Path $target -Filter '*.dgst' -Recurse -ErrorAction SilentlyContinue | Foreach-Object { $ver=[regex]::Match($_.DirectoryName,'v[0-9]+\.[0-9]+\.[0-9]+').Value; $file=$_.Name -replace '\.dgst$',''; $key=$ver+'|'+$file; Get-Content -Encoding Default $_.FullName | Foreach-Object { if($_ -match 'SHA(?:2-)?256=\s*([0-9a-fA-F]{64})'){ $remote[$key]=$matches[1].ToLower() } } };$lines=Get-Content -Encoding Default $sha;$total=$lines.Count;$w=$total.ToString().Length;$maxPathLen=0;foreach($line in $lines){if($line -match '^([0-9a-f]{64})\s+(.+)$'){$p=$matches[2] -replace '\\\\','\';if($p.Length -gt $maxPathLen){$maxPathLen=$p.Length}}};$i=0;$failCount=0;$failList=@();foreach($line in $lines){$i++;if($line -match '^([0-9a-f]{64})\s+(.+)$'){ $hash=$matches[1].ToLower();$path=$matches[2] -replace '\\\\','\';$ver=[regex]::Match($path,'v[0-9]+\.[0-9]+\.[0-9]+').Value;$file=[IO.Path]::GetFileName($path);$key=$ver+'|'+$file;$idx='['+$i.ToString().PadLeft($w)+'/'+$total.ToString().PadLeft($w)+'] ';$remVal=$remote[$key];if(-not $remote.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($remVal)){ $status='Checking is LOST ';$remDisp='LOST';$color='Yellow';$targetFile=$lost }elseif($remVal -eq $hash){ $status='Checking is OK   ';$remDisp=$remVal;$color='Green';$targetFile=$ok }else{ $status='Checking is FAIL ';$remDisp=$remVal;$color='Red';$targetFile=$fail;$failCount++;$failList+=$path };$paddedPath=$path.PadRight($maxPathLen);$logStr=$idx+$status+'| '+$paddedPath+' | LOCAL='+$hash+' REMOTE='+$remDisp;Write-Host $idx -NoNewline;Write-Host $status -ForegroundColor $color -NoNewline;Write-Host ('| '+$path);$logStr | Out-File $targetFile -Encoding Default -Append }};$tmpCount=[IO.Path]::Combine($env:TEMP,'sha256_fail_count.txt');$tmpList=[IO.Path]::Combine($env:TEMP,'sha256_fail_list.txt');[IO.File]::WriteAllText($tmpCount,$failCount.ToString());[IO.File]::WriteAllText($tmpList,($failList -join [Environment]::NewLine))"
chcp 936 >nul
echo.
echo [Compare - DGST_Files - OK]   %DGST_Files_OK%
echo [Compare - DGST_Files - FAIL] %DGST_Files_FAIL%
echo [Compare - DGST_Files - LOST] %DGST_Files_LOST%
echo.
pause
goto MENU

:: --------------------------------------------------
:: 5. 压缩包完整性测试 (7z t AFUT Test)
:: --------------------------------------------------
:STEP_5
echo.
echo [Archived File Usability Testing (AFUT)]
powershell -NoProfile -Command "$target=$env:TARGET;$scriptDir=$PSScriptRoot;if(-not $scriptDir){$scriptDir=Get-Location};$ok=$env:AFUT_Files_OK;$err=$env:AFUT_Files_ERROR;$exts=$env:ArchiveEXT.Split(',');Remove-Item $ok,$err -ErrorAction SilentlyContinue;New-Item $ok,$err -ItemType File -Force | Out-Null;$lostLogs=Get-ChildItem -Path $scriptDir -Filter '*.sha256-LOST.log' -ErrorAction SilentlyContinue;if(-not $lostLogs){Write-Host '[提示] 未找到 *.sha256-LOST.log 文件，跳过测试。' -ForegroundColor Yellow;return};$filesToTest=[System.Collections.Generic.List[string]]::new();foreach($log in $lostLogs){Get-Content -Encoding Default $log.FullName | Foreach-Object {if($_ -match '\|\s*([A-Za-z]:\\[^|]+?)\s*\|.*REMOTE=LOST'){$rawPath=$matches[1].Trim();$file=[IO.Path]::GetFileName($rawPath);$ver=[regex]::Match($rawPath,'v[0-9]+\.[0-9]+\.[0-9]+').Value;$ext=[IO.Path]::GetExtension($file).TrimStart('.').ToLower();if($exts -contains $ext){$constructedPath=[IO.Path]::Combine($target,$ver,$file);if((Test-Path -LiteralPath $constructedPath) -and (-not $filesToTest.Contains($constructedPath))){$filesToTest.Add($constructedPath)}}}}};$total=$filesToTest.Count;if($total -eq 0){Write-Host '[提示] LOST 日志中无符合条件的压缩包文件。' -ForegroundColor Yellow;return};$w=$total.ToString().Length;$maxPathLen=0;foreach($f in $filesToTest){if($f.Length -gt $maxPathLen){$maxPathLen=$f.Length}};$i=0;foreach($f in $filesToTest){$i++;$idx='['+$i.ToString().PadLeft($w)+'/'+$total.ToString().PadLeft($w)+'] ';$res=7z t $f 2>&1;$resStr=$res -join [Environment]::NewLine;$paddedPath=$f.PadRight($maxPathLen);if($resStr -match 'Everything is Ok'){$status='Checking is OK   ';$color='Green';Write-Host $idx -NoNewline;Write-Host $status -ForegroundColor $color -NoNewline;Write-Host ('| '+$f);($idx+$status+'| '+$paddedPath) | Out-File $ok -Encoding Default -Append}else{$status='Checking is ERROR';$color='Red';$errMsg='Unknown Error';if($resStr -match '(ERRORS:[^\r\n]+|ERROR:[^\r\n]+|Open ERROR:[^\r\n]+|WARNINGS:[^\r\n]+|Can''t open as archive[^\r\n]*)'){$errMsg=$matches[1].Trim()};Write-Host $idx -NoNewline;Write-Host $status -ForegroundColor $color -NoNewline;Write-Host ('| '+$f+' ('+$errMsg+')');($idx+$status+'| '+$paddedPath+' | '+$errMsg) | Out-File $err -Encoding Default -Append}}"
chcp 936 >nul
echo.
echo [AFUT Test - OK]    %AFUT_Files_OK%
echo [AFUT Test - ERROR] %AFUT_Files_ERROR%
echo.
pause
goto MENU

:: --------------------------------------------------
:: 6. 清理以上产生的临时文件
:: --------------------------------------------------
:STEP_6
echo.
echo 正在清理生成的日志及临时文件...
del /f /q "%ArchiveFiles_LIST%" 2>nul
del /f /q "%SHA_LIST%" 2>nul
del /f /q "%ARIA2_LIST_OK%" 2>nul
del /f /q "%ARIA2_LIST_FAIL%" 2>nul
del /f /q "%ARIA2_LIST_LOST%" 2>nul
del /f /q "%DGST_Files_OK%" 2>nul
del /f /q "%DGST_Files_FAIL%" 2>nul
del /f /q "%DGST_Files_LOST%" 2>nul
del /f /q "%AFUT_Files_OK%" 2>nul
del /f /q "%AFUT_Files_ERROR%" 2>nul
del /f /q "%TEMP%\sha256_fail_count.txt" 2>nul
del /f /q "%TEMP%\sha256_fail_list.txt" 2>nul
echo 清理完成！
echo.
pause
goto MENU

:: --------------------------------------------------
:: 7. 顺序执行步骤 1-5
:: --------------------------------------------------
:STEP_ALL
call :STEP_1
call :STEP_2
call :STEP_3
call :STEP_4
call :STEP_5
echo.
echo [全部步骤执行完毕]
pause
goto MENU

:: --------------------------------------------------
:: 0. 退出脚本
:: --------------------------------------------------
:STEP_0
exit /b