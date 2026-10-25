@echo off

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

::    数值 (/d),启动类型 (Startup Type),含义与影响
::    2,自动 (Automatic),电脑开机进入系统时，服务就自动在后台启动运行。
::    3,手动 (Manual),开机时不启动。只有当某个软件、用户或者系统组件需要调用它时，它才会临时启动。
::    4,禁用 (Disabled),彻底关闭。任何情况下都无法启动，哪怕其他软件强行调用也会报错。
::    0,系统引导 (Boot),属于内核驱动级别。由系统引导程序加载，普通系统服务千万不要改成这个，会导致蓝屏。
::    1,系统系统 (System),属于内核驱动级别。在操作系统的核心初始化时加载，普通服务同样不能改成这个。


:: 彻底禁用 CDP 连接设备平台服务的母体
reg add "HKLM\SYSTEM\CurrentControlSet\Services\CDPUserSvc" /v "Start" /t REG_DWORD /d 4 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Services\CDPSvc" /v "Start" /t REG_DWORD /d 4 /f
::    1. CDPUserSvc / CDPSvc (Connected Devices Platform Service - 连接设备平台服务)
::    做什么的： 负责管理 Windows 设备与其它设备（如安卓手机、蓝牙耳机、Xbox、其他 PC）的跨设备连接、数据同步和蓝牙联动。比如 Windows 的“手机连接（Phone Link）”应用、跨设备剪贴板同步、以及“就近共享”功能都依赖它。
::    禁用了有什么影响： 如果你不使用微软官方的“手机连接”投屏、不用 Windows 蓝牙和手机同步传送文件、不用跨设备剪贴板，那完全可以禁用，毫无副作用。



:: 彻底禁用 邮件/日历/数据同步服务的母体
reg add "HKLM\SYSTEM\CurrentControlSet\Services\OneSyncSvc" /v "Start" /t REG_DWORD /d 4 /f
::    2. OneSyncSvc (Sync Host - 同步主机)
::    做什么的： 专门负责同步 Windows 官方自带应用的数据，最核心的就是自带的“邮件”、“日历”、“人别（Contacts）”以及 OneDrive 的部分同步逻辑。
::    禁用了有什么影响： 如果你不用 Windows 自带的那个“邮件和日历”客户端，也不用它同步微软账户的联系人，完全可以禁用。它不影响第三方邮件客户端（如 Outlook 软件、Foxmail）和你的网页版邮箱。


reg add "HKLM\SYSTEM\CurrentControlSet\Services\UserDataSvc" /v "Start" /t REG_DWORD /d 4 /f
::    3. UserDataSvc (User Data Access - 用户数据访问)
::    做什么的： 为上面的同步服务提供底层结构支持，负责为结构化用户数据（如联系人、日历、消息）提供本地文件和数据库访问。
::    禁用了有什么影响： 它与 OneSyncSvc 捆绑。如果不使用 Windows 自带的邮件、日历和人脉，可以禁用。


:: 【根据需求选择性加入】
:: 1. 禁用 Xbox 服务（不玩微软商店/XGP游戏的可以禁）
reg add "HKLM\SYSTEM\CurrentControlSet\Services\XblAuthManager" /v "Start" /t REG_DWORD /d 4 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Services\XblGameSave" /v "Start" /t REG_DWORD /d 4 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Services\XboxNetApiSvc" /v "Start" /t REG_DWORD /d 4 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Services\XboxGipSvc" /v "Start" /t REG_DWORD /d 4 /f
::    1. 游戏与投屏相关（不玩特定功能可闭眼禁）Xbox 相关全家桶服务
::    母体服务名： XblAuthManager (Xbox Live 身份验证)、XblGameSave (Xbox Live 游戏保存)、XboxNetApiSvc (Xbox Live 网络服务)、XboxGipSvc (Xbox 配件管理)
::    它是做什么的： 负责 Windows 自带的 Xbox 游戏生态。管理 Xbox 账号登录、云存档同步、Xbox 联机网络以及 Xbox 官方手柄的固件更新。
::    禁用后的影响：
::    如果你玩微软应用商店（Microsoft Store）的游戏、或者用 Xbox Game Pass (XGP) 玩游戏： 千万别禁！ 禁用了会导致无法登录 Xbox 账号、无法同步游戏云存档。
::    如果你只玩 Steam、Epic、学习版游戏： 完全可以禁用。 禁用后不影响第三方平台游戏，也不影响你用蓝牙/有线连接 Xbox 手柄玩游戏（系统自带基础驱动）。


:: 2. 禁用系统自带游戏录屏/广播（用第三方录屏的可以禁）
reg add "HKLM\SYSTEM\CurrentControlSet\Services\BcastDVRUserService" /v "Start" /t REG_DWORD /d 4 /f
::    投影与无线显示服务
::    母体服务名： BcastDVRUserService (游戏卡带和广播服务)
::    它是做什么的： 这也是一个典型的带随机后缀的服务。它负责系统自带的 Win + G 游戏栏（Xbox Game Bar）里的屏幕录制、游戏广播、截图功能。
::    禁用后的影响： 禁用后，系统自带的 Win + G 录屏功能将无法使用。如果你平时录屏使用的是 OBS、GeForce Experience（N卡录屏）或者 Bandicam 等第三方软件，这个服务完全是多余的，直接禁用毫无影响。


:: 3. 禁用新闻小组件与推送通知（讨厌广告新闻弹窗的可以禁）
reg add "HKLM\SYSTEM\CurrentControlSet\Services\WpnUserService" /v "Start" /t REG_DWORD /d 3 /f
::    2. 微软云端与小工具（大部分本地党不需要）微软小组件与新闻推送
::    母体服务名： WpnUserService (Windows 推送通知用户服务)
::    它是做什么的： 负责任务栏左下角/左侧的“天气和小组件”面板、开始菜单的动态通知，以及各种应用向你推送系统级通知弹窗（吐糟：绝大部分是微软自家的广告和新闻）。它也是一个带随机后缀的服务。
::    禁用后的影响：
::    影响： 任务栏的小组件（如新闻、股票、天气面板）可能无法刷新或直接空白。
::    注意： 极少数第三方独立 UWP 应用如果依赖系统通知中心弹窗，可能会收不到弹窗提示（但软件内部正常）。如果你讨厌 Windows 经常给你推新闻和广告，禁它非常有效。



:: 4. 禁用 Edge 浏览器用户同步（不用 Edge 的可以禁）
:: reg add "HKLM\SYSTEM\CurrentControlSet\Services\EdgeUserService" /v "Start" /t REG_DWORD /d 4 /f
::    微软内置 Edge 浏览器更新与浏览器数据同步
::    母体服务名： EdgeUserService (Microsoft Edge 浏览器用户服务)
::    它是做什么的： 专门负责 Edge 浏览器在不同设备间同步你的书签、密码、历史记录，以及处理 Edge 的后台某些用户行为上传。它同样带有随机后缀。
::    禁用后的影响：
::    影响： 如果你把 Edge 当作主力浏览器，且重度依赖它的多设备同步功能，禁用会导致书签等无法同步。
::    无影响： 如果你使用的是 Chrome、Firefox 或者其它第三方浏览器，这个服务在后台就是纯纯的摆设，果断禁用。



:: 5. 禁用生物识别服务（台式机或无指纹/人脸解锁的可以禁）
reg add "HKLM\SYSTEM\CurrentControlSet\Services\WbioSrvc" /v "Start" /t REG_DWORD /d 4 /f
::    3. 生物识别与安全隐私（按需决定） Windows Hello 人脸/指纹解锁
::    母体服务名： WbioSrvc (Windows Biometric Service)
::    它是做什么的： 负责管理和调用红外摄像头、指纹识别模块，实现开机时的人脸解锁或指纹解锁。
::    禁用后的影响：
::    台式机用户： 如果你用的是台式机，且没有专门支持 Windows Hello 的红外摄像头或指纹键盘，直接禁用，完全零影响。
::    笔记本用户： 禁用了就只能用传统的数字密码或 PIN 码开机，无法再刷脸或按指纹。



:: 全局关闭 Windows 的“按用户服务”动态生成机制
:: reg add "HKLM\SYSTEM\CurrentControlSet\Control\UserServiceFlags" /v "UserServiceInterfaceConfig" /t REG_DWORD /d 0 /f
:: 还原
   reg add "HKLM\SYSTEM\CurrentControlSet\Control\UserServiceFlags" /v "UserServiceInterfaceConfig" /t REG_DWORD /d 1 /f
   reg delete "HKLM\SYSTEM\CurrentControlSet\Control\UserServiceFlags" /v "UserServiceInterfaceConfig" /f



pause
exit



