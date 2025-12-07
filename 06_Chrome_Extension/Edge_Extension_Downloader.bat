@echo off
:: set "ExtensionID=dmaldhchmoafliphkijbfhaomcgglmgd"
:: set "ExtensionName=ZeroOmega"

:: 提示用户输入扩展名
set /p ExtensionName=请输入扩展名: 
echo.

:: 提示用户输入扩展ID
echo 请输入扩展ID
echo 浏览器中32位ID, 例如: dmaldhchmoafliphkijbfhaomcgglmgd
set /p ExtensionID=扩展ID: 
echo.

echo 您输入的扩展名是: %ExtensionName%
echo 您输入的扩展ID是: %ExtensionID%
echo.


curl -L -o "%~dp0\[%ExtensionName%] Edge %ExtensionID%.crx" "https://edge.microsoft.com/extensionwebstorebase/v1/crx?x=id%%3D%ExtensionID%%%26installsource%%3Dondemand&response=redirect" 



pause
exit

-A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0"


curl -L -O "https://edge.microsoft.com/extensionwebstorebase/v1/crx?x=id%3Dodfafepnkmbhccpbejgmiehpchacaeak%26installsource%3Dondemand&response=redirect" ^
-A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0"


set ExtensionID=dmaldhchmoafliphkijbfhaomcgglmgd

curl -L  -O "https://edge.microsoft.com/extensionwebstorebase/v1/crx?x=id%3D%ExtensionID%%26installsource%3Dondemand&response=redirect" -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0"



