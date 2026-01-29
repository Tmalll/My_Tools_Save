#!/bin/bash

# ================= 1. 环境与日志配置 =================
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_FILE="$DIR/rclone_update.log"
NEXT_CLEAN_FILE="$DIR/.rclone_update_next_clean"

# 加上这部分确保 rclone 走代理
export http_proxy="socks5h://192.168.1.40:10800"
export https_proxy="$http_proxy"
export HTTP_PROXY="$http_proxy"
export HTTPS_PROXY="$http_proxy"

# 清理间隔：604800秒 = 7天
CLEAN_INTERVAL=604800

current_time=$(date +%s)

# 初始化或读取下次清理时间
if [ ! -f "$NEXT_CLEAN_FILE" ]; then
    echo $((current_time + CLEAN_INTERVAL)) > "$NEXT_CLEAN_FILE"
fi

next_clean_time=$(cat "$NEXT_CLEAN_FILE")

# 执行周期性清理
if [ "$current_time" -gt "$next_clean_time" ]; then
    if [ -f "$LOG_FILE" ]; then
        rm "$LOG_FILE"
        echo "$(date): 已完成周期性日志清理。" > "$LOG_FILE"
        echo "------------------------------------------" >> "$LOG_FILE"
        echo "" >> "$LOG_FILE"
    fi
    echo $((current_time + CLEAN_INTERVAL)) > "$NEXT_CLEAN_FILE"
fi

# 核心：开启全局日志重定向 (屏幕显示的同时写入日志)
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=========================================="
echo "任务启动时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "网络代理已设置: $http_proxy"
echo "=========================================="
echo ""

# 全局参数
COMMON_FLAGS="--update --modify-window 2s --transfers 4 --checkers 8 --contimeout 60s --timeout 60s --retries 3 --low-level-retries 10 --log-level ERROR"
# --log-level LogLevel                  Log level DEBUG|INFO|NOTICE|ERROR (default NOTICE)


# ================= 3. 任务列表配置 =================
# 格式: "源,目标,附加参数"
# 注意：如果参数里有空格，没关系，脚本已做处理
copy_list=(
    # "local:/storage/emulated/0/backups,SMB-120:/E/#14-Rclone-BAK/backups-Note12,"
    # "local:/storage/emulated/0/backups,Home-WebDAV-BAK:/backups-Note12,"
    # "local:/storage/emulated/0/backups/Bak_To_JianGuoYun,WebDAV-JGY:/Note12,"
    
    # Termux 核心脚本与配置备份
    "/data/data/com.termux,SMB-120:/E/Termux_Backup/#latest, \
    --backup-dir SMB-120:/E/Termux_Backup/oldbak_$(date +%Y-%m-%d[%H.%M.%S]) \
    --log-level INFO --transfers 4 --checkers 4 \
    --one-file-system --copy-links --ignore-size\
    --exclude "/cache/**" \
    --exclude "/code_cache/**" \
    --exclude "/files/home/storage/**" \
    --exclude "/files/usr/bin/**" \
    --exclude "/files/usr/lib/**" \
    --exclude "/files/usr/share/**" \
    --exclude "/files/usr/include/**" \
    --exclude "/files/usr/var/cache/**" \
    --exclude "/files/usr/var/run/**" \
    --exclude "**/supervise/**" \
    --exclude "**/usr/var/log/**" \
    --exclude "**/*.socket" \
    --exclude "**/*.fifo" \
    --timeout 10s --contimeout 10s --retries 1 --low-level-retries 1 --ignore-errors"

    # 逻辑：备份整个 Termux 目录，追踪并拷贝软连接指向的真实文件，但排除掉指向手机存储的 storage 目录
    # "/data/data/com.termux,SMB-120:/E/Termux_Full_Backup,--copy-links --exclude files/home/storage/** --log-level INFO --transfers 32 --checkers 64 --dry-run"
    # "/data/data/com.termux,SMB-120:/E/Termux_Backup,--copy-links --exclude files/home/storage/** --exclude files/usr/lib/** --exclude files/usr/share/** --exclude files/usr/include/** --timeout 2s --retries 1 --low-level-retries 1 --ignore-errors"
    # 任务：Termux 全量备份
    # "/data/data/com.termux,SMB-120:/E/Termux_Backup,--dry-run \
    # --copy-links \
    # --exclude files/home/storage/** \
    # --exclude files/usr/lib/** \
    #　--exclude files/usr/share/** \
    # --exclude files/usr/include/** \
    # --timeout 2s \
    # --contimeout 2s \
    # --retries 1 \
    # --low-level-retries 1 \
    # --ignore-errors \
    # --log-level INFO"

    # 关于 --dry-run：如果你不确定 --exclude files/home/storage/** 写的路径对不对，可以在附加参数里加上 --dry-run。rclone 会模拟一遍过程并告诉你它会同步哪些、排除哪些，但不会真的写入数据。

    # 场景 A：只复制【小于】100MB 的文件 (排除大文件)
    # "local:/storage/emulated/0/backups,SMB-120:/E/BAK/small_files,--max-size 100M --skip-links"

    # 场景 B：只复制【大于】150MB 的文件 (专门备份大文件)
    # "local:/storage/emulated/0/backups,SMB-120:/E/BAK/big_files,--min-size 150M --skip-links"

    # 场景 C：只复制【100MB 到 500MB 之间】的文件 (区间筛选)
    # "local:/storage/emulated/0/backups,SMB-120:/E/BAK/range,--min-size 100M --max-size 500M"
    # --min-size SizeSuffix 仅传输大于此大小的文件（以 KiB 为单位）或后缀 B|K|M|G|T|P（默认关闭）
    # --max-size SizeSuffix 仅传输小于此值的文件（以 KiB 为单位）或后缀 B|K|M|G|T|P（默认关闭）

    # 示例 1：排除特定后缀（比如不备份大型视频或临时文件）
    # "local:/storage/emulated/0/backups,SMB-120:/E/#14-BAK/bk1,--exclude *.mp4 --exclude *.tmp"

    # 示例 2：排除软连接（如果全局带了 --links，想关掉它需要用 --ignore-links）
    # 注意：rclone 默认就是跳过软连接的，除非你显式加了 --links。
    # "local:/storage/emulated/0/backups,SMB-120:/E/#14-BAK/bk2,--ignore-links"
    # 参数,作用
    # (默认),跳过软连接，但在日志中显示 Can't follow symlink 的 Warning。
    # --skip-links,跳过软连接，并且关闭相关的警告日志。
    # --links,把软连接当做 .rclonelink 符号文件同步（通常用于保留链接关系）。
    # --copy-links,追踪软连接，把链接指向的真实文件/文件夹拷贝过去。

    # 示例 3：排除隐藏文件或特定文件夹（比如排除 .git 或 Android 的缓存目录）
    # "local:/storage/emulated/0/backups,WebDAV-JGY:/Note12,--exclude .*/** --exclude Android/data/**"

    # 示例 4：限制单任务速度（比如某些 WebDAV 服务限速，防止被封）
    # "local:/storage/emulated/0/backups,WebDAV-JGY:/Note12,--bwlimit 500k"

    # 示例 5：空参数（按默认 COMMON_FLAGS 执行）
    # "local:/storage/emulated/0/backups,Home-WebDAV-BAK:/backups-Note12,"

    # 场景 1：最干净的跳过软连接（不报警告）+ 排除特定后缀
    # "local:/storage/emulated/0/backups,SMB-120:/E/BAK/bk1,--skip-links --exclude *.tmp"

    # 场景 2：只同步文档，排除所有图片和视频
    # "local:/storage/emulated/0/backups,Home-WebDAV-BAK:/backups-Note12,--include *.{pdf,doc,docx,txt} --exclude *"

    # 场景 3：常规备份（无特殊参数，保持最后一个逗号或留空）
    # "local:/storage/emulated/0/backups/Bak_To_JianGuoYun,WebDAV-JGY:/Note12,"

    # 场景 4：同步工作目录，排除缓存文件夹和隐藏文件
    # "local:/storage/emulated/0/work,Home-WebDAV-BAK:/work_sync,--exclude .cache/** --exclude .*/** --skip-links"
    
    # 场景 5：镜像同步但限制单任务上传带宽（不影响其他任务）
    # "local:/storage/emulated/0/photos,SMB-120:/E/Photos,--bwlimit 2M"

)

# Sync 组 (镜像同步)
sync_list=(
    # "local:/storage/emulated/0/work,Home-WebDAV-BAK:/work_sync,--links --delete-before"
)

# ================= 4. 执行逻辑 =================

# 执行 Copy 组
echo "*** >>> 检查 Copy 组任务 <<< ***"
echo "------------------------------------------"

if [ ${#copy_list[@]} -eq 0 ]; then
    echo "没有配置 Copy 任务，已跳过。"
else
    for item in "${copy_list[@]}"; do
        # 核心修改：增加 extra 变量接收第三个字段
        IFS=',' read -r src dst extra <<< "$item"
        echo "正在处理 (Copy): $src -> $dst"
        if [ -n "$extra" ]; then echo "附加参数: $extra"; fi
        
        # 执行命令：合并全局参数与单个任务参数
        rclone copy "$src" "$dst" $COMMON_FLAGS $extra
    done
fi

# 执行 Sync 组
echo ""
echo "*** >>> 检查 Sync 组任务 <<< ***"
echo "------------------------------------------"

if [ ${#sync_list[@]} -eq 0 ]; then
    echo "没有配置 Sync 任务，已跳过。"
else
    for item in "${sync_list[@]}"; do
        # 核心修改：增加 extra 变量接收第三个字段
        IFS=',' read -r src dst extra <<< "$item"
        echo "正在处理 (Sync): $src -> $dst"
        if [ -n "$extra" ]; then echo "附加参数: $extra"; fi
        
        # 执行命令：合并全局参数与单个任务参数
        rclone sync "$src" "$dst" $COMMON_FLAGS $extra
    done
fi

echo ""
echo ""