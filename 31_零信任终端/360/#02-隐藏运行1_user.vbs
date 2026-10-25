Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """" & scriptDir & "\#01-ÔËÐÐ1_User.bat""", 0, False
