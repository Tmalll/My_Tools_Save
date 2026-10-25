echo 删除连接目录
rmdir /s /q "C:\Aria2c_2024"
pathping -p 1000 -q 1 localhost >nul

echo 创建工作目录的连接
mklink /j "C:\Aria2c_2024" "%~dp0\Aria2c"
pathping -p 1000 -q 1 localhost >nul


pause
exit
