 简介： 镜像：Docker 镜像是用于创建 Docker 容器的模板容器：容器是独立运行的一个或一组应用仓库：用来保存镜像，可以理解为代码控制中的代码仓库 一个仓库中包含多个镜像，以镜像为模板可创建出多个容器，每个容器是独立运行的一个或者一组应用。

镜像：Docker 镜像是用于创建 Docker 容器的模板
容器：容器是独立运行的一个或一组应用
仓库：用来保存镜像，可以理解为代码控制中的代码仓库

一个仓库中包含多个镜像，以镜像为模板可创建出多个容器，每个容器是独立运行的一个或者一组应用。 容器是镜像的实例，镜像是容器的模板 。

简略：

容器生命周期：run、start/stop/restart、kill、rm、pause/unpause、create、exec

容器操作：ps、inspect、top、attach、events、logs、wait、export、port

容器rootfs：commit、cp、diff

镜像仓库：login/logout、pull、push、search

本地镜像管理：images、rmi、tag、build、history、save、import

info|version：info、version       【docker info/vaersion分别查看系统信息和版本信息】

一：容器
增：

docker create [OPTIONS] IMAGE [COMMAND] [ARG...]  #创建一个新的容器但不启动它

docker run [OPTIONS] IMAGE [COMMAND] [ARG...]  #创建一个新的容器并运行一个命令
 

进：

docker exec -ti <container name/id> #不会像attach方式因为退出，导致整个容器退出。          
docker attach  <container name/id> #进入虚拟机，如果从这个stdin中exit，会导致容器的停止。
开启/停止/重启

docker container  start/stop/restart   <hash> 
删：

docker container rm <hash> # 从此机器中移除指定的容器【删除容器时，容器必须是停止状态，否则会报如下错误】
docker container rm $(docker container ls -a -q) # 删除所有容器
docker container kill <hash> # 强制关闭指定的容器
查：

docker container ls # 列出所有运行的容器
docker container ls -a # 列出所有的容器

docker ps # 查看我们正在运行的容器
docker ps -l # 查询最后一次创建的容器

docker logs <container id> # 查看容器内的标准输出
docker logs <container name> # 查看容器内的标准输出


docker port <container name/id> <port> # 查看容器端口的映射情况

docker inspect <container id/name> #查看Docker的底层信息,它会返回一个 JSON 文件记录着 Docker 容器的配置和状态信息
二：镜像
增：

docker build -t friendlyname . # 使用此目录的“Dockerfile”创建镜像
docker push 192.168.1.52:5000/zabbix #提交镜像到本地私有
docker pull ubuntu:13.10 # 下载ubuntu:13.10镜像
删：

docker image rm <image id> # 从机器中移除指定镜像
docker image rm $(docker image ls -a -q) # 从机器上移除所有镜像
查：

docker image ls -a # 列出机器上所有镜像
docker search httpd # 通过 docker search 命令搜索 httpd 来寻找适合我们的镜像
运:

docker run httpd # 使用镜像仓库
#镜像标签
docker tag <image> username/repository:tag # 标签<image>上传到仓库【repository为镜像源名】
docker push username/repository:tag # 上传标记的图像到注册表
docker run username/repository:tag # 从注册表运行映像

三：其他
docker login # 使用您的Docker凭据登录此CLI会话
docker run -d -p 127.0.0.1:4000:80/udp friendlyname # 后台运行"friendlyname" 镜像并将4000 端口映射到80端口
# -P:将容器内部使用的网络端口映射到我们使用的主机上
# -d:让容器在后台运行
# 默认都是绑定 tcp 端口，如果要绑定 UDP 端口，可以在端口后面加上 /udp
docker run ubuntu:15.10 /bin/echo "Hello world" #Docker 以 ubuntu15.10 镜像创建一个新容器，然后在容器里执行 bin/echo "Hello world"，然后输出结果。
docker run -d -P --name runoob training/webapp python app.py #对容器镜像重新命名
