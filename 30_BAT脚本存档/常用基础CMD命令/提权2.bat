@echo off


%1 mshta vbscript:CreateObject("Shell.Application").ShellExecute("cmd.exe","/c %~s0 ::","","runas",1)(window.close)&&exit
:: 下面放要运行的程序...




%1 mshta vbscript:CreateObject("Shell.Application").ShellExecute("cmd.exe","/c ""%~s0"" ::","","runas",1)(window.close)&&exit
:: 下面放要运行的程序...






sc stop "dnscrypt-proxy"
sc start "dnscrypt-proxy"
echo dnscrypt-proxy已重启

sc stop "PcapDNSProxyService"
sc start "PcapDNSProxyService"
echo PcapDNSProxyService已重启


sc config dnscrypt-proxy start= auto
echo dnscrypt-proxy已设置自动

sc config PcapDNSProxyService start= auto
echo PcapDNSProxyService已设置自动

pause
exit

echo 【sc config 服务名 start= demand     //手动】
echo 【sc condig 服务名 start= auto       //自动
echo 【sc config 服务名 start= disabled //禁用
echo 【sc start 服务名
echo 【sc stop 服务名











exit

