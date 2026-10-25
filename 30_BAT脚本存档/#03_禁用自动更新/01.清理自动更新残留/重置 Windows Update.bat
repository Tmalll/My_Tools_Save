net stop wuauserv
net stop bits
net stop cryptsvc

ren C:\Windows\SoftwareDistribution SoftwareDistribution.old
ren C:\Windows\System32\catroot2 catroot2.old

net start cryptsvc
net start bits
net start wuauserv