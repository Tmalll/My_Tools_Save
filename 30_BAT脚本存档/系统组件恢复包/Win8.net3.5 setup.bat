@echo off
echo.
set /p Image=ÊäÈëWin8¾µÏñĞéÄâ¹âÇıÅÌ·û:
%Image%:\sources\dism.exe /online /enable-feature /featurename:NetFX3 /Source:%Image%:\sources\sxs
echo
pause