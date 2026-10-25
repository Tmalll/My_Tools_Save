# 过程记录

0.0 前提和背景
   我的笔记本是windows11系统，没有独立显卡，更没有N卡。
   CPU是I5，内存40G，固态硬盘
   Docker 环境配置
本方案基于 Docker 配置，Docker 实质上是在运行的 Linux 系统中创建了一个隔离的文件环境。因此，Docker 必须部署在基于 Linux 内核的系统上。[1] 对于 Mac 用户，无需特别配置即可使用。而对于 Windows 用户，若想部署 Docker，则需要安装一个虚拟 Linux 环境，配置 WSL 或启用 Hyper-V 二选一。我推荐使用 Windows 子系统 WSL，它需要占用系统盘 30G 的空间。

0.1安装 WSL
在管理员 PowerShell 输入命令 wsl --install，之后终端会默认安装 Ubuntu。系统下载时间较长，注意别关机。[2] 安装 Ubuntu 完成后，按提示设置 Ubuntu 账户和密码。

0.2启用 Hyper-V
以管理员身份打开 PowerShell 控制台，输入命令 Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All。[3] 重启电脑后，将开启 Hyper-V。

0.3Linux 路径（Windows）
配置 WebUI Docker 要进入 Linux 环境，因此 Windows 用户需要将其路径转换为 Linux 路径。而 Mac 和 Linux 用户则可以忽略此步骤。

0.4安装 Docker Desktop
按平台选 Docker Desktop 版本，安装后点击左侧的 Add Extensions，推荐安装 Disk usage 扩展，这将便于管理 Docker 的存储空间。

1.下载并安装git以及anaconda，直接一路下一步安装完就行

git：https://git-scm.com/downloads
anaconda：https://www.anaconda.com/
2.选一个存放目录，最好要大于20G，新建一个文件夹用户存放本地文件
这里对文件夹名字等信息没有特殊要求，只需要新建一个文件夹即可

3.打开上一步中新建的文件夹，按住shift加鼠标右键，选择在此处打开 powershell 窗口 

4.输入以下命令并回车，从github拉取stable-diffusion-webui，克隆整合包仓库，（整合包依赖里面的配置文件，不能只下载docker-compose.yml）：

git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui 

*下面这个*
git clone https://github.com/AbdBarho/stable-diffusion-webui-docker.git

5.进入克隆后的文件夹
cd stable-diffusion-webui-docker

6.下载必需的模型和文件
需要确保网络正常，最好通过全局代理
在这期间，如果遇到任何问题，请优先怀疑你的网络
报错就切换网络，再次运行命令，下载完的会跳过的
#自动下载采样模型和依赖包
docker compose --profile download up --build
#上方命令需要 20 分钟或更长，
#自己下载的模型文件（stable-diffusion、waifu-diffusion等ckpt文件）复制到stable-diffusion-webui\models\Stable-diffusion目录下 

7.安装windows下使用cpu进行运算的pytorch版本
pip3 install torch torchvision torchaudio 
取决于网络情况，这里可能需要等待较长时间 

8.完成后执行镜像构建命令
运行 UI
虽然是运行ui，但脚本里依然有大量内容需要下载
需要确保网络正常，最好通过全局代理
第一次启动大约 15 分钟时间
docker compose --profile auto up --build
#auto 是功能最多的分支，可以选择 auto | auto-cpu | comfy | comfy-cpu
#docker compose --profile auto-cpu up --build
docker compose --profile comfy up --build
#docker compose --profile comfy-cpu up --build
#我需要选择的就是auto-cpu或者comfy-cpu的命令，实践证明comfy-cpu最顺利，是文字生图版本

9.打开界面
本地打开： http://localhost:7860/

#遇到的问题就是谷歌然后梭哈
webui-user.bat和webui-user.sh中加参数
COMMANDLINE_ARGS="--skip-torch-cuda-test --precision full --no-half"

有个python包版本太高还降低了版本
'''
I inserted it in this line of the Dockerfile and it is working in my environment.
https://github.com/AbdBarho/stable-diffusion-webui-docker/blob/master/services/AUTOMATIC1111/Dockerfile#L41
Inserted are the following
RUN --mount=type=cache,target=/root/.cache/pip \
'''这句不知道位置在哪里，我没去找，直接在powershell里复制下面的安装卸载
pip uninstall -y typing_extensions
pip install typing_extensions==4.11.0
不知道有没有用，反正操作了，最后的结果是好的，
折腾了好几天，这个流程是出的问题最少，最好解决的。。。
不出意外，一张图很慢，出图怎么样跟大模型有关，要整理一下自己需要什么风格，挂载哪款大模型







