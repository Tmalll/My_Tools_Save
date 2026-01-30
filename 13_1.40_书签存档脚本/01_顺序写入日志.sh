#!/bin/bash

# 环境与变量配置
BASE_DIR=$(cd "$(dirname "$0")"; pwd)
FILE_NAME="bookmarks.html"
TARGET_FILE="$BASE_DIR/$FILE_NAME"
LOCK_FILE="$TARGET_FILE.lock"
LOG_FILE="$BASE_DIR/bak_BMS.log"
TIMESTAMP=$(date +"[%Y-%m-%d(%H.%M.%S)]")

# 开启全局日志重定向 (屏幕显示的同时写入日志)
# 如果日志文件修改时间超过 7 天，则清空其内容（保留文件本身）
find "$LOG_FILE" -mtime +7 -exec cp /dev/null {} \; 2>/dev/null
exec > >(tee -a "$LOG_FILE") 2>&1
echo "=========================================="
echo "   任务启动时间: $TIMESTAMP"
echo "=========================================="

# 归档与清理
    # --- 归档与清理 (支持追加到现有 7z 包) ---
    LAST_MONTH=$(date -d "last month" +"%Y-%m")
    ARCHIVE_NAME="$BASE_DIR/old_bak_${LAST_MONTH}.7z"

    # 1. 使用 find 获取所有匹配的文件夹 (处理空格和括号)
    FOLDERS_TO_ARCHIVE=()
    while IFS= read -r -d '' line; do
        FOLDERS_TO_ARCHIVE+=("$line")
    done < <(find "$BASE_DIR" -maxdepth 1 -type d -name "old_bak_${LAST_MONTH}*" -print0 2>/dev/null)

    # 2. 如果找到了文件夹
    if [ ${#FOLDERS_TO_ARCHIVE[@]} -gt 0 ]; then
        echo "$TIMESTAMP 检测到上月 ${#FOLDERS_TO_ARCHIVE[@]} 个文件夹，准备追加至归档..."

        # 3. 直接执行 7z a (a 代表 add)
        # 7z 会自动识别：包不存在则创建，包存在则追加
        7z a -t7z -m0=lzma2 -mx=9 -mfb=64 -md=32m "$ARCHIVE_NAME" "${FOLDERS_TO_ARCHIVE[@]}" > /dev/null

        # 4. 判断压缩返回值
        if [ $? -eq 0 ]; then
            # 只有 7z 返回成功(0)，才敢删除原始文件夹
            rm -rf "${FOLDERS_TO_ARCHIVE[@]}"
            echo "$TIMESTAMP ${LAST_MONTH} 数据已成功追加存入 > $ARCHIVE_NAME 并清理原目录。"
        else
            echo "$TIMESTAMP 错误：7z 压缩失败，未删除原始文件夹。"
        fi
    fi


    # 清理超过 90 天的 7z 压缩包，防止占用过多空间
    find "$BASE_DIR" -name "old_bak_*.7z" -type f -mtime +90 -delete

# 处理锁定文件逻辑
    if [ -f "$LOCK_FILE" ]; then
        # 检查锁定文件是否超过 15 分钟
        EXPIRED_LOCK=$(find "$LOCK_FILE" -mmin +15)
        if [ -n "$EXPIRED_LOCK" ]; then
            echo "$TIMESTAMP 检测到过期的锁定文件, 正在强制清理并继续备份..."
            rm -f "$LOCK_FILE"
        else
            echo "$TIMESTAMP 书签正在同步中(.Lock文件存在且未超时), 跳过本次备份..."
            echo ""
            # 锁未超时，退出
            exit 0
        fi
    fi

# 检查目标文件是否存在
    if [ ! -f "$TARGET_FILE" ]; then
        echo "$TIMESTAMP $TARGET_FILE 文件不存在, 跳过本次备份。"
        echo ""
        exit 0
    fi

# 执行备份
    # 计算动态备份目录
    YEAR_MONTH=$(date +"%Y-%m")
    DOM=$(date +%d)
    WEEK_NUM=$(( (10#$DOM - 1) / 7 + 1 ))
    BAK_DIR="$BASE_DIR/old_bak_${YEAR_MONTH}(第${WEEK_NUM}周)"
    mkdir -p "$BAK_DIR"

    # 执行备份操作
    NEW_NAME="bookmarks_$TIMESTAMP.html"
    mv "$TARGET_FILE" "$BAK_DIR/$NEW_NAME"
    echo "$TIMESTAMP 备份成功至: $BAK_DIR/$NEW_NAME"
    echo ""


