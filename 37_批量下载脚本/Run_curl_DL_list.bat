FOR /f "tokens=*" %%a in (list.txt) do curl -o %~dp0\1.mp4 %%a

pause
exit
