[Version]
Class=IEXPRESS
SEDVersion=3

[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=0
UseLongFileName=1
InsideCompressed=1
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=
FinishMessage=
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=cmd.exe /c Install-Classync.cmd
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles

[Strings]
InstallPrompt=Install Classync on this computer?
TargetName=__TARGET_PATH__
FriendlyName=Classync Setup
FILE0=ClassyncServer.exe
FILE1=Install-Classync.ps1
FILE2=Install-Classync.cmd

[SourceFiles]
SourceFiles0=__SOURCE_PATH__\

[SourceFiles0]
%FILE0%=
%FILE1%=
%FILE2%=
