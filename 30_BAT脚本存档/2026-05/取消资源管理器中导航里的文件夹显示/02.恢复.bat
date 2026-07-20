@echo off
:: ª÷∏¥ Home
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Desktop\NameSpace\{F874310E-B6B7-47DC-BC84-B9E6B38F5903}" /ve /t REG_SZ /d "Home" /f

:: ª÷∏¥ Gallery
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Desktop\NameSpace\{E88865EA-0E1C-4E20-9AA6-EDCD0212C87C}" /ve /t REG_SZ /d "Gallery" /f

:: ª÷∏¥ OneDrive
reg add "HKCR\CLSID\{018D5C66-4533-4307-9B53-224DE2ED1FE6}" /v System.IsPinnedToNameSpaceTree /t REG_DWORD /d 1 /f

:: ÷ÿ∆Ù Explorer
taskkill /f /im explorer.exe
start explorer.exe
