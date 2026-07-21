
import os

# 相对路径就是“ ../aa.py ”代表一级上层目录，“ ../../aa.py ”代表两级上层目录，具有代码可移植性
#绝对路径就是跟目录到文件的路径，例如：C:/aa/bb/cc/dd.py ；具有不可移植性

'''
os.curdir 返回当前目录: ('.')
os.curdir: 当前目录的字符串表示（通常是.）。
os.pardir: 父目录的字符串表示（通常是..）。
os.path.split(path): 将路径分割成目录和文件名。
os.path.splitext(path): 将路径分割成根和扩展名。
os.walk(top, topdown=True, onerror=None, followlinks=False): 生成目录树下的所有文件和目录。
os.getpid(): 获取当前进程ID。
os.getppid(): 获取父进程ID。
os.urandom(n): 返回n个字节长度的随机字符串，适用于加密用途。
os.cpu_count(): 获取CPU核心数。
os.getloadavg(): 获取系统负载平均值。
os.stat()    #获取文件或者目录信息
info = os.stat('file.txt')
print(info.st_size)  # 文件大小
print(info.st_mtime) # 最后修改时间
os.mkdir(path): 创建一个目录。
os.makedirs(path): 递归创建目录。
os.rmdir(path): 删除一个空目录。
os.remove(path): 删除一个文件。
os.rename(src, dst): 重命名文件或目录。
os.system(command): 执行系统命令并返回退出状态。
os.sep 显示当前平台下路径分隔符
os.linesep 输出当前平台使用的行终止符，win下为"\t\n",Linux下为"\n"
os.pardir 获取当前目录的父目录字符串名：('..')
os.chdir("dirname") os.chdir() 方法用于改变当前工作目录到指定的路径。相当于shell下cd
os.path.splitext(path) 分离文件名与扩展名；默认返回(fname,fextension)元组，可做分片操作 ，以“.”为分隔符
os.path.isdir(path) 如果path是一个存在的目录，则返回True。否则返回False
startswith()函数   此函数判断一个文本是否以某个或几个字符开始，结果以True或者False返回。
endswith()函数  此函数判断一个文本是否以某个或几个字符结束，结果以True或者False返回。
'''

print(os.name)
print(os.getcwd())
print(os.curdir)

# 获取所有环境变量
print(os.environ)
# 获取特定环境变量
print(os.getenv('PATH'))


#自动处理路径分隔符
path=os.path.join('my_folder','sub_folder','file.txt')
print(path)#输出：my_folder/sub_folder/file.txt（在Windows上）

#获取文件名
file_name=os.path.basename(path)
print(file_name)#输出：file.txt

#获取目录路径
dir_path=os.path.dirname(path)
print(dir_path)#输出：my_folder/sub_folder

import os

path1 = os.path.dirname(__file__)
print('The path1 is:', path1)

path2 = os.path.abspath(path1)
print('The path2 is:', path2)

path3 = os.path.join(path2, 'pychains.py')
print('The path3 is:', path3)

#检查文件是否存在
file_exists=os.path.isfile('path/to/your/file.txt')
print(file_exists)#如果文件存在，输出：True

#检查目录是否存在
dir_exists=os.path.isdir('path/to/your/directory')
print(dir_exists)#如果目录存在，输出：True


path_to_check="/home/user/documents/my_file.txt"

if os.path.exists(path_to_check):
    print(f"{path_to_check}存在")
else:
    print(f"{path_to_check}不存在")



#路径规范化
normalized_path=os.path.normpath('/a//b/./c/../d/')
print(normalized_path)#输出：/a/b/d

#获取绝对路径
absolute_path=os.path.abspath('relative/path/to/file.txt')
print(absolute_path)#输出：绝对路径

#获取相对路径
relative_path=os.path.relpath('absolute/path/to/file.txt','absolute/path')
print(relative_path)#输出：to/file.txt

relative_path="my_folder/my_file.txt"
absolute_path=os.path.abspath(relative_path)

print("绝对路径:",absolute_path)

#拼接路径
directory="my_folder"
filename="my_file.txt"
full_path=os.path.join(directory,filename)

print(full_path)#输出:my_folder/my_file.txt(在Windows上会输出my_folder\my_file.txt)


path="/home/user/documents/my_file.txt"

#获取文件名
file_name=os.path.basename(path)
print(file_name)#输出:my_file.txt

print(os.path.split(__file__))

file_path="example.txt"

#分离文件名和扩展名
name,ext=os.path.splitext(file_path)
print("文件名:",name)#输出:example
print("扩展名:",ext)#输出:.txt

#获取目录名
directory_name=os.path.dirname(path)
print(directory_name)#输出:/home/user/documents

for root,dirs,files in os.walk('my_directory'):
    for file in files:
        if file.endswith('.txt'):
            print(os.path.join(root,file))


directory=os.path.abspath(os.path.dirname(__file__))

#列出目录中的所有文件和目录
for item in os.listdir(directory):
    item_path=os.path.join(directory,item)
    if os.path.isdir(item_path):
        print(f"{item}是一个目录")
    else:
        print(f"{item}是一个文件")

import os

directory=os.path.abspath(os.path.dirname(__file__))
file_count=0

#遍历目录中的所有文件
for item in os.listdir(directory):
    item_path=os.path.join(directory,item)
    if os.path.isfile(item_path) and item.endswith('.txt'):
        with open(item_path,'r') as file:
            lines=file.readlines()
            line_count=len(lines)
            print(f"{item}的行数是:{line_count}")
            file_count+=1

print(f"总共处理了{file_count}个文件")

import shutil

#文件复制
# shutil.copy2(os.path.join('source_dir','file.txt'),os.path.join('dest_dir','file.txt'))

basedir = os.path.abspath(os.path.dirname(__file__))
static_file_path = os.path.join(basedir, 'index.html')
