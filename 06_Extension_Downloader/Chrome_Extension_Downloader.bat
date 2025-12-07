@echo off

echo 请输入扩展名称(随便写, 仅描述) && echo.
set /p ExtensionName=扩展名: 
echo.

echo 请输入扩展ID
echo 浏览器中的32位ID, 例如: pfnededegaaopdmhkdmcofjmoldfiped
echo 不能包含空格和其他特殊符号, 输错就无法下载了... && echo.
set /p ExtensionID=扩展ID: 
echo.

echo 您输入的扩展名是: %ExtensionName%
echo 您输入的扩展ID是: %ExtensionID%
echo.


:: ====== Chrome 版本 ======
set "ChromeVersion=143.0.0.0"

:: ====== 输出文件名 ======
set "OutputFile=[%ExtensionName%] Chrome %ExtensionID%.crx"

:: ====== 网页反代 ======
set "webProxy=https://cfproxy.miaosky.top/proxy/"
set "bestIP=2606:4700::fb27:dda9:fa5a"


echo.
echo 下载 Chrome 扩展：%ExtensionID%
echo.

:: ====== 正确构造 URL（注意引号避免被 bat 解析）======
set "CRX_URL=https://clients2.google.com/service/update2/crx?response=redirect&prodversion=%ChromeVersion%&acceptformat=crx2,crx3&x=id%%3D%ExtensionID%%%26uc"


:: ====== 开始下载 ======
curl -L -o "%OutputFile%" "%webProxy%%CRX_URL%" --resolve cfproxy.miaosky.top:443:%bestIP% -vv -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%ChromeVersion% Safari/537.36"

echo.
if exist "%OutputFile%" (
    echo 下载完成 → %OutputFile% && echo.
) else (
    echo 下载失败！&& echo.
)

pause
exit

-A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
-A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

:: ====== SOCKS5 代理 ======
set "Proxy=socks5h://192.168.1.40:10800"

-x "%Proxy%"





