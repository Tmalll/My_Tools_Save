@echo off

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)



:: 1. 禁用遥测（对应你组策略图片中的核心项）
reg add "HKLM\Software\Policies\Microsoft\Windows\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d "0" /f
:: 针对部分 Win10/11 新版本的额外安全项（限制诊断数据为安全或关闭）
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d "0" /f
::	1. AllowTelemetry (值为 0)
::	对应功能： 这就是“禁用遥测 Snipaste_2023-10-24_07-11-07.png”中标准的“允许遥测”组策略。
::	具体干嘛的： 它是 Windows 的核心诊断数据收集开关。开启时，系统会收集你的硬件配置、应用崩溃日志、设备使用频率等数据发送给微软。
::	禁用了有什么影响：
::	正面影响： 大幅减少系统后台不必要的网络上传，提升隐私安全。
::	负面/副作用： 加入了 Windows 会员预览计划（Windows Insider）的设备将无法接收预览版更新（因为预览版强制要求开启遥测）；同时，系统设置里的“诊断和反馈”页面会提示一行红字：“某些设置由你的组织管理”。


:: 2. 禁用活动历史记录（时间线 Activity Feed）
reg add "HKLM\Software\Policies\Microsoft\Windows\System" /v "EnableActivityFeed" /t REG_DWORD /d "0" /f
::	2. EnableActivityFeed (值为 0)
::	对应功能： 禁用“活动历史记录”（也就是早前 Win10 的“时间线 Timeline”功能）。
::	具体干嘛的： 它会记录你过去几天甚至几周内打开过什么文件、浏览过什么网页、用过什么软件，并将其同步到云端，方便你在多台 Windows 设备之间切换时“继续之前的进度”。
::	禁用了有什么影响：
::	影响： 你在按 Win + Tab（任务视图）时，不会再看到过去几天的历史活动卡片；开始菜单里的“推荐”或“最近打开的文件”可能不再实时同步到其他微软设备上。对日常本地使用没有任何不良影响。


:: 3. 禁用反馈通知
reg add "HKLM\Software\Policies\Microsoft\Windows\DataCollection" /v "DoNotShowFeedbackNotifications" /t REG_DWORD /d "1" /f
::	3. DoNotShowFeedbackNotifications (值为 1)
::	对应功能： 禁用“不显示反馈通知”。
::	具体干嘛的： 阻止 Windows 偶尔在右下角弹窗问你：“你对当前版本的 Windows 满意吗？”、“你会向朋友推荐此功能吗？”这类恶心人的微软官方调研问卷。
::	禁用了有什么影响：
::	影响： 毫无副作用。耳根子清净，系统再也不会主动弹窗打扰你。


:: 4. 【补充】禁用向微软发送改进墨迹和键入（键盘输入）数据
reg add "HKLM\Software\Policies\Microsoft\InputPersonalization" /v "AllowInputPersonalization" /t REG_DWORD /d 0 /f
reg add "HKCU\Software\Microsoft\InputPersonalization\TrainedDataStore" /v "HarvestContacts" /t REG_DWORD /d 0 /f
::	AllowInputPersonalization 和 HarvestContacts (值为 0)
::	对应功能： 禁用“墨迹和键入个性化”（个性化手写和键入识别）。
::	具体干嘛的： 微软为了“优化输入法词库”和“手写识别率”，会在后台悄悄收集你的本地用户词典、打字习惯甚至联系人姓名。
::	禁用了有什么影响：
::	影响： 微软自带的输入法不会再把你的打字习惯上传到云端同步。如果你使用的是第三方输入法（如微信输入法、搜狗、小狼毫等），该项修改完全零影响。


:: 5. 【补充】关闭商用可选诊断数据（防止新版系统换壳收集）
::        reg add "HKLM\Software\Policies\Microsoft\Windows\DataCollection" /v "MaxTelemetryAllowed" /t REG_DWORD /d 0 /f
:: 还原
reg delete "HKLM\Software\Policies\Microsoft\Windows\DataCollection" /v "MaxTelemetryAllowed" /f
::	2. MaxTelemetryAllowed (值为 0)
::	对应功能： 限制最高允许的遥测级别。
::	具体干嘛的： 这是一个强力补丁。有时候系统更新后，某些系统组件会无视 AllowTelemetry=0，而这个策略是用来强制规定“无论如何，全系统最高只能收集 0 级别的诊断数据”。
::	禁用了有什么影响：
::	影响： 进一步封死遥测漏洞，无副作用。


:: 6. 停止并彻底禁用遥测相关服务
echo 正在处理系统服务...
@echo on
sc stop DiagTrack
sc config DiagTrack start= demand
::	3. 系统服务 DiagTrack (诊断跟踪服务) disabled
::	对应功能： 彻底停止并禁用 Connected User Experiences and Telemetry 服务。
::	具体干嘛的： 这是前面所有注册表规则的“执行者”。上面那些是规则，而这个服务是真正在后台扫描系统、打包日志并往微软服务器发送数据的那个进程。
::	禁用了有什么影响：
::	正面影响： 彻底解决有时候这个服务在后台莫名其妙吃 CPU 和硬盘 I/O 的问题（很多老电脑卡顿就是它引起的）。
::	负面/副作用：
::	错误报告失效： 当某个软件崩溃闪退时，系统不会再弹出“正在检查解决方案...”并把崩溃日志发给微软。
::	功能受限： Windows 自带的“性能监视器”或部分高级系统诊断工具中，关于用户行为分析的数据会变成空白。

sc stop dmwappushservice
sc config dmwappushservice start= disabled
::	4. 系统服务 dmwappushservice (WAP 推送消息路由服务) disabled
::	对应功能： 停止并禁用设备管理无线应用协议推送服务。
::	具体干嘛的： 主要用于企业级设备远程管理或配合遥测收集某些特定路由数据。
::	禁用了有什么影响：
::	影响： 普通个人电脑、家用环境或纯本地使用的电脑完全不需要这个服务，禁用它没有任何感知。
@echo off

:: 7. 【补充】清除并禁用诊断日志写入（防止本地继续堆积遥测日志）
echo 正在清除现有遥测缓存...
wevtutil cl "Microsoft-Windows-UniversalTelemetryClient/Operational"




pause
exit

参考
https://www.pdq.com/blog/remotely-disable-windows-data-collection/