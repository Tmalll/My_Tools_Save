#!/usr/bin/env bash

# 颜色定义
RED='\033[1;31m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
PURPLE='\033[1;35m' # 亮紫色，用于校验显示
NC='\033[0m' # No Color

# 检查依赖
check_dependencies() {
    if ! command -v base64 &> /dev/null; then
        echo -e "${RED}错误: 未找到 base64 命令${NC}"
        exit 1
    fi
    if ! command -v md5sum &> /dev/null; then
        echo -e "${RED}错误: 未找到 md5sum 命令${NC}"
        exit 1
    fi
}

# 获取文件校验信息 (大小 + MD5)
get_file_info() {
    local file="$1"
    local size=$(stat -c %s "$file")
    local md5=$(md5sum "$file" | awk '{print $1}')
    echo "$size|$md5"
}

# 显示帮助信息
show_help() {
    echo -e "${GREEN}Base64 编码/解码工具 (双重校验版)${NC}"
    echo "用法: $0 [选项] <文件名>"
    echo -e "校验模式: ${PURPLE}Size + MD5 (外挂 .md5 文件)${NC}"
}

# URL安全编码/解码函数
urlsafe_base64_encode() {
    echo -n "$1" | base64 | tr -d '\n' | sed 's/\+/-/g; s/\//_/g; s/=/ @/g' | tr -d ' '
}
urlsafe_base64_decode() {
    echo -n "$1" | sed 's/-/+/g; s/_/\//g; s/@/=/g' | base64 -d 2>/dev/null
}

# 执行编码逻辑 (含校验生成)
do_encode() {
    local input="$1"
    local output="$2"
    
    # 获取原文件信息
    local info=$(get_file_info "$input")
    local ori_size=$(echo "$info" | cut -d'|' -f1)
    local ori_md5=$(echo "$info" | cut -d'|' -f2)

    echo -e "${GREEN}正在处理: $input${NC}"
    base64 "$input" > "$output"
    
    if [ $? -eq 0 ]; then
        # 生成外挂校验文件
        echo "$info" > "${output}.md5"
        echo -e "${YELLOW}输出文件: $output${NC}"
        echo -e "${PURPLE}[校验源] Size: $ori_size Bytes | MD5: $ori_md5${NC}"
        echo -e "${GREEN}✓ 编码完成${NC}"
    fi
}

# 执行解码逻辑 (含校验比对)
do_decode() {
    local input="$1"
    local output="$2"
    
    echo -e "${GREEN}正在处理: $input${NC}"
    base64 -d "$input" > "$output"
    
    if [ $? -eq 0 ]; then
        echo -e "${YELLOW}输出文件名: $output${NC}"
        
        # 计算新文件信息
        local info=$(get_file_info "$output")
        local cur_size=$(echo "$info" | cut -d'|' -f1)
        local cur_md5=$(echo "$info" | cut -d'|' -f2)
        echo -e "${PURPLE}[还原端] Size: $cur_size Bytes | MD5: $cur_md5${NC}"

        # 尝试比对校验文件
        if [ -f "${input}.md5" ]; then
            local check_info=$(cat "${input}.md5")
            if [ "$info" == "$check_info" ]; then
                echo -e "${GREEN}✓ 完整性校验通过！${NC}"
            else
                echo -e "${RED}✗ 校验失败：文件可能损坏或不匹配${NC}"
            fi
        else
            echo -e "${YELLOW}! 未找到 .md5 校验文件，跳过比对${NC}"
        fi
    fi
}

# --- 初始化与参数处理 ---
check_dependencies
[ $# -eq 0 ] && { show_help; exit 0; }

MODE="auto"; ENCRYPT_FNAME=0; FILENAME=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--encode) MODE="encode"; shift ;;
        -d|--decode) MODE="decode"; shift ;;
        -ef|--encrypt-fname) ENCRYPT_FNAME=1; shift ;;
        -h|--help) show_help; exit 0 ;;
        *) FILENAME="$1"; shift ;;
    esac
done

if [ ! -f "$FILENAME" ]; then
    echo -e "${RED}错误: 文件 '$FILENAME' 不存在${NC}"; exit 1
fi

# 路由分流
EXT="${FILENAME##*.}"
if [ "$MODE" == "encode" ] || { [ "$MODE" == "auto" ] && [ "$EXT" != "efb64" ] && [ "$EXT" != "b64" ]; }; then
    if [ $ENCRYPT_FNAME -eq 1 ]; then
        TARGET="$(urlsafe_base64_encode "$(basename "$FILENAME")").efb64"
    else
        TARGET="$(basename "$FILENAME").b64"
    fi
    do_encode "$FILENAME" "$TARGET"
else
    if [ "$EXT" == "efb64" ]; then
        TARGET=$(urlsafe_base64_decode "${FILENAME%.efb64}")
    else
        TARGET="${FILENAME%.b64}"
    fi
    do_decode "$FILENAME" "$TARGET"
fi