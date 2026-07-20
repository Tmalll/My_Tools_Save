@echo off
:: Òþ²Ø Home
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Desktop\NameSpace\{F874310E-B6B7-47DC-BC84-B9E6B38F5903}" /f

:: Òþ²Ø Gallery
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Desktop\NameSpace\{E88865EA-0E1C-4E20-9AA6-EDCD0212C87C}" /f

:: Òþ²Ø OneDrive
reg add "HKCR\CLSID\{018D5C66-4533-4307-9B53-224DE2ED1FE6}" /v System.IsPinnedToNameSpaceTree /t REG_DWORD /d 0 /f

:: ÖØÆô Explorer
taskkill /f /im explorer.exe
start explorer.exe
