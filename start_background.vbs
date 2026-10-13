' VaxTrack Silent Background Launcher
' Starts both Backend and Frontend without showing black command prompt windows,
' then opens the application in your default web browser.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

strScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Determine python executable path
strVenvPython = strScriptDir & "\venv\Scripts\python.exe"
If fso.FileExists(strVenvPython) Then
    strPyCmd = """" & strVenvPython & """"
Else
    strPyCmd = "python"
End If

' 1. Start Python Flask Backend silently (0 = hide window)
WshShell.Run "cmd /c ""cd /d """ & strScriptDir & """ && " & strPyCmd & " -m backend.app.main""", 0, False

WScript.Sleep 2500

' 2. Start React Vite Frontend silently (0 = hide window)
WshShell.Run "cmd /c ""cd /d """ & strScriptDir & "\frontend"" && npm.cmd run dev""", 0, False

WScript.Sleep 3000

' 3. Open browser
WshShell.Run "http://localhost:5173", 1, False
