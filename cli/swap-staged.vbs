' Runs before 9router.vbs (underscore sorts first): atomically promote the
' staged build in cli\app-new to cli\app if the live server is NOT running.
' If 9Router is already up, do nothing (swap happens on a future boot).
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")
base = "C:\Users\USER\9router-serenhope\cli\"

' port 20128 listening? then skip
Set exec = sh.Exec("cmd /c netstat -ano | findstr LISTENING | findstr :20128")
WScript.Sleep 300
If exec.Status = 1 And Len(Trim(exec.StdOut.ReadAll)) = 0 Then
  If fso.FolderExists(base & "app-new") Then
    If fso.FolderExists(base & "app") Then
      If fso.FolderExists(base & "app.old") Then fso.DeleteFolder base & "app.old", True
      fso.MoveFolder base & "app", base & "app.old"
    End If
    fso.MoveFolder base & "app-new", base & "app"
  End If
End If
