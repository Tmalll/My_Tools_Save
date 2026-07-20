@echo off
:: =================【用户配置区域】=================
:: 设置需要被替换的旧字段（支持方括号等特殊字符）
set "OLD_STR=[640x356][18]"

:: 设置替换后的新字段（如果想直接删除，请保持留空，即 set "NEW_STR="）
set "NEW_STR="
:: =================================================

echo 正在处理当前目录及子目录下的文件，请稍候...

:: 核心PowerShell一行流：使用%~dp0完美支持UNC网络路径，-Recurse支持子目录，.Contains免疫方括号转义
powershell -NoProfile -Command "Get-ChildItem -LiteralPath '%~dp0' -Recurse -File | Where-Object { $_.Name.Contains($env:OLD_STR) } | ForEach-Object { $newName = $_.Name.Replace($env:OLD_STR, $env:NEW_STR); if ($newName -ne $_.Name) { Rename-Item -LiteralPath $_.FullName -NewName $newName -Force } }"

echo 替换完成！
pause