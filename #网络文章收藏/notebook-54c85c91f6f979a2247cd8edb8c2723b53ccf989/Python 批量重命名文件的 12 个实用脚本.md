批量重命名文件是我们在日常工作中经常会遇到的需求。无论是整理照片、文档还是其他类型的文件，掌握如何高效地批量重命名文件都是非常有用的。今天我们就来学习一下如何使用 Python 编写 12 个实用的批量重命名文件的脚本。

1. 基本的批量重命名
首先，我们来看一个最基本的批量重命名脚本。这个脚本将目录中的所有文件重命名为一个固定的格式。

import os

# 指定目录路径
directory = 'path/to/your/directory'

# 获取目录中所有文件名
files = os.listdir(directory)

# 遍历文件并重命名
for i, filename in enumerate(files):
    # 构建新的文件名
    new_filename = f"file_{i}.txt"
    # 构建完整的旧文件路径和新文件路径
    old_file_path = os.path.join(directory, filename)
    new_file_path = os.path.join(directory, new_filename)
    # 重命名文件
    os.rename(old_file_path, new_file_path)

print("文件重命名完成！")

2. 添加前缀
有时候我们只需要给文件名添加一个前缀，比如“backup_”。

import os

directory = 'path/to/your/directory'
prefix = "backup_"

files = os.listdir(directory)

for filename in files:
    if os.path.isfile(os.path.join(directory, filename)):
        new_filename = prefix + filename
        old_file_path = os.path.join(directory, filename)
        new_file_path = os.path.join(directory, new_filename)
        os.rename(old_file_path, new_file_path)

print("文件重命名完成！")
3. 添加后缀
与添加前缀类似，我们也可以给文件名添加后缀，比如“_old”。

import os

directory = 'path/to/your/directory'
suffix = "_old"

files = os.listdir(directory)

for filename in files:
    if os.path.isfile(os.path.join(directory, filename)):
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}{suffix}{ext}"
        old_file_path = os.path.join(directory, filename)
        new_file_path = os.path.join(directory, new_filename)
        os.rename(old_file_path, new_file_path)

print("文件重命名完成！")

4. 替换特定字符
有时候我们需要替换文件名中的特定字符，比如将所有的空格替换成下划线。

import os

directory = 'path/to/your/directory'
replace_char = "_"
target_char = " "

files = os.listdir(directory)

for filename in files:
    if os.path.isfile(os.path.join(directory, filename)):
        new_filename = filename.replace(target_char, replace_char)
        old_file_path = os.path.join(directory, filename)
        new_file_path = os.path.join(directory, new_filename)
        os.rename(old_file_path, new_file_path)

print("文件重命名完成！")
5. 根据文件创建时间重命名
我们可以根据文件的创建时间来重命名文件，这样可以更好地组织文件。

import os
from datetime import datetime

directory = 'path/to/your/directory'

files = os.listdir(directory)

for filename in files:
    if os.path.isfile(os.path.join(directory, filename)):
        file_path = os.path.join(directory, filename)
        creation_time = os.path.getctime(file_path)
        formatted_time = datetime.fromtimestamp(creation_time).strftime('%Y%m%d_%H%M%S')
        name, ext = os.path.splitext(filename)
        new_filename = f"{formatted_time}{ext}"
        new_file_path = os.path.join(directory, new_filename)
        os.rename(file_path, new_file_path)

print("文件重命名完成！")

6. 根据文件修改时间重命名
与根据创建时间重命名类似，我们也可以根据文件的最后修改时间来重命名文件。

import os
from datetime import datetime

directory = 'path/to/your/directory'

files = os.listdir(directory)

for filename in files:
    if os.path.isfile(os.path.join(directory, filename)):
        file_path = os.path.join(directory, filename)
        modification_time = os.path.getmtime(file_path)
        formatted_time = datetime.fromtimestamp(modification_time).strftime('%Y%m%d_%H%M%S')
        name, ext = os.path.splitext(filename)
        new_filename = f"{formatted_time}{ext}"
        new_file_path = os.path.join(directory, new_filename)
        os.rename(file_path, new_file_path)

print("文件重命名完成！")
7. 根据文件大小重命名
有时候我们需要根据文件的大小来重命名文件，这可以帮助我们快速识别大文件或小文件。

import os

directory = 'path/to/your/directory'

files = os.listdir(directory)

for filename in files:
    if os.path.isfile(os.path.join(directory, filename)):
        file_path = os.path.join(directory, filename)
        file_size = os.path.getsize(file_path)
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}_{file_size}bytes{ext}"
        new_file_path = os.path.join(directory, new_filename)
        os.rename(file_path, new_file_path)

print("文件重命名完成！")
8. 根据文件扩展名重命名
我们可以根据文件的扩展名来重命名文件，这样可以更好地分类不同类型的文件。

import os

directory = 'path/to/your/directory'

files = os.listdir(directory)

for filename in files:
    if os.path.isfile(os.path.join(directory, filename)):
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}_{ext[1:]}{ext}"
        old_file_path = os.path.join(directory, filename)
        new_file_path = os.path.join(directory, new_filename)
        os.rename(old_file_path, new_file_path)

print("文件重命名完成！")

9. 删除特定字符
有时候我们需要删除文件名中的特定字符，比如删除所有的下划线。

import os

directory = 'path/to/your/directory'
remove_char = "_"

files = os.listdir(directory)

for filename in files:
    if os.path.isfile(os.path.join(directory, filename)):
        new_filename = filename.replace(remove_char, "")
        old_file_path = os.path.join(directory, filename)
        new_file_path = os.path.join(directory, new_filename)
        os.rename(old_file_path, new_file_path)

print("文件重命名完成！")
10. 根据文件内容重命名
如果我们有文本文件，可以根据文件内容的一部分来重命名文件。

import os

directory = 'path/to/your/directory'

files = os.listdir(directory)

for filename in files:
    if os.path.isfile(os.path.join(directory, filename)) and filename.endswith('.txt'):
        file_path = os.path.join(directory, filename)
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
            first_line = content.split('\n')[0]
            new_filename = f"{first_line[:10]}.txt"
            new_file_path = os.path.join(directory, new_filename)
            os.rename(file_path, new_file_path)

print("文件重命名完成！")

11. 根据文件名中的特定模式重命名
有时候文件名中包含特定的模式，我们可以根据这些模式来重命名文件。

import os
import re

directory = 'path/to/your/directory'
pattern = r'(\d{4})-(\d{2})-(\d{2})'

files = os.listdir(directory)

for filename in files:
    if os.path.isfile(os.path.join(directory, filename)):
        match = re.search(pattern, filename)
        if match:
            date_str = match.group(0)
            new_filename = f"date_{date_str}{os.path.splitext(filename)[1]}"
            old_file_path = os.path.join(directory, filename)
            new_file_path = os.path.join(directory, new_filename)
            os.rename(old_file_path, new_file_path)

print("文件重命名完成！")
12. 递归重命名子目录中的文件
如果我们有一个包含多个子目录的目录结构，可以使用递归来重命名所有子目录中的文件。

import os

def rename_files_recursively(directory):
    for root, dirs, files in os.walk(directory):
        for filename in files:
            file_path = os.path.join(root, filename)
            new_filename = f"renamed_{filename}"
            new_file_path = os.path.join(root, new_filename)
            os.rename(file_path, new_file_path)

directory = 'path/to/your/directory'
rename_files_recursively(directory)

print("文件重命名完成！")

实战案例：批量重命名照片文件
假设你有一个包含大量照片的文件夹，文件名是相机自动生成的，比如“IMG_20230101_120000.jpg”。你希望将这些照片按照拍摄日期和时间重命名，格式为“20230101_120000.jpg”。

import os
from datetime import datetime
from PIL import Image

def get_creation_date(image_path):
    image = Image.open(image_path)
    exif_data = image._getexif()
    if exif_data and 36867 in exif_data:
        date_str = exif_data[36867]
        return datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
    return None

directory = 'path/to/your/photos'

files = os.listdir(directory)

for filename in files:
    if os.path.isfile(os.path.join(directory, filename)) and filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        file_path = os.path.join(directory, filename)
        creation_date = get_creation_date(file_path)
        if creation_date:
            formatted_date = creation_date.strftime('%Y%m%d_%H%M%S')
            new_filename = f"{formatted_date}.jpg"
            new_file_path = os.path.join(directory, new_filename)
            os.rename(file_path, new_file_path)

print("照片重命名完成！")

总结
在这篇文章中，我们学习了如何使用 Python 编写 12 个实用的批量重命名文件的脚本。
从基本的重命名到根据文件属性（如创建时间、修改时间、大小、扩展名等）重命名，
再到根据文件内容和特定模式重命名，以及递归重命名子目录中的文件。
最后，我们还提供了一个实战案例，展示了如何批量重命名照片文件。
通过这些脚本，你可以更加高效地管理和组织文件。
