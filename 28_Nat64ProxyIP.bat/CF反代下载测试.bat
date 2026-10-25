@echo off

:: 前置反代设置
set "proxy=https://e1v16lo23i.968050.xyz/7d2s84642v/"
set "proxy_Port=8443"
:: set "bestIP=2606:4700::fb27:dda9:fa5a"
set "bestIP=2602:fc59:b0:64::6815:5881"


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

:: 目标文件地址
rem set "DLURL=http://lax-ca-us-ping.vultr.com/vultr.com.1000MB.bin"
set "DLURL=https://mirror-cdn.xtom.com/ubuntu-releases/20.04/ubuntu-20.04.6-live-server-amd64.iso"
echo 目标文件地址:   [ %DLURL% ] 
echo.

:: 完整测试地址
set "finalurl=%USEproxy%%DLURL%"
echo 完整测试地址:   [ %finalurl% ] 
echo.

echo 测试下载地址...
curl -o NUL -L --silent "%finalurl%" --resolve %proxyHOSTS%:%proxy_Port%:%bestIP% ^
 	 -w "\n ★★★ 相应的HTTP代码为: [ %%{http_code} ] \n\n ★★★ 所请求的服务器IP地址为: [ %%{remote_ip} ]\n\n ★★★ 目标连接端口: [ %%{remote_port} ] \n" ^
 	 --connect-timeout 2 --max-time 3 --speed-time 1 --speed-limit 1073741824
echo.

pause
exit

echo 参数说明
:: --limit-rate 1000, 速度限制: 默认=字节, 或者使用后缀 k/K, m/M, g/G...
:: --silent ,  -s

:: 方案 1：使用 -I (HEAD 请求) —— 官方标准 
:: 	优点：返回 200 OK，流量几乎为零。
:: 	缺点：极少数配置不当的代理或 CDN 可能会拦截 HEAD 请求或返回 405 错误。

:: 方案 2：利用 -Y 和 -y (低速自动断开) 如果你必须使用 GET 请求（为了 100% 模拟真实下载行为），
:: 	-y 1 -Y 1G   |   -Y, --speed-limit <speed>   |   -y, --speed-time <seconds> 
:: 	但想在获取到状态码后立即“掐断”，可以利用 curl 的速度限制参数。

:: 方案 3：使用 --max-filesize (限制最大文件)
:: 	告诉 curl 如果文件超过一定大小就拒绝执行。注意：这个参数依赖于服务器返回 Content-Length。
:: 	效果：如果目标文件（1000MB）超过你设定的值，curl 会在握手并拿到头信息后直接报错退出，不会下载内容。
:: 	--max-filesize 100

:: 方案 4: --range 0-1000 限制下载文件的范围. 但是只能返回206

:: 方案 5: --connect-timeout 3 --max-time 5 限定连接时间和总测试时间, 这种方式最稳, 但是测试慢.





