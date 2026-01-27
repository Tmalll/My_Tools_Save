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

get_md5() { md5sum "$1" | awk '{print $1}'; }
get_size() { stat -c %s "$1"; }

urlsafe_base64_encode() {
    echo -n "$1" | base64 | tr -d '\n' | sed 's/\+/-/g; s/\//_/g; s/=/ @/g' | tr -d ' '
}
urlsafe_base64_decode() {
    echo -n "$1" | sed 's/-/+/g; s/_/\//g; s/@/=/g' | base64 -d 2>/dev/null
}

show_help() {
    echo -e "${GREEN}Base64 编码/解码工具 (双重校验版)${NC}"
    echo "用法: $0 [选项] <文件名>"
    echo ""
    echo "选项:"
    echo "  -e, --encode         强制编码文件"
    echo "  -d, --decode         强制解码文件"
    echo "  -ef, --encrypt-fname 编码时加密文件名（输出 .efb64 文件）"
    echo "  -c, --check          解码时执行双重校验（需要 .md5 文件）"
    echo "  -nh, --nohash        编码时不生成校验文件"
    echo "  -h, --help           显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 document.txt                # 自动模式：编码"
    echo "  $0 document.txt.b64 -c         # 带校验解码"
}

# 执行编码
do_encode() {
    local input="$1"
    local output="$2"
    local no_hash="$3"
    
    echo -e "${GREEN}正在编码: $input${NC}"
    base64 "$input" > "$output"
    
    if [ "$no_hash" -eq 0 ]; then
        local s_size=$(get_size "$input")
        local s_md5=$(get_md5 "$input")
        local e_size=$(get_size "$output")
        local e_md5=$(get_md5 "$output")
        local m_file="${output}.md5"
        
        echo "SOURCE|$s_size|$s_md5" > "$m_file"
        echo "ENCODED|$e_size|$e_md5" >> "$m_file"
        
        echo -e "${YELLOW}输出文件: $output${NC}"
        echo -e "${PURPLE}[生成校验信息]${NC}"
        echo -e "${CYAN}  原始文件: $s_size|$s_md5${NC}"
        echo -e "${CYAN}  编码文件: $e_size|$e_md5${NC}"
        echo -e "${YELLOW}  校验文件名: $m_file${NC}"
        echo -e "${GREEN}✓ 编码完成，校验文件已生成${NC}"
    else
        echo -e "${YELLOW}输出文件: $output${NC}"
        echo -e "${GREEN}✓ 编码完成 (已跳过校验生成)${NC}"
    fi
    echo -e ""
}

# 执行解码
do_decode() {
    local input="$1"
    local output="$2"
    local do_check="$3"
    local md5_file="${input}.md5"

    if [ "$do_check" -eq 1 ]; then
        echo -e "${PURPLE}开始解码前校验:${NC}"
        if [ -f "$md5_file" ]; then
            local saved_enc_line=$(grep "^ENCODED|" "$md5_file")
            local saved_enc_info=$(echo "$saved_enc_line" | cut -d'|' -f2,3)
            local current_enc_info="$(get_size "$input")|$(get_md5 "$input")"
            
            echo -e "${GREEN}  - 校验编码文件: (Size+MD5)...${NC}"
            if [ "$saved_enc_info" == "$current_enc_info" ]; then
                echo -e "${CYAN}  - 校验通过: $current_enc_info${NC}"
                echo -e "${CYAN}  - 开始解码文件...${NC}"
            else
                echo -e "${RED}  - 校验不通过 - 解码终止...${NC}"
                echo -e "${RED}    当前值: $current_enc_info${NC}"
                echo -e "${RED}    目标值: $saved_enc_info${NC}"
                exit 1
            fi
        else
            echo -e "${RED}  - 校验发生错误: 未找到校验文件，终止解码。${NC}"
            exit 1
        fi
    fi

    echo -e "${GREEN}正在解码: $input${NC}"
    base64 -d "$input" > "$output"
    
    echo -e "${YELLOW}输出文件名: $output${NC}"
    echo -e "${GREEN}✓ 解码完成${NC}"
    
    if [ "$do_check" -eq 1 ] && [ -f "$md5_file" ]; then
        local saved_ori_line=$(grep "^SOURCE|" "$md5_file")
        local saved_ori_info=$(echo "$saved_ori_line" | cut -d'|' -f2,3)
        local current_ori_info="$(get_size "$output")|$(get_md5 "$output")"
        
        echo -e "${PURPLE}开始校验原始文件: (Size+MD5)...${NC}"
        if [ "$saved_ori_info" == "$current_ori_info" ]; then
            echo -e "${YELLOW}  - 源文件正常: $current_ori_info${NC}"
            echo -e "${GREEN}✓ 最终完整性校验通过！${NC}"
        else
            echo -e "${RED}✗ 最终校验失败：内容不一致${NC}"
            echo -e "${RED}当前值: $current_ori_info${NC}"
            echo -e "${RED}目标值: $saved_ori_info${NC}"
        fi
    fi
    echo -e ""
}

# --- 路由逻辑 ---
check_dependencies

# 如果没有任何参数，显示帮助并退出
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

MODE="auto"; ENCRYPT_FNAME=0; FILENAME=""; DO_CHECK=0; NO_HASH=0
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--encode) MODE="encode"; shift ;;
        -d|--decode) MODE="decode"; shift ;;
        -ef|--encrypt-fname) ENCRYPT_FNAME=1; shift ;;
        -c|--check) DO_CHECK=1; shift ;;
        -nh|--nohash) NO_HASH=1; shift ;;
        -h|--help) show_help; exit 0 ;;
        -*) echo -e "${RED}未知选项: $1${NC}"; show_help; exit 1 ;;
        *) FILENAME="$1"; shift ;;
    esac
done

# 如果只有选项没有文件名
if [ -z "$FILENAME" ]; then
    echo -e "${RED}错误: 未指定文件名${NC}"
    show_help
    exit 1
fi

EXT="${FILENAME##*.}"
if [ "$MODE" == "encode" ] || { [ "$MODE" == "auto" ] && [ "$EXT" != "efb64" ] && [ "$EXT" != "b64" ]; }; then
    [[ $ENCRYPT_FNAME -eq 1 ]] && T=$(urlsafe_base64_encode "$(basename "$FILENAME")").efb64 || T="$(basename "$FILENAME").b64"
    do_encode "$FILENAME" "$T" "$NO_HASH"
else
    [[ "$EXT" == "efb64" ]] && T=$(urlsafe_base64_decode "${FILENAME%.efb64}") || T="${FILENAME%.b64}"
    do_decode "$FILENAME" "$T" "$DO_CHECK"
fi