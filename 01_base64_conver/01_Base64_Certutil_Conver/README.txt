使用 windows 自带的 Certutil.exe 工具作为 base64 [ 编码 ] 和 [ 解码 ] 工具

编码限制 小于70MB的文件 

解码限制 小于 2.66GB 的 Base64 文件(也就是编码前小于2GB的二进制文件)


使用方法: 把要转码的文件拖放到.bat文件上面, 路径中不能有特殊符号.

备注:
    
Certutil 编码的base64文件会有头尾,  如果需要别的解码工具解码, 有些工具则需要手动去除首尾行.

如果自己编码+自己解码则无需这么操作.

转码后文件示例: 
    
-----BEGIN CERTIFICATE----- < 如果要兼容其他转码工具这行要去除

5Y+q6YCC5ZCI6L2s5o2i5bCP5paH5Lu2LCAg5aSn5paH5Lu25Lya5YWo6YOo6L29
5YWl5YaF5a2YLCAg5a+86Ie05YaF5a2Y54iG5o6JLg0K5oiR5rWL6K+V55qE5pyA
5aSn5Y+q6IO96L2s5o2iMy45R+eahOaWh+S7tiwgIDRH55qE5paH5Lu25Lya5Ye6
6ZSZLg==

-----END CERTIFICATE----- < 如果要兼容其他转码工具这行要去除


