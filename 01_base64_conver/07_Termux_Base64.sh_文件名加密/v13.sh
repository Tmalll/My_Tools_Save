#!/usr/bin/env bash

# ==========================================================
# 自动化配置区
# ==========================================================
# 默认自动模式的路径
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
    echo -e "${GREEN}Base64 自动化处理工具 (v9.5)${NC}"
    echo "用法: b64 [选项] [文件或文件夹路径]"
    echo ""
    echo "模式选项:"
    echo "  -a, --auto           自动模式：扫描默认 $INPUT_DIR"
    echo "  -d, --dir            文件夹模式：扫描指定路径，并在其下创建 output"
    echo ""
    echo "功能选项:"
    echo "  -ec, --encode        强制编码模式"
    echo "  -dc, --decode        强制解码模式"
    echo "  -ef, --encrypt-fname 编码加密文件名 (生成 efb64[文件名] 子文件夹)"
    echo "  -c, --check          执行 MD5 校验"
    echo "  -f, -F, --force      强制覆盖 (默认跳过已存在文件)"
    echo "  -nh, --nohash        编码时不生成校验文件"
    echo "  -h, --help           显示此帮助信息"
}

# --- 执行核心逻辑 ---

do_encode() {
    local input="$1"
    local out_dir="$2"
    local no_hash="$3"
    local skip_check="$4"
    local final_out

    if [[ $ENCRYPT_FNAME -eq 1 ]]; then
        local base_n=$(basename "$input")
        local sub_dir="$out_dir/efb64[$base_n]"
        mkdir -p "$sub_dir"
        final_out="$sub_dir/$(basename "$input").b64"
    else
        final_out="$out_dir/$(basename "$input").b64"
    fi

    if [[ "$skip_check" == "true" && -f "$final_out" && $FORCE -eq 0 ]]; then
        echo -e "${YELLOW}[跳过] 已存在: $(basename "$final_out")${NC}"
        return
    fi

    echo -e "${GREEN}正在编码: $(basename "$input")${NC}"
    base64 "$input" > "$final_out"
    
    if [[ "$no_hash" -eq 0 ]]; then
        local m_file="${final_out}.md5"
        echo "SOURCE|$(get_size "$input")|$(get_md5 "$input")" > "$m_file"
        echo "ENCODED|$(get_size "$final_out")|$(get_md5 "$final_out")" >> "$m_file"
    fi
}

do_decode() {
    local input="$1"
    local out_dir="$2"
    local do_check="$3"
    local skip_check="$4"
    local md5_file="${input}.md5"
    
    # 内部精简解析 target_n
    local fname=$(basename "$input")
    local ext="${fname##*.}"
    local target_n
    [[ "$ext" == "efb64" ]] && target_n=$(urlsafe_base64_decode "${fname%.efb64}") || target_n="${fname%.b64}"
    local final_out="$out_dir/$target_n"

    if [[ "$skip_check" == "true" && -f "$final_out" && $FORCE -eq 0 ]]; then
        echo -e "${YELLOW}[跳过] 已存在: $(basename "$final_out")${NC}"
        return
    fi

    if [[ "$do_check" -eq 1 && -f "$md5_file" ]]; then
        local saved_enc_info=$(grep "^ENCODED|" "$md5_file" | cut -d'|' -f2,3)
        local current_enc_info="$(get_size "$input")|$(get_md5 "$input")"
        if [[ "$saved_enc_info" != "$current_enc_info" ]]; then
            echo -e "${RED}[校验失败] 跳过: $input${NC}"
            return
        fi
    fi

    echo -e "${PURPLE}正在解码: $fname${NC}"
    base64 -d "$input" > "$final_out"

    if [[ "$do_check" -eq 1 && -f "$md5_file" ]]; then
        local saved_ori_info=$(grep "^SOURCE|" "$md5_file" | cut -d'|' -f2,3)
        local current_ori_info="$(get_size "$final_out")|$(get_md5 "$final_out")"
        [[ "$saved_ori_info" == "$current_ori_info" ]] && echo -e "${CYAN}  ✓ 完整性 OK${NC}" || echo -e "${RED}  ✗ 完整性破坏${NC}"
    fi
}

# --- 路由主程序 ---
check_dependencies
MODE="auto"; ENCRYPT_FNAME=0; PATH_ARG=""; DO_CHECK=0; NO_HASH=0; AUTO_SCAN=0; FORCE=0; DIR_MODE=0

while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--auto) AUTO_SCAN=1; shift ;;
        -d|--dir) DIR_MODE=1; shift ;;
        -f|-F|--force) FORCE=1; shift ;; 
        -ec|--encode) MODE="encode"; shift ;;
        -dc|--decode) MODE="decode"; shift ;;
        -ef|--encrypt-fname) ENCRYPT_FNAME=1; shift ;;
        -c|--check) DO_CHECK=1; shift ;;
        -nh|--nohash) NO_HASH=1; shift ;;
        -h|--help) show_help; exit 0 ;;
        -*) echo -e "${RED}未知参数: $1${NC}"; exit 1 ;;
        *) PATH_ARG="$1"; shift ;;
    esac
done

# --- 核心递归处理逻辑 ---
if [[ $AUTO_SCAN -eq 1 || ($DIR_MODE -eq 1 && -d "$PATH_ARG") ]]; then
    if [[ $AUTO_SCAN -eq 1 ]]; then
        CURRENT_IN="$INPUT_DIR"
        CURRENT_OUT="$OUTPUT_DIR"
    else
        CURRENT_IN="${PATH_ARG%/}"
        CURRENT_OUT="$CURRENT_IN/output"
    fi

    mkdir -p "$CURRENT_OUT"
    echo -e "${BLUE}>>> 扫描目录: $CURRENT_IN${NC}"
    echo -e "${BLUE}>>> 输出目录: $CURRENT_OUT${NC}"
    
    find "$CURRENT_IN" -path "$CURRENT_OUT" -prune -o -type f -print | while read -r f; do
        fname=$(basename "$f")
        ext="${fname##*.}"
        [[ "$ext" == "md5" ]] && continue
        
        if [[ "$ext" == "efb64" || "$ext" == "b64" ]]; then
            do_decode "$f" "$CURRENT_OUT" "$DO_CHECK" "true"
        else
            do_encode "$f" "$CURRENT_OUT" "$NO_HASH" "true"
        fi
    done
    echo -e "${BLUE}>>> 处理完毕。${NC}"
    exit 0

# C. 单文件/手动模式
elif [[ -f "$PATH_ARG" ]]; then
    D_OUT="$(dirname "$PATH_ARG")/output"
    mkdir -p "$D_OUT"
    
    BASE_NAME=$(basename "$PATH_ARG")
    EXT="${BASE_NAME##*.}"
    if [[ "$MODE" == "encode" ]] || { [[ "$MODE" == "auto" ]] && [[ "$EXT" != "efb64" && "$EXT" != "b64" ]]; }; then
        [[ "$EXT" == "md5" ]] && { echo -e "${RED}跳过 MD5${NC}"; exit 1; }
        do_encode "$PATH_ARG" "$D_OUT" "$NO_HASH" "false"
    else
        do_decode "$PATH_ARG" "$D_OUT" "$DO_CHECK" "false"
    fi
else
    [[ $AUTO_SCAN -eq 0 ]] && show_help
fi