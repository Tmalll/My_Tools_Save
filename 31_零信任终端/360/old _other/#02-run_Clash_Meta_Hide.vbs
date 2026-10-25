Set WshShell = CreateObject("WScript.Shell")
strCurDir    = WshShell.CurrentDirectory
WshShell.Run strCurDir & "\#01-run_Clash_Meta.bat", 0