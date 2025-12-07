@echo off
setlocal enabledelayedexpansion

:: ====== 配置扩展 ID ======
set "ExtensionID=pfnededegaaopdmhkdmcofjmoldfiped"

:: ====== Chrome 版本 ======
set "ChromeVersion=125.0.0.0"

:: ====== 输出文件名 ======
set "OutputFile=%ExtensionID%.crx"

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
