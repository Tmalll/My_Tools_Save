set faceName=以太网

echo 禁用ipv6上的dhcp 只使用无状态获取IP

echo 按索引号
Get-NetIPInterface
Set-NetIPInterface -InterfaceIndex 10 -addressFamily IPv6 -dhcp Disabled

echo 按接口名称
Set-NetIPInterface -InterfaceAlias '以太网' -addressFamily IPv6 -dhcp Enabled
Set-NetIPInterface -InterfaceAlias '以太网' -addressFamily IPv6 -dhcp Disabled
