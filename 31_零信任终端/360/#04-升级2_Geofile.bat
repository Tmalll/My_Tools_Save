@echo off

:: 设置代理服务器
set http_proxy=socks5h://192.168.1.40:10800
set https_proxy=%http_proxy%
set HTTP_PROXY=%http_proxy%
set HTTPS_PROXY=%http_proxy%


:下载文件
echo 结束后台程序...
taskkill /f /t /im #mihomo.exe
taskkill /f /t /im #mihomo.exe
taskkill /f /t /im #mihomo.exe
timeout /t 2 > NUL
echo.

del /s /q "%~dp0#core_and_data\geosite.dat"
del /s /q "%~dp0#core_and_data\geoip.dat"
del /s /q "%~dp0#core_and_data\geoip.metadb"
del /s /q "%~dp0#core_and_data\ASN.mmdb"
timeout /t 2 > NUL


echo 开始下载...
set "GeoURL=https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat"
curl -o "%~dp0#core_and_data\geosite.dat" -L "%USEproxy%%GeoURL%" --resolve %proxyHOSTS%:%proxy_Port%:%bestIP% ^
 	 -w "\n ★★★ 相应的HTTP代码为: [ %%{http_code} ] \n\n ★★★ 所请求的服务器IP地址为: [ %%{remote_ip} ]\n\n ★★★ 目标连接端口: [ %%{remote_port} ] \n" ^
 	 --connect-timeout 5
echo.

echo 开始下载...
set "GeoURL=https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat"
curl -o "%~dp0#core_and_data\geoip.dat" -L "%USEproxy%%GeoURL%" --resolve %proxyHOSTS%:%proxy_Port%:%bestIP% ^
 	 -w "\n ★★★ 相应的HTTP代码为: [ %%{http_code} ] \n\n ★★★ 所请求的服务器IP地址为: [ %%{remote_ip} ]\n\n ★★★ 目标连接端口: [ %%{remote_port} ] \n" ^
 	 --connect-timeout 5
echo.

echo 开始下载...
set "GeoURL=https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.metadb"
curl -o "%~dp0#core_and_data\geoip.metadb" -L "%USEproxy%%GeoURL%" --resolve %proxyHOSTS%:%proxy_Port%:%bestIP% ^
 	 -w "\n ★★★ 相应的HTTP代码为: [ %%{http_code} ] \n\n ★★★ 所请求的服务器IP地址为: [ %%{remote_ip} ]\n\n ★★★ 目标连接端口: [ %%{remote_port} ] \n" ^
 	 --connect-timeout 5
echo.

echo 开始下载...
set "GeoURL=https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/GeoLite2-ASN.mmdb"
curl -o "%~dp0#core_and_data\ASN.mmdb" -L "%USEproxy%%GeoURL%" --resolve %proxyHOSTS%:%proxy_Port%:%bestIP% ^
 	 -w "\n ★★★ 相应的HTTP代码为: [ %%{http_code} ] \n\n ★★★ 所请求的服务器IP地址为: [ %%{remote_ip} ]\n\n ★★★ 目标连接端口: [ %%{remote_port} ] \n" ^
 	 --connect-timeout 5
echo.


echo 程序安装完成, 15秒后开始连接程序...
timeout /t 15 > NUL

pause
exit









