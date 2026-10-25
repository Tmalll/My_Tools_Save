@echo off

ssh -fN -D 0.0.0.0:1080     root@oalihk.miaosky.party -p 60022 -i .\key\id_MiaoSKY_ed25519

pause
exit
