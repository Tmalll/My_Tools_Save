@echo off

:前置反代设置
echo 前置反代设置...
set "proxy=https://e1v16lo23i.968050.xyz/7d2s84642v/"
set "proxy_Port=8443"

:: 优选IP
set "bestIP1=2606:4700::fb27:dda9:fa5a"
set "bestIP2=2602:fc59:b0:64::6815:5881"
set "bestIP3=104.20.20.215"
set "bestIP=%bestIP3%"

:: 获取反代HOSTS
for /f "tokens=2 delims=/" %%a in ("%proxy%") do set "proxyHOSTS=%%a"

:: 拼接反代端口
for /f "tokens=1,2* delims=/" %%a in ("%proxy%") do ( set "USEproxy=%%a//%%b:%proxy_Port%/%%c" )

echo.
echo 反代地址: 	[ %proxy% ] && echo.
echo 反代端口: 	[ %proxy_Port% ] && echo.
echo 反代HOSTS: 	[ %proxyHOSTS% ] && echo.
echo 最终反代地址: 	[ %USEproxy% ] && echo.
echo 优选IP: 	[ %bestIP% ] && echo.

:下载目标文件
echo 下载目标文件...
set "DLURL=https://github.com/MetaCubeX/Yacd-meta/archive/refs/heads/gh-pages.zip"
echo 目标文件地址:   [ %DLURL% ] 
echo.

:: 完整下载地址
set "finalurl=%USEproxy%%DLURL%"
echo 完整下载地址:   [ %finalurl% ] 
echo.

echo 开始下载...
del /s /q "%~dp0\gh-pages.zip"
curl -O -L "%finalurl%" --resolve %proxyHOSTS%:%proxy_Port%:%bestIP% ^
 	 -w "\n ★★★ 相应的HTTP代码为: [ %%{http_code} ] \n\n ★★★ 所请求的服务器IP地址为: [ %%{remote_ip} ]\n\n ★★★ 目标连接端口: [ %%{remote_port} ] \n" ^
 	 --connect-timeout 5
echo.

:解压安装
echo 解压安装...

:: 删除原来的
rmdir /s /q "%~dp0\#core_and_data\webui" 
rmdir /s /q "%~dp0\#core_and_data\Yacd-meta-gh-pages" 

:: 解压安装
powershell Expand-Archive -Path "./gh-pages.zip" -DestinationPath "./#core_and_data"
rename "%~dp0\#core_and_data\Yacd-meta-gh-pages" webui

:: 清理
del /s /q "%~dp0gh-pages.zip"


pause
exit



