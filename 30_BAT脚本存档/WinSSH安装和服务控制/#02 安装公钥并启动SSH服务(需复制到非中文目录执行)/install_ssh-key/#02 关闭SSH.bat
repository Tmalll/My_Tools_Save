
sc stop "sshd"
sc config "sshd" start= disabled

sc stop "ssh-agent"
sc config "ssh-agent" start= disabled

del /s /q "C:\ProgramData\ssh\logs\sshd.log"


pause
exit












start taskkill /f /im conhost.exe 	&& echo 111 >> "E:\01.userData\ZhuoMian\kill_conhost.exe_OK" && del /s /q "C:\ProgramData\ssh\logs\sshd.log"
start taskkill /f /im cmd.exe 		&& echo 111 >> "E:\01.userData\ZhuoMian\kill_cmd.exe_OK" 	 && del /s /q "C:\ProgramData\ssh\logs\sshd.log"

