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

# ================= 2. rclone 参数定义 =================
COMMON_FLAGS="--update --modify-window 2s --transfers 4 --checkers 8 --contimeout 60s --timeout 300s --retries 3 --low-level-retries 10 --log-level WARNING"

# ================= 3. 任务列表配置 =================
# Copy 组 (增量备份)
copy_list=(
    #
    "local:/storage/emulated/0/backups,SMB-120:/E/#14-Rclone-BAK/backups-Note12"
    "local:/storage/emulated/0/backups,Home-WebDAV-BAK:/backups-Note12"
    "local:/storage/emulated/0/backups/Bak_To_JianGuoYun,WebDAV-JGY:/Note12"
)

# Sync 组 (镜像同步)
sync_list=(
    # "local:/storage/emulated/0/backups,SMB-120:/E/#14-Rclone-BAK/backups-Note12"
    # "local:/storage/emulated/0/backups,Home-WebDAV-BAK:/backups-Note12"
    # "local:/storage/emulated/0/backups,Home-WebDAV-BAK:/backups-Note12"
    # "local:/storage/emulated/0/work,Home-WebDAV-BAK:/work_sync"
)

# ================= 4. 执行逻辑 =================

# 执行 Copy 组
echo "*** >>> 检查 Copy 组任务 <<< ***"
echo "------------------------------------------"

if [ ${#copy_list[@]} -eq 0 ]; then
    echo "没有配置 Copy 任务，已跳过。"
else
    for item in "${copy_list[@]}"; do
        IFS=',' read -r src dst <<< "$item"
        echo "正在处理 (Copy): $src -> $dst"
        rclone copy "$src" "$dst" $COMMON_FLAGS
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
        IFS=',' read -r src dst <<< "$item"
        echo "正在处理 (Sync): $src -> $dst"
        rclone sync "$src" "$dst" $COMMON_FLAGS
    done
fi
echo ""
echo ""