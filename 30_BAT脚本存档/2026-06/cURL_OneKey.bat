@echo off

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)



:: 设置代理服务器
set http_proxy=socks5h://192.168.1.40:10800
set https_proxy=%http_proxy%
set HTTP_PROXY=%http_proxy%
set HTTPS_PROXY=%http_proxy%


:: 目标文件地址
set "DLURL=https://curl.se/windows/latest.cgi?p=win64-mingw.zip"
echo 目标文件地址:   [ %DLURL% ] 
echo.


echo 开始下载目标文件
curl -o %~dp0curl-latest.zip -L "%DLURL%" --connect-timeout 5
echo.

echo 开始解压安装
set "TARGET_DIR=C:\#curl_latest"
set "TEMP_EXTRACT=%~dp0curl_tmp"

mkdir "%TARGET_DIR%"

:: 2. PowerShell 一键解压 (单行)
powershell -Command "Expand-Archive -Path '%~dp0curl-latest.zip' -DestinationPath '%TEMP_EXTRACT%' -Force"

:: 3. 筛选并拷贝 (只拿你需要的：exe, dll, crt)
:: 逻辑：先找到 bin 目录，然后拷贝指定后缀文件
powershell -Command "$bin = (Get-ChildItem -Path '%TEMP_EXTRACT%\curl-*\bin' | Select-Object -First 1).FullName; Copy-Item -Path \"$bin\curl.exe\",\"$bin\libcurl-x64.dll\",\"$bin\curl-ca-bundle.crt\" -Destination '%TARGET_DIR%' -Force"

:: 4. 生成 .curlrc 文件
echo --proxy-cacert %TARGET_DIR%\curl-ca-bundle.crt > "%TARGET_DIR%\.curlrc"

:: 5. 清理垃圾
del /f /q "%~dp0curl-latest.zip"
rmdir /q /s "%TEMP_EXTRACT%"

:: 6. 添加PATH
set "ADD_PATH=%TARGET_DIR%"
powershell -NoProfile -Command "$p='%ADD_PATH%';try{$r=[Microsoft.Win32.Registry]::LocalMachine.OpenSubKey('SYSTEM\CurrentControlSet\Control\Session Manager\Environment',$true);$o=$r.GetValue('Path','',[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames);if($o -match [regex]::Escape($p)){Write-Host 'PATH 已存在，跳过。' -ForegroundColor Yellow}else{$r.SetValue('Path',\"$p;$o\",[Microsoft.Win32.RegistryValueKind]::ExpandString);Write-Host 'PATH 添加成功。' -ForegroundColor Green};$r.Close()}catch{Write-Host 'PATH 添加失败：'$_ -ForegroundColor Red}"
powershell -NoProfile -Command "try{Add-Type '[DllImport(\"user32.dll\",SetLastError=true,CharSet=CharSet.Auto)]public static extern IntPtr SendMessageTimeout(IntPtr hWnd,uint Msg,UIntPtr wParam,string lParam,uint fuFlags,uint uTimeout,out UIntPtr lpdwResult);' -Name W32 -Namespace Native -ErrorAction Stop; $r=[UIntPtr]::Zero; [Native.W32]::SendMessageTimeout([IntPtr]0xffff,0x1A,[UIntPtr]::Zero,'Environment',2,5000,[ref]$r) | Out-Null; Write-Host '环境变量刷新广播成功。' -ForegroundColor Green}catch{Write-Host '环境变量刷新广播失败：'$_ -ForegroundColor Red}"
echo.

echo 测试目标位置...
timeout /t 3
start cmd /k "echo. && where curl && echo. && pause && exit"
echo.

pause
exit