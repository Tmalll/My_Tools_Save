powershell "Get-NetFirewallRule -DisplayGroup '*ºËĞÄÍøÂçÕï¶Ï*' -Direction Inbound | Set-NetFirewallRule -Enabled False"




exit



powershell "Get-NetFirewallRule -DisplayGroup '*ºËĞÄÍøÂçÕï¶Ï*' -Direction Inbound | Set-NetFirewallRule -LocalAddress 192.168.0.0/16 -RemoteAddress LocalSubnet"



powershell "Get-NetFirewallRule -DisplayGroup '*ºËĞÄÍøÂçÕï¶Ï*' -Direction Inbound | Set-NetFirewallRule -Enabled True"
powershell "Get-NetFirewallRule -DisplayGroup '*ºËĞÄÍøÂçÕï¶Ï*' -Direction Inbound | Set-NetFirewallRule -RemoteAddress any"













powershell "Set-NetFirewallRule -DisplayGroup 'ºËĞÄÍøÂçÕï¶Ï' -Enabled False"
exit

powershell "Set-NetFirewallRule -DisplayGroup 'ºËĞÄÍøÂçÕï¶Ï' -Enabled True"
powershell "Set-NetFirewallRule -DisplayGroup 'ºËĞÄÍøÂçÕï¶Ï' -RemoteAddress any"



