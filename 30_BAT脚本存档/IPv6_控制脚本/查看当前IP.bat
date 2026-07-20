@echo off
ipconfig/flushdns
cls


echo ------------------------------ 查看本机ip ------------------------------
echo.
ipconfig | findstr IPv6
echo.


echo 本机 - 境内ip
curl -m 5 -4 https://test.ipw.cn/
echo.
curl -m 5 -6 https://test.ipw.cn/
echo.
echo.

echo 本机 - 境外ip
curl -m 5 -4 http://icanhazip.com/
curl -m 5 -6 http://icanhazip.com/
echo.
echo.

pause
cls
echo ------------------------------ 查看 192.168.1.29 Clash 代理IP ------------------------------

echo 测试 - 192.168.1.29:10800
curl -m 5 https://4.icanhazip.com/ -x socks5h://192.168.1.29:10800
curl -m 5 https://6.icanhazip.com/ -x socks5h://192.168.1.29:10800
echo.
echo.

echo 测试 - 192.168.1.29:10801
curl -m 5 https://4.icanhazip.com/ -x socks5h://192.168.1.29:10801
curl -m 5 https://6.icanhazip.com/ -x socks5h://192.168.1.29:10801
echo.
echo.

echo 测试 - 192.168.1.29:10802
curl -m 5 https://4.icanhazip.com/ -x socks5h://192.168.1.29:10802
curl -m 5 https://6.icanhazip.com/ -x socks5h://192.168.1.29:10802
echo.
echo.

pause
cls
echo ------------------------------ 测试 对外socks5代理地址 ------------------------------
echo.

echo 测试 - 192.168.1.40:10822 Socks5带密码代理
curl -m 5 https://4.icanhazip.com/ -x socks5h://master:3wARosoGHzURSpNh1E7LYNhY2vwOY7@192.168.1.40:10822
curl -m 5 https://6.icanhazip.com/ -x socks5h://master:3wARosoGHzURSpNh1E7LYNhY2vwOY7@192.168.1.40:10822
echo.
echo.

echo 测试 - home.miaosky.party:10833 https带密码代理
curl -m 5 https://4.icanhazip.com/ -x https://master:3wARosoGHzURSpNh1E7LYNhY2vwOY7@home.miaosky.party:10833 --proxy-insecure
curl -m 5 https://6.icanhazip.com/ -x https://master:3wARosoGHzURSpNh1E7LYNhY2vwOY7@home.miaosky.party:10833 --proxy-insecure
echo.
echo.

echo 测试 - home-v6.miaosky.party:10833 https带密码代理
curl -m 5 https://4.icanhazip.com/ -x https://master:3wARosoGHzURSpNh1E7LYNhY2vwOY7@home-v6.miaosky.party:10833 --proxy-insecure
curl -m 5 https://6.icanhazip.com/ -x https://master:3wARosoGHzURSpNh1E7LYNhY2vwOY7@home-v6.miaosky.party:10833 --proxy-insecure
echo.
echo.


pause
cls
echo ------------------------------ 当前ipv4 / ipv6优先级 ------------------------------
echo.


netsh interface ipv6 show prefixpolicies
echo.


pause
cls
echo ------------------------------ nslookup ------------------------------


nslookup translate.googleapis.com
nslookup www.google.com
nslookup www.huya.com


pause
exit
































