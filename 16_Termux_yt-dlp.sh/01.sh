#!/data/data/com.termux/files/usr/bin/bash

# ytdlp.sh - Termux 一键下载视频脚本
# 用法: ./ytdlp.sh <视频URL> 或 ytdlp <视频URL>

# ---------------- 环境设置 ----------------
# 你的 yt-dlp 可执行文件路径
YT_DLP="$HOME/yt-dlp/yt-dlp"  # 如果放在 PATH 中也可以直接用 yt-dlp

# 工作目录，下载文件保存位置
WORKDIR="/storage/emulated/0/Download/yt-dlp"

# Cookies 文件（可选）
COOKIES_FILE="$WORKDIR/cookies.txt"

# 代理地址（可选，例如 socks5://127.0.0.1:1080）
PROXY_ADDRESS="socks5h://192.168.1.40:10801"

# 日志文件
out_log="$WORKDIR/ytdlp_out.log"
err_log="$WORKDIR/ytdlp_err.log"
update_log="$WORKDIR/ytdlp_update.log"


# 下载归档记录，避免重复下载
ARCHIVE_FILE="$WORKDIR/archive.txt"

URL="$1"
# ---------------- 参数检查 ----------------
if [ -z "$1" ]; then
    echo "用法: $0 <视频URL>"
    exit 1
fi

# 创建工作目录
mkdir -p "$WORKDIR"

# 升级程序
# "$YT_DLP" --update-to nightly 2>&1 | tee -a "$update_log"
sleep 2


# ---------------- 下载命令 ----------------
echo "" | tee -a "$out_log"
echo "" | tee -a "$out_log"
echo "$(date +%Y-%m-%d[%H.%M.%S]) 下载程序开始" | tee -a "$out_log"

"$YT_DLP" "$URL" \
    --cookies "$COOKIES_FILE" \
    -o "$WORKDIR/[%(playlist,channel,uploader)s][%(playlist_id,channel_id,uploader_id)s]/[%(upload_date)s][%(id)s][%(title).150B][%(resolution)s][%(vcodec).4B][%(acodec).4B].%(ext)s" \
    --proxy "$PROXY_ADDRESS" \
    --no-check-certificate --ignore-errors --no-warnings --no-mtime --js-runtimes deno --merge-output-format mkv \
    -f "(bestvideo[width>1080][vcodec!*=av01][aspect_ratio<1]+bestaudio)/(bestvideo[height>1080][vcodec!*=av01][aspect_ratio>=1]+bestaudio)/(bestvideo[width<=1080][vcodec*=hev1][aspect_ratio<1]+bestaudio)/(bestvideo[height<=1080][vcodec*=hev1][aspect_ratio>=1]+bestaudio)/(bestvideo[width<=1080][vcodec*=avc1][aspect_ratio<1]+bestaudio)/(bestvideo[height<=1080][vcodec*=avc1][aspect_ratio>=1]+bestaudio)/(bestvideo[width<=1080][vcodec!*=av01][aspect_ratio<1]+bestaudio)/(bestvideo[height<=1080][vcodec!*=av01][aspect_ratio>=1]+bestaudio)" \
    --download-archive "$ARCHIVE_FILE" \
    --extractor-args youtube:lang=zh-CN \
    --windows-filenames \
    --trim-filenames 250 \
    1> >(tee -a "$out_log") \
    2> >(tee -a "$err_log" >&2)

    echo "$(date +%Y-%m-%d[%H.%M.%S]) 下载程序结束" | tee -a "$out_log"
    echo "下载完成，日志文件:" | tee -a "$out_log"
    echo "$out_log" | tee -a "$out_log"
    echo "$err_log" | tee -a "$out_log"

