

sc stop "wuauserv"
pathping -p 2000 -q 1 localhost >nul

rmdir /s /q "C:\Windows\SoftwareDistribution\Download"
mkdir /s /q "C:\Windows\SoftwareDistribution\Download"
pathping -p 2000 -q 1 localhost >nul


sc start "wuauserv"
pathping -p 2000 -q 1 localhost >nul



pause