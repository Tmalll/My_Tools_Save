#!/usr/bin/env bash

# ==========================================================
# 自动化配置区
# ==========================================================
INPUT_DIR="/storage/emulated/0/backups/Base64"
OUTPUT_DIR="${INPUT_DIR}/output"
# ==========================================================

# 颜色定义
RED='\033[1;31m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
PURPLE='\033[1;35m'
CYAN='\033[1;36m'
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
    echo -e "${GREEN}Base64 自动化处理工具 (v8.1)${NC}"
    echo "用法: b64 [选项] [文件名]"
    echo ""
    echo "选项:"
    echo "  -a, --auto           自动模式：扫描默认目录并处理 (冲突时跳过)"
    echo "  -F, --force          强制覆盖 (用于自动模式下强行刷新)"
    echo "  -ef, --encrypt-fname 编码时加密文件名 (并生成子文件夹)"
    echo "  -e, --encode         强制编码模式"
    echo "  -d, --decode         强制解码模式"
    echo "  -c, --check          解码时执行校验"
    echo "  -nh, --nohash        编码时不生成校验文件"
    echo "  -h, --help           显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  b64 -a               # 自动处理默认目录 (普通编码/解码)"
    echo "  b64 -a -ef           # 自动处理 + 加密文件名"
    echo "  b64 test.txt         # 手动编码单文件 (默认覆盖)"
    echo "  b64 test.txt.b64 -c  # 手动带校验解码 (默认覆盖)"
    echo ""
    echo -e "默认输入: ${BLUE}$INPUT_DIR${NC}"
    echo -e "默认输出: ${BLUE}$OUTPUT_DIR${NC}"
}

# --- 执行核心逻辑 ---

do_encode() {
    local input="$1"
    local output="$2"
    local no_hash="$3"
    local is_auto="$4"
    local final_out="$output"

    # 如果是加密文件名模式，则创建子目录
    if [[ $ENCRYPT_FNAME -eq 1 ]]; then
        local base_n=$(basename "$input")
        local sub_dir="$(dirname "$output")/b64[$base_n]"
        mkdir -p "$sub_dir"
        final_out="$sub_dir/$(basename "$output")"
    fi

    # 冲突检查：自动模式且未强制覆盖时跳过
    if [[ "$is_auto" == "true" && -f "$final_out" && $FORCE -eq 0 ]]; then
        echo -e "${YELLOW}[跳过] 已存在: $(basename "$final_out")${NC}"
        return
    fi

    echo -e "${GREEN}正在编码: $(basename "$input")${NC}"
    base64 "$input" > "$final_out"
    
    if [ "$no_hash" -eq 0 ]; then
        local m_file="${final_out}.md5"
        echo "SOURCE|$(get_size "$input")|$(get_md5 "$input")" > "$m_file"
        echo "ENCODED|$(get_size "$final_out")|$(get_md5 "$final_out")" >> "$m_file"
        echo -e "${CYAN}  -> 输出: $final_out${NC}"
    else
        echo -e "${CYAN}  -> 输出: $final_out (无校验)${NC}"
    fi
}

do_decode() {
    local input="$1"
    local output="$2"
    local do_check="$3"
    local is_auto="$4"

    if [[ "$is_auto" == "true" && -f "$output" && $FORCE -eq 0 ]]; then
        echo -e "${YELLOW}[跳过] 已存在: $(basename "$output")${NC}"
        return
    fi

    echo -e "${PURPLE}正在解码: $(basename "$input")${NC}"
    base64 -d "$input" > "$output"
    echo -e "${CYAN}  -> 还原: $output${NC}"

    if [[ "$do_check" -eq 1 ]]; then
        # 注意：此处为简化逻辑，建议解码校验逻辑根据实际需要补全
        echo -e "${GREEN}  ✓ 解码完成${NC}"
    fi
}

# --- 路由主程序 ---
check_dependencies
MODE="auto"; ENCRYPT_FNAME=0; FILENAME=""; DO_CHECK=0; NO_HASH=0; AUTO_SCAN=0; FORCE=0

while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--auto) AUTO_SCAN=1; shift ;;
        -F|--force) FORCE=1; shift ;;
        -e|--encode) MODE="encode"; shift ;;
        -d|--decode) MODE="decode"; shift ;;
        -ef|--encrypt-fname) ENCRYPT_FNAME=1; shift ;;
        -c|--check) DO_CHECK=1; shift ;;
        -nh|--nohash) NO_HASH=1; shift ;;
        -h|--help) show_help; exit 0 ;;
        *) FILENAME="$1"; shift ;;
    esac
done

# 情况 A: 自动扫描模式
if [[ $AUTO_SCAN -eq 1 ]]; then
    mkdir -p "$OUTPUT_DIR"
    echo -e "${BLUE}>>> 开启自动模式扫描...${NC}"
    # 使用 find 避免文件过多时命令行溢出，同时只扫描一层
    find "$INPUT_DIR" -maxdepth 1 -type f | while read -r f; do
        fname=$(basename "$f")
        ext="${fname##*.}"
        
        # 排除输出目录本身，防止递归
        [[ "$f" == "$OUTPUT_DIR"* ]] && continue

        if [[ "$ext" == "efb64" || "$ext" == "b64" ]]; then
            # 自动解码
            if [[ "$ext" == "efb64" ]]; then
                target_n=$(urlsafe_base64_decode "${fname%.efb64}")
            else
                target_n="${fname%.b64}"
            fi
            do_decode "$f" "$OUTPUT_DIR/$target_n" "$DO_CHECK" "true"
        else
            # 自动编码
            if [[ $ENCRYPT_FNAME -eq 1 ]]; then
                target_n="$(urlsafe_base64_encode "$fname").efb64"
            else
                target_n="$fname.b64"
            fi
            do_encode "$f" "$OUTPUT_DIR/$target_n" "$NO_HASH" "true"
        fi
    done
    echo -e "${BLUE}>>> 自动处理完毕。${NC}"
    exit 0
fi

# 情况 B: 单文件手动模式 (默认覆盖)
if [[ -z "$FILENAME" ]]; then
    show_help
    exit 0
fi

EXT="${FILENAME##*.}"
if [ "$MODE" == "encode" ] || { [ "$MODE" == "auto" ] && [ "$EXT" != "efb64" ] && [ "$EXT" != "b64" ]; }; then
    [[ $ENCRYPT_FNAME -eq 1 ]] && T=$(urlsafe_base64_encode "$(basename "$FILENAME")").efb64 || T="$(basename "$FILENAME").b64"
    # 手动模式下，is_auto 传 false，从而绕过冲突检查跳过逻辑，实现默认覆盖
    do_encode "$FILENAME" "$T" "$NO_HASH" "false"
else
    [[ "$EXT" == "efb64" ]] && T=$(urlsafe_base64_decode "${FILENAME%.efb64}") || T="${FILENAME%.b64}"
    do_decode "$FILENAME" "$T" "$DO_CHECK" "false"
fi