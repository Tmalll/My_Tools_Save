windows系统直接去官网安装ollama框架
打开powershell命令行

ollama run qwen

ollama run llama3.1

接下来执行一条命令：ollama pull deepseek-r1:1.5b，就能直接下载它到自己的电脑，如下所示，

等等ollama支持的大模型，几个G，
可以看到，系统正在下载qwen的模型（并保存在C盘，C:\Users<username>.ollama\models 如果想更改默认路径，可以通过设置OLLAMA_MODELS进行修改，然后重启终端，重启ollama服务。）

setx OLLAMA_MODELS "D:\ollama_model"

先在浏览器输入：http://127.0.0.1:11434

确保ollama在运行中。

再浏览器输入：http://127.0.0.1:11432
终端运行ollama ls

可以看到目前你下载的所有模型

第三步，DeepSeek-r1:1.5b接入到PyCharm。首先下载插件：CodeGPT，打开第一步安装的PyCharm，找到文件(File)-设置(Settings)-插件(Plugins)，输入CodeGPT，即可点击安装(Install)即可

去docker，打开lobe chat ai， 设置deepseek，开始聊天
