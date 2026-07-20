


start "" "cmd /k "
del /q proxy.ps1.log
powershell -ExecutionPolicy Bypass -File proxy_v15_优化内存回收策略.ps1

exit

  >  proxy.ps1.log