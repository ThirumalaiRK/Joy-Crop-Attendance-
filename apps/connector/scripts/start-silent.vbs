Set WshShell = CreateObject("WScript.Shell")
' Run connector node process silently with hidden window (0)
WshShell.Run "node " & Chr(34) & Replace(WScript.ScriptFullName, "scripts\start-silent.vbs", "dist\index.js") & Chr(34), 0, False
