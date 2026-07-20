@echo off

:: 设置代理服务器
set http_proxy=socks5h://192.168.1.40:10800
set https_proxy=%http_proxy%
set HTTP_PROXY=%http_proxy%
set HTTPS_PROXY=%http_proxy%


:前置反代设置
echo 前置反代设置...
set "proxy=https://e1v16lo23i.968050.xyz/7d2s84642v/"
set "proxy_Port=8443"

:: 优选IP
set "bestIP1=2606:4700::fb27:dda9:fa5a"
set "bestIP2=2602:fc59:b0:64::6815:5881"
set "bestIP3=104.26.5.186"
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

:下载文件
echo 结束后台程序...
taskkill /f /t /im #mihomo.exe
taskkill /f /t /im #mihomo.exe
taskkill /f /t /im #mihomo.exe
timeout /t 2 > NUL
echo.

mkdir C:\#mihomo_latest
del /s /q "C:\#mihomo_latest\geosite.dat"
del /s /q "C:\#mihomo_latest\geoip.dat"
del /s /q "C:\#mihomo_latest\geoip.metadb"
timeout /t 2 > NUL


echo 开始下载...
set "GeoURL=https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat"
curl -o "C:\#mihomo_latest\geosite.dat" -L "%USEproxy%%GeoURL%" --resolve %proxyHOSTS%:%proxy_Port%:%bestIP% ^
 	 -w "\n ★★★ 相应的HTTP代码为: [ %%{http_code} ] \n\n ★★★ 所请求的服务器IP地址为: [ %%{remote_ip} ]\n\n ★★★ 目标连接端口: [ %%{remote_port} ] \n" ^
 	 --connect-timeout 5
echo.

echo 开始下载...
set "GeoURL=https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat"
curl -o "C:\#mihomo_latest\geoip.dat" -L "%USEproxy%%GeoURL%" --resolve %proxyHOSTS%:%proxy_Port%:%bestIP% ^
 	 -w "\n ★★★ 相应的HTTP代码为: [ %%{http_code} ] \n\n ★★★ 所请求的服务器IP地址为: [ %%{remote_ip} ]\n\n ★★★ 目标连接端口: [ %%{remote_port} ] \n" ^
 	 --connect-timeout 5
echo.

echo 开始下载...
set "GeoURL=https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.metadb"
curl -o "C:\#mihomo_latest\geoip.metadb" -L "%USEproxy%%GeoURL%" --resolve %proxyHOSTS%:%proxy_Port%:%bestIP% ^
 	 -w "\n ★★★ 相应的HTTP代码为: [ %%{http_code} ] \n\n ★★★ 所请求的服务器IP地址为: [ %%{remote_ip} ]\n\n ★★★ 目标连接端口: [ %%{remote_port} ] \n" ^
 	 --connect-timeout 5
echo.

echo 开始下载...
set "GeoURL=https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/GeoLite2-ASN.mmdb"
curl -o "C:\#mihomo_latest\GeoLite2-ASN.mmdb" -L "%USEproxy%%GeoURL%" --resolve %proxyHOSTS%:%proxy_Port%:%bestIP% ^
 	 -w "\n ★★★ 相应的HTTP代码为: [ %%{http_code} ] \n\n ★★★ 所请求的服务器IP地址为: [ %%{remote_ip} ]\n\n ★★★ 目标连接端口: [ %%{remote_port} ] \n" ^
 	 --connect-timeout 5
echo.


echo 程序安装完成, 15秒后开始连接程序...
timeout /t 15 > NUL

:链接运行程序...
"%~dp0#04-升级4_链接运行程序.bat"


pause
exit









