### 腾讯 cloud studio + comfyui + ngrok 每月10000minute 云计算GPU AI绘画 配置教程

使用步骤如下
</br><span style="color:yellow">红色</span></br>

	# 终端1
	# 激活虚拟环境
	conda activate comfyui_env
	
	# 进入comfyui目录
	cd  /workspace/ComfyUI
 
	# 启动comfyui
	python main.py 
	
	# 终端2 
	# 内网穿透：
	Ngrok http  8188
	
下载模型的时候切换到目标目录下

	aria2c -x 16 -s 16 -k 1M -o  v1-5-pruned-emaonly-fp16.safetensors  https://hf-mirror.com/Comfy-Org/stable-diffusion-v1-5-archive/resolve/main/v1-5-pruned-emaonly-fp16.safetensors
	
把文件名和文件链接改成需要的内容


安装步骤如下

一、准备工作
1. 注册腾讯云Cloud Studio服务器

打开腾讯云官网，扫码登录，完成注册，认证。

	https://cloud.tencent.com/
	
2. 直接打开以下网址进行云服务器界面

	https://ide.cloud.tencent.com/dashboard/gpu-workspace
	
模板创建-AI模板-llama8b-instruct

注意：这里显示大概需要等待2~5分钟，请耐心等待

在“高性能工作空间“列表就可以看到这个服务器，状态是 ”运行中“，表示创建成功，已经开机、

创建成功后，默认自动开机，双击就可以链接进你的服务器了

最后不用了记得点击最右边关机，这样不会占用你的使用时间

二、环境安装

 这里不需要安装python、conda等环境，初始化创建的时候默认就已经安装配置好了，只需要安装我们需要用到的软件环境即可（这点很人性化）
 
 显卡配置查看
 
	nvcc -V
	nvidia-smi
	
python虚拟环境

	# 创建虚拟环境
	conda create --name  comfyui_env
 
	# 激活虚拟环境
	conda activate comfyui_env
	
ComfyUI安装

	# 克隆安装地址（这里不用考虑网络问题）
	git clone https://github.com/aigem/aitools.git
 
	# 进入目录
	cd aitools
 
	#运行安装脚本
	bash aitools.sh
	
界面如下图所示，输入“1”后敲击回车等待即可

出现 To see the GUI go to: http://127.0.0.1:8188 表示ComfyUI启动成功。  

ngrok实现内网穿透

	问题：为什么要使用ngrok？

	答案：我们的comfyui是部署到云端服务器的，我们没有办法直接通过个人计算机访问到云服务器的web界面，所以需要将本地服务暴露到公网
	
登录ngrok官网

	https://dashboard.ngrok.com/signup
	
注册账号
然后勾选linux

复制下面两个框框中的代码，上面安装的不需要（因为在安装comfyui的时候就已经给我安装好了ngrok这个软件）

回到我们服务器终端中输入上面复制的指令，会出现以下界面说明配置成功

只要能通过转换的链接打开comfyUI网站，表明内网穿透成功。

	#终端1 内网穿透：
	Ngrok http  8188

三、运行Comfyui

	#终端2
	# 进入comfyui目录
	cd  /workspace/ComfyUI
 
	# 启动comfyui
	python main.py 
	
现在我们就可以愉快的用免费的GPU去训练我们的模型了

下载模型的时候切换到目标目录下

	aria2c -x 16 -s 16 -k 1M -o  v1-5-pruned-emaonly-fp16.safetensors  https://hf-mirror.com/Comfy-Org/stable-diffusion-v1-5-archive/resolve/main/v1-5-pruned-emaonly-fp16.safetensors
	
把文件名和文件链接改成需要的内容

