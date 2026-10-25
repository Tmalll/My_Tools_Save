@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: 基础路径变量
:: ============================================================
set "DEST_ROOT=%~dp0"
if "%DEST_ROOT:~-1%"=="\" set "DEST_ROOT=%DEST_ROOT:~0,-1%"
set "rarPath=C:\Program Files\WinRAR\Rar.exe"

:: ============================================================
:: WinRAR 命令行参数配置 (在此处灵活调整)
set "RAR_ARGS=a -m1 -tl -htb -oc -df -k -ep1 -idq"
:: ============================================================
:: 已选用的参数说明：
:: a     : 添加文件到压缩包
:: -m1   : 压缩等级 (0-存储, 1-最快, 2-快速, 3-标准, 4-较好, 5-最好)
:: -tl   : 将压缩包时间设置为最新文件的修改时间
:: -htb  : 使用 BLAKE2 文件校验和
:: -oc   : 保存相同的文件为参考 (节省重复数据空间)
:: -df   : 压缩后删除源文件 (Delete files after archiving)
:: -k    : 锁定压缩包 (防止后续被修改)
:: -ep1  : 排除主路径 (压缩包内直接显示文件夹，无深层嵌套)
:: -idp  : 仅显示单行总进度条 (不刷屏，但能看进度)
::
:: 其他常用参数：
:: -r    : 包含子文件夹 (此处因传入的是路径列表，RAR会自动处理)
:: -p    : 设置密码 (例如: -p123)
:: -m5   : 追求极致压缩比 (但速度慢)
:: -v1g  : 分卷压缩，每个卷 1GB
:: ============================================================

:: 业务逻辑变量
set "bakName=DR2_Save_Bak"
set "DaysBack=7"

echo 正在归档旧备份至 WinRAR...

:: ============================================================
:: 执行 PowerShell (单行逻辑处理日期区间与调用)
:: ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -Command "$today=(Get-Date).ToString('yyyy-MM-dd'); $limit=(Get-Date).AddDays(-%DaysBack%).Date; $items = Get-ChildItem -LiteralPath '%DEST_ROOT%' -Directory | Where-Object { $_.Name -like '%bakName%_????-??-??_*' }; $targets = $items | ForEach-Object { $dStr=$_.Name.Substring('%bakName%_'.Length, 10); try { $d=[DateTime]::ParseExact($dStr,'yyyy-MM-dd',$null); if($d -lt $limit){ [PSCustomObject]@{Obj=$_; Date=$d; DateStr=$dStr} } } catch{} } | Sort-Object Date; if($targets){ $minDate=$targets[0].DateStr; $maxDate=$targets[-1].DateStr; $rarName='%bakName%_' + $today + '_归档(' + $minDate + '_' + $maxDate + ').rar'; $rarFullPath = Join-Path '%DEST_ROOT%' $rarName; $listFile = Join-Path $env:TEMP 'rar_list.txt'; $targets.Obj.FullName | Out-File $listFile -Encoding Default; Write-Host ('正在生成: ' + $rarName) -ForegroundColor Green; & '%rarPath%' %RAR_ARGS% \"$rarFullPath\" \"@$listFile\"; if($?){ Remove-Item $listFile } } else { Write-Host '未发现符合条件的旧备份。' -ForegroundColor Gray }"

echo.
echo 任务执行完毕。
pause