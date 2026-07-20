@echo off

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)


set "ADD_PATH=%~dp0"


echo 添加到path列表底部...
powershell -NoProfile -Command "$p='%ADD_PATH%';try{$r=[Microsoft.Win32.Registry]::LocalMachine.OpenSubKey('SYSTEM\CurrentControlSet\Control\Session Manager\Environment',$true);$o=$r.GetValue('Path','',[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames);if($o -match [regex]::Escape($p)){Write-Host 'PATH 已存在，跳过。' -ForegroundColor Yellow}else{$n=if($o -and !$o.EndsWith(';')){\"$o;$p\"}else{\"$o$p\"};$r.SetValue('Path',$n,[Microsoft.Win32.RegistryValueKind]::ExpandString);Write-Host 'PATH 添加成功。' -ForegroundColor Green};$r.Close()}catch{Write-Host 'PATH 添加失败：'$_ -ForegroundColor Red}"
echo.


echo 刷新环境变量...
powershell -NoProfile -Command "try{Add-Type '[DllImport(\"user32.dll\",SetLastError=true,CharSet=CharSet.Auto)]public static extern IntPtr SendMessageTimeout(IntPtr hWnd,uint Msg,UIntPtr wParam,string lParam,uint fuFlags,uint uTimeout,out UIntPtr lpdwResult);' -Name W32 -Namespace Native -ErrorAction Stop; $r=[UIntPtr]::Zero; [Native.W32]::SendMessageTimeout([IntPtr]0xffff,0x1A,[UIntPtr]::Zero,'Environment',2,5000,[ref]$r) | Out-Null; Write-Host '环境变量刷新广播成功。' -ForegroundColor Green}catch{Write-Host '环境变量刷新广播失败：'$_ -ForegroundColor Red}"
echo.

for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path') do (
    call set "PATH=%%b"
)

echo.
echo 完整的 PATH 列表（逐行显示）：
echo ----------------------------------------
timeout /t 1
cmd /c "echo %path:;=&echo.%"
echo ----------------------------------------
echo.



pause
exit








powershell -NoProfile -Command "Add-Type '[DllImport(\"user32.dll\",SetLastError=true,CharSet=CharSet.Auto)]public static extern IntPtr SendMessageTimeout(IntPtr hWnd,uint Msg,UIntPtr wParam,string lParam,uint fuFlags,uint uTimeout,out UIntPtr lpdwResult);' -Name W32 -Namespace Native; $r=[UIntPtr]::Zero; [Native.W32]::SendMessageTimeout([IntPtr]0xffff,0x1A,[UIntPtr]::Zero,'Environment',2,5000,[ref]$r) | Out-Null"
