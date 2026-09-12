$ErrorActionPreference = "Stop"

$sourceExe = Join-Path $PSScriptRoot "ClassyncServer.exe"
$installDir = Join-Path $env:LOCALAPPDATA "Programs\Classync"
$targetExe = Join-Path $installDir "ClassyncServer.exe"
$startMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$shortcutPath = Join-Path $startMenuDir "Classync.lnk"

New-Item -ItemType Directory -Path $installDir -Force | Out-Null
Copy-Item -LiteralPath $sourceExe -Destination $targetExe -Force

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetExe
$shortcut.WorkingDirectory = $installDir
$shortcut.Description = "Classync classroom file sharing server"
$shortcut.Save()

try {
    $firewallArguments = @(
        "advfirewall", "firewall", "add", "rule",
        "name=Classync Server",
        "dir=in", "action=allow", "protocol=TCP", "localport=8000",
        "remoteip=LocalSubnet", "profile=any"
    )
    Start-Process -FilePath "netsh.exe" -ArgumentList $firewallArguments -Verb RunAs -Wait
} catch {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        "Classync was installed, but its Windows Firewall rule could not be created. Other devices may be unable to connect until TCP port 8000 is allowed.",
        "Classync firewall notice"
    ) | Out-Null
}

Start-Process -FilePath $targetExe
Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show(
    "Classync was installed. Its server window contains the new superadmin setup key. Keep that key private.",
    "Classync installation complete"
) | Out-Null
