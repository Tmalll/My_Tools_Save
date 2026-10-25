## **快速使用步骤**：
**进入pymath文件夹**
**打开powershell命令行，输入**：
pymathenv/Scripts/activate

**使用pip list查看当前虚拟环境的包列表**
pip list
**安装 requirements 的库**用 -r：
pip install -r requirements.txt
从虚拟环境生成requirement.txt文件，这样生成的requirement.txt文件只包含虚拟环境中已安装的依赖包。
**生成命令**：pip freeze > requirement.txt

**退出虚拟环境**的命令是：deactivate

执行项目中的脚本就可以用虚拟环境来执行，如：
.\pymathenv\Scripts\pip.exe webui.py
如果不想通过命令执行，也可以编写bat脚本：
@echo off
chcp 65001
call .\pymathenv\Scripts\python.exe webui.py
@echo 启动完毕，请按任意键关闭
call pause

**从激活的虚拟环境控制台运行脚本**
python scripts.py
**从激活的虚拟环境控制台打开jupyter notebook**
jupyter notebook

## **完整流程**
### **创建环境**：
将在pymath文件夹中创建一个新的虚拟环境：

cd pymath

python -m venv pymathenv

使用cd命令进入子文件夹:

cd pymathenv/Scripts  #对于 Windows

cd pymathenv/bin      #对于 Unix 或 Macos

在Scripts（或bin）文件夹中，应该看到一个名为“activate”的文件。只需在命令提示符下键入activate即可激活虚拟环境。要确认虚拟环境已激活，在命令提示窗口中，我们应该看到（tut_venv）出现在当前输入行的前面。

pymathenv/Scripts/activate

### **pip相关用法**
使用pip list查看当前虚拟环境的包列表

pip list

pip卸载
pip uninstall matplotlib

指定版本用==：

pip install matplotlib==3.8.0
安装 requirements 的库用 -r：

pip install -r requirements.txt
升级库到最新版本用 -U：

pip install -U matplotlib
指定镜像源用 -i：

pip install matplotlib -i http://pypi.douban.com/simple -- trusted-host pypi.douban.com
更换全局的镜像源：

用户主目录下新建一个 pip 目录，里面新建一个 pip.conf （Windows中为 pip.ini）：

[global]
index-url = https://pypi.tuna.tsinghua.edu.cn/simple
[install]
trusted-host=mirrors.aliyun.com
上面的是我自己的，你可以选择其他的镜像源。

用自行下载的whl文件安装，以xrld-1.2.0为例：

pip install xlrd-1.2.0-py2.py3-none-any.whl

源码安装的库卸载
可以重新源码安装，此时需要记录安装文件细节，可通过 --record XX 来记录，如：

python setup.py install --record setup.log
这时所有的安装细节都写到log里了。想要卸载的时候

cat setup.log ｜ xagrs rm -rf
就可以卸载了

pip的show命令来查看依赖的具体位置

.\pymathenv\Scripts\pip.exe show numpy

升级虚拟环境的pip软件：

.\pymathenv\Scripts\python.exe -m pip install --upgrade pip

从虚拟环境生成requirement.txt文件，这样生成的requirement.txt文件只包含虚拟环境中已安装的依赖包。

生成命令：pip freeze > requirement.txt

依赖文件安装到虚拟环境目录

pip.exe install -r .\requirements.txt

**退出虚拟环境的命令是**：deactivate
### **测试这个虚拟环境**

执行项目中的脚本就可以用虚拟环境来执行，如：

.\pymathenv\Scripts\pip.exe webui.py
如果不想通过命令执行，也可以编写bat脚本：

@echo off  
chcp 65001  
  
call .\pymathenv\Scripts\python.exe webui.py  
  
@echo 启动完毕，请按任意键关闭  
call pause

在这个虚拟环境中安装pandas并测试它是否工作。将以下行保存到Python文件中：

import pandas as pd

print(pd.__version__)

注意：如果我们试图在IDLE中运行此代码，它可能无法工作，因为当前IDLE不在我们刚刚安装pandas的虚拟环境中。根据你的机器，当前的“环境”可能没有pandas。要使用正确的venv运行代码，我们需要从激活venv的控制台执行代码。为此，只需键入：

python3 venv_eg.py

这一次，代码将在正确的虚拟环境中运行。现在，如果我们需要安装另一个版本的pandas，只需要创建一个新的虚拟环境并在那里安装它。

### **安装Jupyter Notebook**

如果计算机上已经安装了Python，就可以**使用pip安装**Jupyter Notebook：

pip install jupyter

安装完成后，在控制台中键入jupyter notebook将其打开。将看到它在控制台中执行，并自动打开计算机的浏览器。注意，不要关闭控制台！控制台是后端引擎，浏览器只是一个界面。如果关闭控制台，Jupyter Notebook将关闭。

为Jupyter Notebook创建虚拟环境

为Jupyter Notebook使用虚拟环境与电脑上使用虚拟环境略有不同。在Jupyter Notebook中，有一个叫做IPython内核的东西，它本质上是在后端执行Python代码的计算引擎。一旦我们创建了一个虚拟环境，就可以将它与内核链接起来，这样就不必每次需要时都手动激活venv。

切换到要添加的虚拟环境，**确认是否安装 ipykernel**

python -m ipykernel --version

为了向内核注册venv，**需要pip安装另一个Python模块ipykernel**：

pip install ipykernel

**安装完成后，在控制台中键入以下内容**：

python -m ipykernel install --user --name=pymathenv

我们将看到类似以下消息：

Installed kernelspec tut_venv inC:\ProgramData\jupyter\kernels\tut_venv

**查看 Jupyter notebook kernel**

jupyter kernelspec list

**删除  jupyter 内核**

jupyter kernelspec remove kernelname


**为了测试是否成功地向ipython内核注册了venv，需要**：

1.关闭Jupyter Notebook

2.停用当前的venv

3.重新打开Jupyter Notebook

4.检查“Open”，应该看到我们刚刚创建的venv名称“tut-venv”。使用此内核打开一个新文件

5.执行代码进行检查

 
**从Jupyter Notebook中删除虚拟环境**

要删除venv，在命令提示符下键入jupyter kernelspec list以确认venv名称，将看到类似如下内容：

C:\Users\XXX\venv_jupyter_notebook>jupyterkernelspec list

Available kernels:

 python3     C:\Users\XXX\AppData\Roaming\Python\Python39\site-packages\ipykernel\resources

  tut_venv    C:\ProgramData\jupyter\kernels\tut_venv

 
**删除为本文创建的“tut_venv”**。要删除，键入jupyter kernelspec uninstall tut_venv，将看到类似以下确认信息：

C:\Users\XXX\venv_jupyter_notebook>jupyterkernelspec uninstall tut_venv

Kernel specs to remove:

  tut_venv             C:\ProgramData\jupyter\kernels\tut_venv

Remove 1 kernel specs [y/N]: y

[RemoveKernelSpec] RemovedC:\ProgramData\jupyter\kernels\tut_venv
