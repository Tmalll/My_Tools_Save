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

# 检查依赖
check_dependencies() {
    for cmd in base64 md5sum stat sed; do
        if ! command -v $cmd &> /dev/null; then
            echo -e "${RED}错误: 未找到 $cmd 命令${NC}"
            exit 1
        fi
    done
}

get_md5() { md5sum "$1" | awk '{print $1}'; }
get_size() { stat -c %s "$1"; }


# 文件名编码安全替换
urlsafe_base64_encode() {
    echo -n "$1" | base64 | sed 's/+/-/g; s/\//_/g; s/=/@/g' | tr -d '\n'
}
urlsafe_base64_decode() {
    echo -n "$1" | sed 's/-/+/g; s/_/\//g; s/@/=/g' | base64 -d 2>/dev/null
}

show_help() {
    echo -e "${PURPLE}Base64 自动化处理工具 (v17)${NC}"
    echo -e "${GREEN}[自动模式]:"    
    echo -e "  用法: b64 -a [其他参数]"
    echo -e "        b64 -a -ef 就会自动编码或解码默认目录(在脚本内设置), 输出到[默认目录下/output]目录"
    echo -e "  比如: $INPUT_DIR 内的文件到:"
    echo -e "        $OUTPUT_DIR" 
    echo -e "  备注: 会自动扫描除了 output 文件夹之外的子文件夹和文件."
    echo -e "        根据文件名判断是解码还是编码, .b64|.efb64 > 解码, 其他文件 > 编码."
    echo ""
    echo -e "  -a, --auto           自动模式：扫描默认目录: $INPUT_DIR"
    echo -e "                                 并根据文件类型进行 编码 or 转码"
    echo -e "                                 结果输出到: $OUTPUT_DIR"
    echo ""
    echo -e "${CYAN}[目录模式]:"
    echo -e "   用法: b64 -d /root -ef 就会自动编码或解码 /root 目录下除了[output]文件夹外的所有文件, 输出到[output}目录"
    echo -e "   备注: 包括子文件夹 (处理逻辑同 -a 自动模式)"
    echo -e ""
    echo -e "  -d, --dir            文件夹模式：扫描指定路径，并在其下创建 output"
    echo -e "                                   处理逻辑同 -a 自动模式"
    echo -e ""
    echo -e "${YELLOW}[手动模式]:"
    echo -e "   需要指定目标路径: b64 ./test.bin -ef"
    echo -e "       -ec, --encode        强制编码模式"
    echo -e "       -dc, --decode        强制解码模式"
    echo -e "       -ef, --encrypt-fname 编码加密文件名 (生成 #efb64[...] 文件夹 + .efb64 文件)"
    echo -e "       -c, --check          执行详细双重校验（显示详细对比信息）"
    echo -e "       -f, -F, --force      强制覆盖 (默认跳过已存在文件)"
    echo -e "       -nh, --nohash        编码时不生成校验文件"
    echo -e "       -w, --wrap [数字]    换行设置: 不带数字默认为 0(不换行), 默认不使用此参数为 76"
    echo -e "       -h, --help           显示此帮助信息"
}

# --- 执行编码 (全路径显示版) ---
do_encode() {
    local input="$1"
    local out_dir="$2"
    local no_hash="$3"
    local skip_check="$4"
    local final_out
    local base_n=$(basename "$input")

    if [[ $ENCRYPT_FNAME -eq 1 ]]; then
        local sub_dir="$out_dir/#efb64[$base_n]"
        mkdir -p "$sub_dir"
        local enc_n=$(urlsafe_base64_encode "$base_n")
        final_out="$sub_dir/${enc_n}.efb64"
    else
        final_out="$out_dir/${base_n}.b64"
    fi

    if [[ "$skip_check" == "true" && -f "$final_out" && $FORCE -eq 0 ]]; then
        echo -e "${YELLOW}[跳过] 已存在: $final_out${NC}"
        return
    fi

    # 输出反馈：使用完整路径
    echo -e "${GREEN}正在编码: $base_n${NC}"
    echo -e "  - 输出路径: ${YELLOW}$final_out${NC}"
    
    # base64 "$input" > "$final_out"
    base64 -w "$WRAP_VAL" "$input" > "$final_out"
    
    if [[ "$no_hash" -eq 0 ]]; then
        local m_file="${final_out}.md5"
        echo "SOURCE|$(get_size "$input")|$(get_md5 "$input")" > "$m_file"
        echo "ENCODED|$(get_size "$final_out")|$(get_md5 "$final_out")" >> "$m_file"
        echo -e "  - 校验文件: ${CYAN}$m_file${NC}"
    fi
}

# --- 执行解码 ---
do_decode() {
    local input="$1"
    local out_dir="$2"
    local do_check="$3"
    local skip_check="$4"
    local md5_file="${input}.md5"
    
    local fname=$(basename "$input")
    local ext="${fname##*.}"
    local target_n
    
    if [[ "$ext" == "efb64" ]]; then
        target_n=$(urlsafe_base64_decode "${fname%.efb64}")
    else
        target_n="${fname%.b64}"
    fi
    local final_out="$out_dir/$target_n"

    if [[ "$skip_check" == "true" && -f "$final_out" && $FORCE -eq 0 ]]; then
        local cur_size=$(get_size "$final_out")
        local ori_size="0"
        [[ -f "$md5_file" ]] && ori_size=$(grep "^SOURCE|" "$md5_file" | cut -d'|' -f2)

        echo -e "${YELLOW}[跳过] 已存在: $final_out${NC}"
        echo -e "  - 原大小: $ori_size"
        echo -e "  - 现大小: $cur_size"
        if [[ "$ori_size" == "$cur_size" ]]; then
            echo -e "  - ${GREEN}大小一致 | 文件正常!${NC}"
        else
            echo -e "  - ${RED}大小错误 | 文件异常!${NC}"
        fi
        return
    fi

    if [[ "$do_check" -eq 1 ]]; then
        echo -e "${PURPLE}正在校验编码文件: ${YELLOW}$input${NC}"        
        if [[ -f "$md5_file" ]]; then
            local saved_enc_info=$(grep "^ENCODED|" "$md5_file" | cut -d'|' -f2,3)
            local current_enc_info="$(get_size "$input")|$(get_md5 "$input")"
            echo -e "${CYAN}  - 当前文件: $current_enc_info${NC}"
            echo -e "${CYAN}  - 记录信息: $saved_enc_info${NC}"
            if [[ "$saved_enc_info" == "$current_enc_info" ]]; then
                echo -e "${GREEN}  - 预校验通过${NC}"
            else
                echo -e "${RED}  - 预校验发生错误 - 解码终止${NC}"
                return
            fi
        else
            echo -e "${RED}  - 跳过预校验: 未找到 MD5 文件${NC}"
        fi
    fi

    echo -e "${GREEN}正在解码: $fname${NC}"
    echo -e "  - 输出路径: ${YELLOW}$final_out${NC}"
    base64 -d "$input" > "$final_out"

    if [[ "$do_check" -eq 1 && -f "$md5_file" ]]; then
        local saved_ori_info=$(grep "^SOURCE|" "$md5_file" | cut -d'|' -f2,3)
        local current_ori_info="$(get_size "$final_out")|$(get_md5 "$final_out")"
        echo -e "${PURPLE}校验原始文件: ${NC}"
        echo -e "${CYAN}  - 当前文件: $current_ori_info${NC}"
        echo -e "${CYAN}  - 记录信息: $saved_ori_info${NC}"
        if [[ "$saved_ori_info" == "$current_ori_info" ]]; then
            echo -e "${GREEN}  - 源文件正常${NC}"
            echo -e "${GREEN}✓ 最终校验通过! 解码完成! ${NC}"
        else
            echo -e "${RED}  - 源文件错误${NC}"
            echo -e "${RED}× 最终校验失败! 文件损坏! 解码失败! ${NC}"
        fi
    fi
}

# --- 路由主程序 ---
check_dependencies
MODE="auto"; ENCRYPT_FNAME=0; PATH_ARG=""; DO_CHECK=0; NO_HASH=0; AUTO_SCAN=0; FORCE=0; DIR_MODE=0
WRAP_VAL=76  # 新增：默认换行值


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
        -w|--wrap)
            if [[ -n "$2" && "$2" =~ ^[0-9]+$ ]]; then
                WRAP_VAL="$2"
                shift 2
            else
                WRAP_VAL=0
                shift
            fi
            ;;
        -h|--help) show_help; exit 0 ;;
        -*) echo -e "${RED}未知参数: $1${NC}"; show_help; exit 1 ;;
        *) PATH_ARG="$1"; shift ;;
    esac
done


if [[ $AUTO_SCAN -eq 1 || ($DIR_MODE -eq 1 && -d "$PATH_ARG") ]]; then
    if [[ $AUTO_SCAN -eq 1 ]]; then
        CURRENT_IN="$INPUT_DIR"; CURRENT_OUT="$OUTPUT_DIR"
    else
        CURRENT_IN="${PATH_ARG%/}"; CURRENT_OUT="$CURRENT_IN/output"
    fi
    mkdir -p "$CURRENT_OUT"
    echo -e "${BLUE}>>> 扫描目录: $CURRENT_IN${NC}"
    echo -e "${BLUE}>>> 输出目录: $CURRENT_OUT${NC}"

    find "$CURRENT_IN" -path "$CURRENT_OUT" -prune -o -type f -print | while read -r f; do
        fname=$(basename "$f"); ext="${fname##*.}"
        [[ "$ext" == "md5" ]] && continue
        if [[ "$ext" == "efb64" || "$ext" == "b64" ]]; then
            do_decode "$f" "$CURRENT_OUT" "$DO_CHECK" "true"
        else
            do_encode "$f" "$CURRENT_OUT" "$NO_HASH" "true"
        fi
    done
    echo -e "${BLUE}>>> 处理完毕。${NC}"
    exit 0
elif [[ -f "$PATH_ARG" ]]; then
    # 手动模式全路径处理：将相对路径转换为绝对路径增强反馈感
    ABS_PATH=$(realpath "$PATH_ARG")
    D_OUT="$(dirname "$ABS_PATH")"
    BASE_NAME=$(basename "$ABS_PATH"); EXT="${BASE_NAME##*.}"
    if [[ "$MODE" == "encode" ]] || { [[ "$MODE" == "auto" ]] && [[ "$EXT" != "efb64" && "$EXT" != "b64" ]]; }; then
        [[ "$EXT" == "md5" ]] && exit 1
        do_encode "$ABS_PATH" "$D_OUT" "$NO_HASH" "false"
    else
        do_decode "$ABS_PATH" "$D_OUT" "$DO_CHECK" "false"
    fi

# 默认直接运行脚本时
else
    # 直接运行脚本且未提供参数时触发
    show_help
    echo ""
    
    CONFIRM_COUNT=0
    ERR_COUNT=0

    # 循环捕捉 3 次有效输入
    while [[ $CONFIRM_COUNT -lt 3 ]]; do
        case $CONFIRM_COUNT in
            0) MSG="3" ;;
            1) MSG="2" ;;
            2) MSG="1 (再按就开始了)" ;;
        esac

        echo -ne "${GREEN}按 A / 空格 / 回车 继续执行自动模式!${NC} | ${CYAN}按 X 或 ESC 退出返回终端... $MSG ${NC}"
        
        # 使用 -s 隐藏输入，-n 1 只读取一个字符，无需回车
        # -d $'\e' 用于捕获 ESC 键
        read -s -n 1 char
        
        # 转换大小写处理
        char_up=$(echo "$char" | tr '[:lower:]' '[:upper:]')

        # 1. 处理退出键 (X 或 ESC)
        # 注: Bash 中 ESC 键读入通常为空或 \e
        if [[ "$char_up" == "X" || "$char" == $'\e' ]]; then
            echo -e "\n${RED}已退出返回终端。${NC}"
            exit 0
        fi

        # 2. 处理有效确认键 (A, 空格, 或 直接回车)
        # 回车在 read -n 1 下可能表现为空值
        if [[ "$char_up" == "A" || "$char" == " " || "$char" == "" ]]; then
            ((CONFIRM_COUNT++))
            ERR_COUNT=0
            echo -e " ${GREEN}[确认]${NC}"
        else
            # 3. 处理错误按键
            ((ERR_COUNT++))
            echo -e "\n${YELLOW}按键错误！${NC}"
            if [[ $ERR_COUNT -ge 3 ]]; then
                echo -e "${RED}错误次数过多，返回终端。${NC}"
                exit 1
            fi
        fi
    done

    # 验证通过，执行自动模式
    echo -e "\n${GREEN}>>> 验证通过，启动自动模式...${NC}"
    # --- 自动模式执行体 ---
    CURRENT_IN="$INPUT_DIR"; CURRENT_OUT="$OUTPUT_DIR"
    mkdir -p "$CURRENT_OUT"
    echo -e "${BLUE}>>> 扫描目录: $CURRENT_IN${NC}"
    echo -e "${BLUE}>>> 输出目录: $CURRENT_OUT${NC}"

    find "$CURRENT_IN" -path "$CURRENT_OUT" -prune -o -type f -print | while read -r f; do
        fname=$(basename "$f"); ext="${fname##*.}"
        [[ "$ext" == "md5" ]] && continue
        if [[ "$ext" == "efb64" || "$ext" == "b64" ]]; then
            do_decode "$f" "$CURRENT_OUT" "$DO_CHECK" "true"
        else
            do_encode "$f" "$CURRENT_OUT" "$NO_HASH" "true"
        fi
    done
    echo -e "${BLUE}>>> 处理完毕。${NC}"
    exit 0
fi