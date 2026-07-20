net stop bits
net stop wuauserv
net stop appidsvc
net stop cryptsvc

Del "%ALLUSERSPROFILE%\Application Data\Microsoft\Network\Downloader\qmgr*.dat"

Ren %Systemroot%\SoftwareDistribution SoftwareDistribution.bak
Ren %Systemroot%\System32\catroot2 catroot2.bak

regsvr32 /s atl.dll
regsvr32 /s urlmon.dll
regsvr32 /s mshtml.dll
regsvr32 /s shdocvw.dll
regsvr32 /s browseui.dll
regsvr32 /s jscript.dll
regsvr32 /s vbscript.dll
regsvr32 /s scrrun.dll
regsvr32 /s msxml.dll
regsvr32 /s msxml3.dll
regsvr32 /s msxml6.dll
regsvr32 /s actxprxy.dll
regsvr32 /s softpub.dll
regsvr32 /s wintrust.dll
regsvr32 /s dssenh.dll
regsvr32 /s rsaenh.dll
regsvr32 /s gpkcsp.dll
regsvr32 /s sccbase.dll
regsvr32 /s slbcsp.dll
regsvr32 /s cryptdlg.dll
regsvr32 /s oleaut32.dll
regsvr32 /s ole32.dll
regsvr32 /s shell32.dll
regsvr32 /s initpki.dll
regsvr32 /s wuapi.dll
regsvr32 /s wuaueng.dll
regsvr32 /s wuaueng1.dll
regsvr32 /s wucltui.dll
regsvr32 /s wups.dll
regsvr32 /s wups2.dll
regsvr32 /s wuweb.dll
regsvr32 /s qmgr.dll
regsvr32 /s qmgrprxy.dll
regsvr32 /s wucltux.dll
regsvr32 /s muweb.dll
regsvr32 /s wuwebv.dll

netsh winsock reset
netsh winhttp reset proxy

net start bits
net start wuauserv
net start appidsvc
net start cryptsvc


pause
exit

