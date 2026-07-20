@echo off

:: 设置模式
set "MODE=1"

:: ==========================【用户配置区域】==========================
:: ----- 【模式 1：按方括号位置对调】 -----
set "POSITION_A=3"
set "POSITION_B=4"

:: ----- 【模式 2：按字符长度对调】 -----
set "LENGTH_A=11"
set "LENGTH_B=0"

:: ----- 【模式 3：特征字符平移到末尾】 -----
set "MOVE_STR=[LI*NO *]"
:: ====================================================================

echo 正在采用静态快照模式安全处理中，请稍候...

:: 致命修正：将 Get-ChildItem 用圆括号 ( ) 包裹起来！这会强迫系统先一次性生成所有文件的静态快照，切断改名后的二次读取，彻底解决循环对调问题。
powershell -NoProfile -Command "$mode='%MODE%'; $pa=[int]'%POSITION_A%'-1; $pb=[int]'%POSITION_B%'-1; $la=[int]'%LENGTH_A%'; $lb=[int]'%LENGTH_B%'; $ms='%MOVE_STR%'; (Get-ChildItem -LiteralPath '%~dp0' -Recurse -File) | ForEach-Object { $file = $_; try { $ext = $file.Extension; $base = $file.BaseName; $newName = ''; if ($mode -eq '1' -or $mode -eq '2') { $blocks = [regex]::Matches($base, '\[.*?\]') | ForEach-Object { $_.Value }; if ($blocks.Count -gt 0) { if ($mode -eq '1') { if ($blocks.Count -gt $pa -and $blocks.Count -gt $pb) { $temp = $blocks[$pa]; $blocks[$pa] = $blocks[$pb]; $blocks[$pb] = $temp; $newName = ($blocks -join '') + $ext } } else { for ($i=0; $i -lt $blocks.Count-1; $i++) { $cleanA = $blocks[$i].Trim('[',']'); $cleanB = $blocks[$i+1].Trim('[',']'); if ($cleanA.Length -eq $la -and ($lb -eq 0 -or $cleanB.Length -eq $lb)) { $temp = $blocks[$i]; $blocks[$i] = $blocks[$i+1]; $blocks[$i+1] = $temp; break } } $newName = ($blocks -join '') + $ext } } } else { $regexMs = [Regex]::Escape($ms).Replace('\*', '.*?'); if ($base -match $regexMs) { $matched = $Matches[0]; $newName = $base.Replace($matched, '') + $matched + $ext } }; if ($newName -and $newName -ne $file.Name) { Rename-Item -LiteralPath $file.FullName -NewName $newName -Force; Write-Host '成功修改: ' $file.Name ' -> ' $newName -ForegroundColor Green } } catch { Write-Host '【错误】' $file.Name -ForegroundColor Red }; Remove-Variable -Name file, ext, base, newName, blocks, temp -ErrorAction SilentlyContinue }"

echo 处理完成！
pause