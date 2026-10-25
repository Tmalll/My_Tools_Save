@echo off
:start
set /p var=输入(Y)使用代理下载, 输入(N)或者按enter使用直连下载: 
if /i "%var%"=="" goto direct
if /i %var%==n goto direct
if /i %var%==y (goto proxy) else (goto direct)
goto start

:direct
echo 正在使用_直连下载
curl -L -O https://github.com/MetaCubeX/Razord-meta/archive/refs/heads/gh-pages.zip
goto next

:proxy
echo 正在使用_代理下载
curl -L -O https://ghproxy.com/https://github.com/MetaCubeX/Razord-meta/archive/refs/heads/gh-pages.zip
goto next


:next

echo 删除原来的
rmdir "%~dp0\data\webui" /s /q

echo 解压
powershell Expand-Archive -Path "./gh-pages.zip" -DestinationPath "./data"

echo 重命名
rename "%~dp0\data\Razord-meta-gh-pages" webui

echo 清理
powershell remove-item ./gh-pages.zip

echo 再次运行
"%~dp0\#02-运行(后台隐藏).bat"

pause
exit








