@echo off

echo 原理是先跟本机SSH服务器建立连接,  再创建转发,  需要本机拥有SSHd服务
ssh -L 0.0.0.0:11666:192.168.1.120:10800 administrator@192.168.1.100 -p 22 -i .\key\SCPkey_WinMaster -N















pause
exit








-N参数，表示不在 SSH 跳板机执行远程命令，让 SSH 只充当隧道。
-f参数表示 SSH 连接在后台运行。

ssh -fN -D 0.0.0.0:1080     root@oalihk.miaosky.party -p 60022 -i .\key\id_MiaoSKY_ed25519
