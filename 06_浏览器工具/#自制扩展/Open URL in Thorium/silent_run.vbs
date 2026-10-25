Set ws = CreateObject("Wscript.Shell")
Set regEx = New RegExp
regEx.Pattern = "https?://.*"
regEx.IgnoreCase = True
If Wscript.Arguments.Count > 0 Then
    rawUrl = Wscript.Arguments(0)
    Set matches = regEx.Execute(rawUrl)
    If matches.Count > 0 Then
        cleanUrl = matches(0).Value
        ' 去除可能携带的末尾斜杠或引号污染
        If Right(cleanUrl, 1) = "/" Then cleanUrl = Left(cleanUrl, Len(cleanUrl) - 1)
        If Right(cleanUrl, 1) = """" Then cleanUrl = Left(cleanUrl, Len(cleanUrl) - 1)
        ' VBS 彻底隐藏黑框拉起目标浏览器
        ws.Run """D:\01.Program_Soft\01-浏览器\Thorium\#Thorium_BIN\thorium.exe"" --url """ & cleanUrl & """", 0, False
    End If
End If
