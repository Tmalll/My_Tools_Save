@echo off
cd /d "%~dp0"

:: 需要nircmd.exe 程序
:: 程序名称和程序路径
set appNAME=Iceweasel.exe
set appPATH=%~dp0App\%appNAME%

:: 脚本头
title %appNAME% 隐藏启动脚本
echo %appNAME% 隐藏启动脚本
echo.

:: 清理原有进程
echo 优雅的关闭原有进程.
nircmd.exe closeprocess %appNAME%
pathping -p 3000 -q 1 localhost >nul
taskkill /t /im %appNAME%
pathping -p 3000 -q 1 localhost >nul
taskkill /f /t /im %appNAME%
timeout /t 3

:: 最小化启动
echo 启动文件为: %appPATH%
start /min ""     "%appPATH%"
timeout /t 3


:: 通过 nircmd.exe 隐藏任务栏图标
:: 总循环秒数s / 间隔ms
set "loop_length_Second=3" & set "loop_interval_MS=100"
:: --- PowerShell 后台静默循环 ---
start /min "" powershell -WindowStyle Hidden -Command "$total=(%loop_length_Second% * 1000); $interval=%loop_interval_MS%; $elapsed=0; while($elapsed -lt $total){ nircmd.exe win hide class 'MozillaWindowClass'; nircmd.exe win hide process '%appNAME%'; Start-Sleep -Milliseconds $interval; $elapsed += $interval }"


exit

:: 手动获取class类名
set "PRname=chrome.exe"
set "PSname=%PRname:.exe=%"
powershell -Command "$h=(Get-Process %PSname% -EA 0).MainWindowHandle | ?{$_ -ne 0}; if($h){ $code='[DllImport(\"user32.dll\")]public static extern int GetClassName(IntPtr h,System.Text.StringBuilder s,int n);'; $type=Add-Type -MemberDefinition $code -Name ('W'+[Guid]::NewGuid().ToString('N')) -PassThru; $sb=New-Object System.Text.StringBuilder 256; $type::GetClassName($h[0], $sb, 256) | Out-Null; Write-Host \"`nClassName = $($sb.ToString())\" }else{ Write-Host \"`n未发现该进程的窗口\" }"



powershell -Command "Get-Process %PSname% -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowHandle -ne 0} | ForEach-Object { $code = '[DllImport(\"user32.dll\")]public static extern int GetClassName(IntPtr h,System.Text.StringBuilder s,int n);'; $type = Add-Type -MemberDefinition $code -Name ('W'+[Guid]::NewGuid().ToString('N')) -PassThru; $sb = New-Object System.Text.StringBuilder 256; $type::GetClassName($_.MainWindowHandle, $sb, 256) | Out-Null; $sb.ToString() }"



powershell -Command "$p=Get-Process Iceweasel -EA 0; if($p){$defs='[DllImport(\"user32.dll\")]public static extern int GetClassName(IntPtr h,System.Text.StringBuilder l,int m);'; $type=Add-Type -MemberDefinition $defs -Name 'Win32' -PassThru; $sb=New-Object System.Text.StringBuilder 256; $type::GetClassName($p.MainWindowHandle[0], $sb, 256) >$null; $sb.ToString()}else{'Process not found'}"



:: --- PowerShell 后台静默循环 (自动识别进程名下的类名并隐藏) ---
start /min "" powershell -WindowStyle Hidden -Command "$total=(%loop_length_Second% * 1000); $interval=%loop_interval_MS%; $elapsed=0; $code = @' [DllImport(\"user32.dll\")] public static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount); '@; $win32 = Add-Type -MemberDefinition $code -Name 'Win32Utils' -Namespace 'Win32' -PassThru; while($elapsed -lt $total){ $procs = Get-Process Iceweasel -ErrorAction SilentlyContinue; foreach($p in $procs){ if($p.MainWindowHandle -ne 0){ $sb = New-Object System.Text.StringBuilder 256; [void]$win32::GetClassName($p.MainWindowHandle, $sb, $sb.Capacity); $className = $sb.ToString(); if($className) { nircmd.exe win hide class \"$className\" } } }; Start-Sleep -Milliseconds $interval; $elapsed += $interval }"


:: 简化后的后台循环指令：只盯准进程名
start /min "" powershell -WindowStyle Hidden -Command "$total=(%loop_length_Second% * 1000); $interval=%loop_interval_MS%; $elapsed=0; while($elapsed -lt $total){ nircmd.exe win hide process 'Iceweasel.exe'; Start-Sleep -Milliseconds $interval; $elapsed += $interval }"

nircmd.exe win hide class "MozillaWindowClass"
nircmd.exe win hide process "Iceweasel.exe"




当前.bat版本
:: 循环次数计算：(秒数 * 1000) / 间隔
set /a "loop_count=(%loop_length_Second% * 1000) / %loop_interval_MS%"

for /L %%i in (1,1,%loop_count%) do (
    nircmd.exe win hide class "MozillaWindowClass"
    nircmd.exe win hide process "Iceweasel.exe"
    pathping -p %loop_interval_MS% -q 1 localhost >nul
    echo 隐藏任务栏图标循环+1
)

