Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set shell = CreateObject("Shell.Application")
shell.ShellExecute """" & scriptDir & "\#01-ÔËÐÐ1_User.bat""", "", "", "runas", 0
