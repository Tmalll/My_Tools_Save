## 使用 coreutils.exe 作为编码和解码工具的 Base64 转换脚本.
## 编码限制 (最大测试5G编码成功)
## 解码限制 (最大测试5G编码成功)
## 参考文档:  
        https://uutils.github.io/coreutils/docs/index.html
        https://uutils.github.io/coreutils/docs/utils/basenc.html
        https://uutils.github.io/coreutils/docs/utils/base64.html
## 安装方法:
        https://uutils.github.io/coreutils/docs/installation.html#winget   (Win11 23H2 测试安装成功)
        https://github.com/uutils/coreutils/releases/latest


### 使用方法: 把要转码的文件拖放到.bat文件上面, 路径中不能有特殊符号.

# 特色功能: ( 以最新版为准 )
    1. 编码时可以分割文件, 生成分割大小 = 设定值 * 1.33 的 base64编码文件
    2. 解码时可以(并行解码+动态补位), 并行数量可调, 适应HDD or SSD环境.
    3. 解码完成后自动合并成原始的二进制文件.

更新日志:
    # v1 | 原始版本 (单线程编码和解码)
    # v2 | 测试版本 单编码, 通过DD管道方案分割编码后的文件.bat
    # v3 | 测试版本 单编码, 使用split后台分割, base64 前台循环检测(脚本检测文件大小前后对比)并行编码, 同步进行. PS: 经过测试比DD方案慢, 因为编码时要占用两次IO.
    # v4 | 测试版本 单编码, 使用split后台分割, base64 前台循环检测(对比设置分块大小值)并行编码, 同步进行. PS: 经过测试比DD方案慢, 因为编码时要占用两次IO.
    # v5 | 整合了v1和v2, 内设变量SplitBlock, SplitBlock=0关闭分块模式,  使用v1版本进行编码和解码. SplitBlock=1+任意数=开启分块模式, 并将设置值作为分块大小.
    # v6 | 在v5的基础上对解码进行了增强. 整合了之前写的(并行解码动态补位)的脚本. 解码结束自动合并.

    
    
    
    
    
    
    
    
    