

sc stop "sshd"
choice /t 1 /d y /n >nul


del /s /q "C:\ProgramData\ssh\logs\sshd.log"
choice /t 1 /d y /n >nul


sc start "sshd"
sc config "sshd" start= auto
sc failure "sshd" reset= 0 actions= restart/5000/restart/15000/restart/30000
choice /t 1 /d y /n >nul


type "C:\ProgramData\ssh\logs\sshd.log"


pause
exit


sc stop "sshd"
sc start "sshd"