
# CF Snippets Universal Reverse Proxy  
# CF Snippets 万能反向代理

## 说明 
- 仿照: https://github.com/1234567Yang/cf-proxy-ex 项目写的万能反向代理.  
- PS: 目前只支持github 用来下载 Releases 和代码, 其他的没有测试.
- 我不是很会写这个, 全程靠 Google Gemini 写的...

### 更新日志(里程碑)
#### #1版本
> BUG 连接跳转错误, 只支持静态页面.
#### #2版本
> 可以点静态连接了, 跳转正确, 但是有bug, Releases 中的 Assets 无法正常显示. 

#### #11 版本
> 基本上github的功能都可正常使用了, Releases Assets 都正常了, issues也可以正常查看, 但是过滤器不可用. 有个 dashboard 页面一直404, 找不到原因.

#### #15 版本  
> - 引入了token 和 / 返回403  
> - 可以设置token (path)  
> - 路径错误和默认路径 / 都会返回403  
> - 希望这样能防扫...  


#### #18 版本
> 当使用正确token访问地址又没有设置target时, 增加了一些提示

#### #21 版本
> - 提示页面改成了HTML,  
> - 页面中增加了一个输入框, 可以输入网址然后按 Go! 按钮跳转目标网站  



