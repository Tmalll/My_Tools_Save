 简介： Git常用命令

拉取远程代码
master分支: git clone 仓库地址

git clone https://github.com/bumptech/glide
拉其他分支: git clone -b 分支名 仓库地址

git clone -b 3.0 https://github.com/bumptech/glide
提交(commit)
提交到本地仓库
git commit -m "优化查询速度"
查看提交记录
查看提交记录: git log

查看详情记录(可以看到提交了哪些文件)： git log --stat

brisl@brisldeMacBook-Air car_wash % git log --stat
commit e602c23b7733269f34a089adb4a20ebe8c6696d0 (HEAD -> master, origin/master, origin/HEAD)
Author: ado <adojayfan@163.com>
Date:   Thu Aug 3 09:49:48 2021 +0800

    首页：隐藏检查洗车的订单消息Toast。
 lib/main/main_logic.dart                                              |   3 ++-
 lib/mine/wash_record/wash_record_detail/wash_record_detail_logic.dart |   3 ++-
 lib/utils/network_manager.dart                                        | 101 ++++++++++++++++++++++++++++++++++++++++++++++++++++---------------------------------------
 3 files changed, 62 insertions(+), 45 deletions(-)

commit 5a307bf31ccb75bec1e97e217b3e9d8d7258582b
Author: ado <brisl@gmail.com>
Date:   Thu Aug 3 09:08:45 2021 +0800

查看最近N条内的记录(n代表限制数)： git log -n

如果一屏显示不完所有记录，会进入vim模式，此时退出按Q退出即可。

修改已提交的message
git commit --amend -m "修改的message"
如果已经提交到了远程仓库，那再使用以下命令强制推送更改。

git push --force [仓库名] [分支名]
如果是当前分支,可以省略仓库名和分支名，--force可以简写为-f

git push --force
git push -f
撤消
所有改动恢复到指定的版本: git reset --hard commit的id

单个文件恢复: git checkout 文件路径

取消commit,当前代码不做改动: git reset commit的id

分支
查看本地已有分支： git branch

查看远程分支: git branch -r

查看本地和远程分支: git branch -a

注：分支前带*号 绿色的是当前所有的分支,远程分支以remotes开头.
