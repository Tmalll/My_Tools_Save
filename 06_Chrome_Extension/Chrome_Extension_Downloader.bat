@echo off
setlocal enabledelayedexpansion

:: ====== 配置扩展 ID ======
:: set "ExtensionName=ZeroOmega"
:: set "ExtensionID=pfnededegaaopdmhkdmcofjmoldfiped"

:: 提示用户输入扩展名
set /p ExtensionName=请输入扩展名: 
echo.

:: 提示用户输入扩展ID
echo 请输入扩展ID
echo 浏览器中32位ID, 例如: pfnededegaaopdmhkdmcofjmoldfiped
set /p ExtensionID=扩展ID: 
echo.

echo 您输入的扩展名是: %ExtensionName%
echo 您输入的扩展ID是: %ExtensionID%
echo.


:: ====== Chrome 版本 ======
set "ChromeVersion=125.0.0.0"

:: ====== 输出文件名 ======
set "OutputFile=[%ExtensionName%] Chrome %ExtensionID%.crx"

:: ====== SOCKS5 代理 ======
set "Proxy=socks5h://192.168.1.40:10800"

echo.
echo 下载 Chrome 扩展：%ExtensionID%
echo.

:: ====== 正确构造 URL（注意引号避免被 bat 解析）======
set "CRX_URL=https://clients2.google.com/service/update2/crx?response=redirect&prodversion=%ChromeVersion%&acceptformat=crx2,crx3&x=id%%3D%ExtensionID%%%26uc"


:: ====== 开始下载 ======
curl -L -o "%OutputFile%" "%CRX_URL%" -x "%Proxy%"

echo.
if exist "%OutputFile%" (
    echo 下载完成 → %OutputFile% && echo.
) else (
    echo 下载失败！&& echo.
)

pause
