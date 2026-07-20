@echo off
set "TARGET=C:\Users\Administrator\AppData\Local\Temp"

:: ---- 第一条：删除 7 天未访问的文件 ----
powershell -NoProfile -Command "Get-ChildItem -Path '%TARGET%' -Recurse -File | Where-Object { $_.LastAccessTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force -ErrorAction SilentlyContinue"

:: ---- 第二条：删除空目录（倒序） ----
powershell -NoProfile -Command "Get-ChildItem -Path '%TARGET%' -Recurse -Directory | Sort-Object FullName -Descending | ForEach-Object { if(-not (Get-ChildItem $_.FullName -Force -ErrorAction SilentlyContinue)) { Remove-Item $_.FullName -Force -Recurse -ErrorAction SilentlyContinue } }"

pause
