## Docker的镜像文件缩容 & 存储位置修改

### 1. 删除多余镜像和容器，并释放磁盘空间

但删除过后发现 WSL 挂载目录的虚拟磁盘大小没有变化。

#### 1.1 找到要压缩的虚拟磁盘文件

默认位置在

	C:\Users\ <你当前用户名> \AppData\Local\Docker\wsl\data\ext4.vhdx
	
w我的虚拟磁盘已经挪到D盘了

	"D:\wsl\docker-desktop\DockerDesktopWSL\disk\docker_data.vhdx"
	
#### 1.2 关闭 Docker Desktop

打开Powershell：

	 wsl --list -v
	 
#### 1.3 压缩虚拟磁盘文件

继续在PowerShell中执行

	# 关闭 WSL2 中的 linux distributions
	wsl --shutdown
	# 运行管理计算机的驱动器的 DiskPart 命令
	diskpart
	
会新打开一个叫 DiskPart 的命令窗口，如下图：
在新打开的 DiskPart 命令窗口中执行：

	# 选择虚拟磁盘文件
	select vdisk file="步骤1.1虚拟磁盘文件的路径"
	# 压缩文件
	compact vdisk
	# 压缩完毕后卸载磁盘
	detach vdisk
	
上述操作执行完毕，WSL2 删除文件后空出来的磁盘空间就被释放了，可以去虚拟磁盘文件的路径看到 ext4.vhdx 文件大小已经减小。最后打开 Docker Desktop 可以看到原来镜像还在，成功解决问题。

### 2. 修改镜像文件存储位置

#### 2.2 备份image及相关文件

将docker-desktop-data导出到备份文件中，使用如下命令

	wsl --export docker-desktop-data "D:\\docker-desktop-data.tar"
	
#### 2.3 wsl取消注册docker-desktop-data

	wsl --unregister docker-desktop-data
	
#### 2.4 将导出的docker-desktop-data再导入回wsl

该命令重新设置了路径，即新的镜像及各种docker使用的文件的挂载目录，我这里设置到F:\Docker-wsl\wsl

	wsl --import docker-desktop-data "F:\Docker-wsl\wsl" "D:\\docker-desktop-data.tar" --version 2
	
操作完成就能在该目录下看到文件了，这时次启动Docker Desktop，一切正常

可以pull一个镜像，查看目录大小变化。正常情况下C盘不会再增大了。
