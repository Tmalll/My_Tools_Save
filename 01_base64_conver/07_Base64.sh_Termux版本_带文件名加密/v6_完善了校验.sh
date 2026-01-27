#!/usr/bin/env bash

# 颜色定义
RED='\033[1;31m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
PURPLE='\033[1;35m'
CYAN='\033[1;36m'   # 淡蓝色
NC='\033[0m'

check_dependencies() {
    for cmd in base64 md5sum stat; do
        if ! command -v $cmd &> /dev/null; then
            echo -e "${RED}错误: 未找到 $cmd 命令${NC}"
            exit 1
        fi
    done
}

# 获取文件指纹
get_md5() { md5sum "$1" | awk '{print $1}'; }
get_size() { stat -c %s "$1"; }

# URL安全编码/解码
urlsafe_base64_encode() {
    echo -n "$1" | base64 | tr -d '\n' | sed 's/\+/-/g; s/\//_/g; s/=/ @/g' | tr -d ' '
}
urlsafe_base64_decode() {
    echo -n "$1" | sed 's/-/+/g; s/_/\//g; s/@/=/g' | base64 -d 2>/dev/null
}

# 执行编码
do_encode() {
    local input="$1"
    local output="$2"
    
    local s_size=$(get_size "$input")
    local s_md5=$(get_md5 "$input")

    echo -e "${GREEN}正在编码: $input${NC}"
    base64 "$input" > "$output"
    
    local e_size=$(get_size "$output")
    local e_md5=$(get_md5 "$output")
    
    # 写入增强格式校验文件
    echo "SOURCE|$s_size|$s_md5" > "${output}.md5"
    echo "ENCODED|$e_size|$e_md5" >> "${output}.md5"
    
    echo -e "${YELLOW}输出文件: $output${NC}"
    echo -e "${PURPLE}[生成校验信息]${NC}"
    echo -e "${CYAN}  原始文件: $s_size|$s_md5${NC}"
    echo -e "${CYAN}  编码文件: $e_size|$e_md5${NC}"
    echo -e "${GREEN}✓ 编码完成，校验文件已生成${NC}"
    echo -e ""
}

# 执行解码
do_decode() {
    local input="$1"
    local output="$2"
    local md5_file="${input}.md5"
    
    echo -e "${GREEN}正在解码: $input${NC}"

    # 1. 解码前校验 (阶段 1)
    if [ -f "$md5_file" ]; then
        local saved_enc_line=$(grep "^ENCODED|" "$md5_file")
        local saved_enc_info=$(echo "$saved_enc_line" | cut -d'|' -f2,3)
        
        local current_size=$(get_size "$input")
        local current_md5=$(get_md5 "$input")
        local current_enc_info="${current_size}|${current_md5}"
        
        echo -e "${PURPLE}  - 校验编码文件: (Size+MD5)...${NC}"
        if [ "$saved_enc_info" == "$current_enc_info" ]; then
            echo -e "${CYAN}  - 校验通过: $current_enc_info${NC}"
            echo -e "${GREEN}  - 开始解码文件...${NC}"
        else
            echo -e "${RED}  - 校验发生错误${NC}"
            echo -e "${RED}  - md5值错误解码终止...${NC}"
            # 按照要求修改为 当前值 和 目标值
            echo -e "${CYAN}    当前值: $current_enc_info${NC}"
            echo -e "${CYAN}    目标值: $saved_enc_info${NC}"
            exit 1
        fi
    fi

    # 2. 执行解码
    base64 -d "$input" > "$output"
    
    # 3. 解码后校验 (阶段 2)
    echo -e "${YELLOW}输出文件名: $output${NC}"
    echo -e "${GREEN}  - 解码完成${NC}"
    
    if [ -f "$md5_file" ]; then
        local saved_ori_line=$(grep "^SOURCE|" "$md5_file")
        local saved_ori_info=$(echo "$saved_ori_line" | cut -d'|' -f2,3)
        
        local current_ori_size=$(get_size "$output")
        local current_ori_md5=$(get_md5 "$output")
        local current_ori_info="${current_ori_size}|${current_ori_md5}"
        
        echo -e "${PURPLE}  - 校验原始文件: (Size+MD5)...${NC}"
        if [ "$saved_ori_info" == "$current_ori_info" ]; then
            echo -e "${CYAN}  - 源文件正常: $current_ori_info${NC}"
            echo -e "${GREEN}✓ 最终完整性校验通过！${NC}"
        else
            echo -e "${RED}✗ 最终校验失败：内容不一致${NC}"
            echo -e "${CYAN}    当前值: $saved_ori_info${NC}"
            echo -e "${CYAN}    目标值: $current_ori_info${NC}"
        fi
    else
        echo -e "${YELLOW}! 未找到校验文件，跳过比对${NC}"
    fi
    echo -e ""
}

# --- 路由逻辑 ---
check_dependencies
[ $# -eq 0 ] && exit 0

MODE="auto"; ENCRYPT_FNAME=0; FILENAME=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--encode) MODE="encode"; shift ;;
        -d|--decode) MODE="decode"; shift ;;
        -ef|--encrypt-fname) ENCRYPT_FNAME=1; shift ;;
        *) FILENAME="$1"; shift ;;
    esac
done

EXT="${FILENAME##*.}"
if [ "$MODE" == "encode" ] || { [ "$MODE" == "auto" ] && [ "$EXT" != "efb64" ] && [ "$EXT" != "b64" ]; }; then
    [[ $ENCRYPT_FNAME -eq 1 ]] && T=$(urlsafe_base64_encode "$(basename "$FILENAME")").efb64 || T="$(basename "$FILENAME").b64"
    do_encode "$FILENAME" "$T"
else
    [[ "$EXT" == "efb64" ]] && T=$(urlsafe_base64_decode "${FILENAME%.efb64}") || T="${FILENAME%.b64}"
    do_decode "$FILENAME" "$T"
fi