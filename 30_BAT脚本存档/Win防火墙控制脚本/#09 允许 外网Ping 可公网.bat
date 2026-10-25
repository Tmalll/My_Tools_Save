powershell "Get-NetFirewallRule -DisplayGroup '*ºËĞÄÍøÂçÕï¶Ï*' -Direction Inbound | Set-NetFirewallRule -Enabled True"
powershell "Get-NetFirewallRule -DisplayGroup '*ºËĞÄÍøÂçÕï¶Ï*' -Direction Inbound | Set-NetFirewallRule -RemoteAddress any -LocalAddress any"


exit



powershell "Get-NetFirewallRule -DisplayGroup '*ºËĞÄÍøÂçÕï¶Ï*' -Direction Inbound | Set-NetFirewallRule -Enabled False"
powershell "Get-NetFirewallRule -DisplayGroup '*ºËĞÄÍøÂçÕï¶Ï*' -Direction Inbound | Set-NetFirewallRule -LocalAddress 192.168.0.0/16 -RemoteAddress LocalSubnet"
