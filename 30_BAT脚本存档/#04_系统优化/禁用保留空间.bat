
## 查看是否启用保留存储
## dism /Online /Get-ReservedStorageState

## 开启保留存储
##  dism /Online /Set-ReservedStorageState /State:Enabled 

禁用保留存储

dism /Online /Set-ReservedStorageState /State:Disabled

pause
exit
