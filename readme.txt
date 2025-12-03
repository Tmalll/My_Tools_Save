# 性能参考

coreutils DD 管道 base64 | 24.8s 24.3s
后台split+base64前台循环检测版 | 27.8s 28.9s

Base64_Certutil+Pw5.1_v4.4_Final.bat
powershell编码: 37.3s 28.7s

Base64_PurePwBat_v5_final.bat
powershell编码: 27.3s

base64_Conver_v1_Single.bat
编码: 64s 单文件, 不分块

coreutils_Conver.bat
编码: 18s 单文件, 不分块

openssl 套PW计算时间
powershell 20.79s | CMD 20.1s | CMD 21.4s






















