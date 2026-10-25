@echo off

rem https://api.github.com/repos/MetaCubeX/mihomo/releases
rem https://github.com/MetaCubeX/mihomo/releases/tag/Prerelease-Alpha
rem https://api.github.com/repos/MetaCubeX/mihomo/releases/tags/Prerelease-Alpha

:: 设置代理服务器
set http_proxy=socks5h://192.168.1.40:10800
set https_proxy=%http_proxy%
set HTTP_PROXY=%http_proxy%
set HTTPS_PROXY=%http_proxy%

:获取下载地址 
echo 获取下载地址...
set "GITHUB_API=https://api.github.com/repos/MetaCubeX/mihomo/releases/tags/Prerelease-Alpha"

:: API超出限制解决办法, 去设置一个token, https://github.com/settings/personal-access-tokens
:: set "GITHUB_TOKEN=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"
:: 然后在下面的curl下载中增加如下参数. -H "Authorization: token %GITHUB_TOKEN%"

curl.exe -sL "%GITHUB_API%" -o "%~dp0mihomo_api.json" ^
    --connect-timeout 5 ^
    -w "\n\n ★★★ 相应的HTTP代码为: [ %%{http_code} ] \n\n ★★★ 所请求的服务器IP地址为: [ %%{remote_ip} ] \n\n ★★★ 目标连接端口: [ %%{remote_port} ] \n\n"

:: PowerShell 解析 JSON 文件
for /f "delims=" %%i in ('powershell -NoProfile -Command ^
    "$json = Get-Content '%~dp0\mihomo_api.json' -Raw | ConvertFrom-Json;" ^
    "$url = $json.assets.browser_download_url | Where-Object { $_ -match 'windows-amd64' } | Where-Object { $_ -match 'v3-alpha' };" ^
    "Write-Output $url"') do set "DLURL=%%i"

echo 目标文件下载地址为: 
echo %DLURL%
echo.
timeout /t 1 > NUL
pause

:下载目标文件

echo 开始下载...
del /s /q "%~dp0\clash_core_updata.zip"
curl -o "%~dp0\clash_core_updata.zip" -L "%DLURL%" ^
 	 -w "\n ★★★ 相应的HTTP代码为: [ %%{http_code} ] \n\n ★★★ 所请求的服务器IP地址为: [ %%{remote_ip} ]\n\n ★★★ 目标连接端口: [ %%{remote_port} ] \n" ^
 	 --connect-timeout 5
echo.
echo 下载完成...
timeout /t 1 > NUL
echo.
echo.



:解压安装
echo 解压安装...
echo.

mkdir "%~dp0#core_and_data"
del /s /q "%~dp0#core_and_data\*mihomo*.exe"
pause

timeout /t 1 > NUL
echo 解压新版本程序并改名...
powershell Expand-Archive -Path "%~dp0clash_core_updata.zip" -DestinationPath "%~dp0#core_and_data"
rename "%~dp0#core_and_data\*mihomo*.exe" #mihomo.exe
echo 程序改名成功.
echo.

pause

:清理安装文件
echo 清理安装文件...
del /s /q "%~dp0clash_core_updata.zip"
del /s /q "%~dp0mihomo_api.json"
echo.

echo 程序安装完成, 15秒后开始连接程序...
timeout /t 15 > NUL


pause
exit

