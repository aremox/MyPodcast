!macro customInit
  nsExec::Exec 'taskkill /F /IM "MyPodcastSync.exe" /T'
!macroend

!macro customUnInit
  nsExec::Exec 'taskkill /F /IM "MyPodcastSync.exe" /T'
!macroend
