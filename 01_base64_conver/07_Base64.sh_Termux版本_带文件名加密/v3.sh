#!/usr/bin/env bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查依赖
check_dependencies() {
    if ! command -v base64 &> /dev/null; then
        echo -e "${RED}错误: 未找到 base64 命令${NC}"
        echo "请安装 coreutils 包来获取 base64 工具"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo -e "${GREEN}Base64 编码/解码工具 (跨平台静默覆盖版)${NC}"
    echo "用法: $0 [选项] <文件名>"
    echo ""
    echo "选项:"
    echo "  -e, --encode        强制编码文件"
    echo "  -d, --decode        强制解码文件"
    echo "  -ef, --encrypt-fname 编码时加密文件名（输出.efb64文件）"
    echo "  -h, --help          显示此帮助信息"
    echo ""
    echo "自动模式:"
    echo "  检测文件后缀自动选择编码或解码模式:"
    echo "  *.b64    → 普通解码（只解码内容，保留文件名）"
    echo "  *.efb64  → 加密解码（解码内容和文件名，兼容 Windows 版）"
    echo "  其他文件 → 普通编码（只编码内容，输出.b64文件）"
}

# 检查依赖
check_dependencies

# 检查参数
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

# 初始化变量
MODE="auto"        # auto, encode, decode
ENCRYPT_FNAME=0    # 是否加密文件名
FILENAME=""

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--encode)
            MODE="encode"
            shift
            ;;
        -d|--decode)
            MODE="decode"
            shift
            ;;
        -ef|--encrypt-fname)
            ENCRYPT_FNAME=1
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            echo -e "${RED}错误: 未知选项 $1${NC}"
            show_help
            exit 1
            ;;
        *)
            FILENAME="$1"
            shift
            ;;
    esac
done

# 如果没有指定文件名，显示帮助
if [ -z "$FILENAME" ]; then
    echo -e "${RED}错误: 请提供文件名${NC}"
    show_help
    exit 1
fi

# 检查文件是否存在
if [ ! -f "$FILENAME" ]; then
    echo -e "${RED}错误: 文件 '$FILENAME' 不存在${NC}"
    exit 1
fi

# --- 核心文件名处理逻辑 ---

# URL安全且符合 Windows 文件名逻辑的编码
urlsafe_base64_encode() {
    # 使用 tr 的另一种写法避免被误认为参数
    echo -n "$1" | base64 | tr -d '\n' | tr '+' '-' | tr '/' '_' | tr '=' '@'
}

# URL安全的base64解码 (还原文件名)
urlsafe_base64_decode() {
    # 同样拆开 tr 确保兼容性，并确保补位符还原
    echo -n "$1" | tr '-' '+' | tr '_' '/' | tr '@' '=' | base64 -d 2>/dev/null
}

# 普通编码函数（不加密文件名）
encode_normal() {
    local input_file="$1"
    local basename=$(basename "$input_file")
    local output_file="${basename}.b64"
    
    echo -e "${GREEN}正在普通编码文件: $input_file${NC}"
    echo -e "${BLUE}输出文件: $output_file${NC}"
    base64 "$input_file" > "$output_file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 普通编码完成${NC}"
    else
        echo -e "${RED}✗ 编码失败${NC}"
        exit 1
    fi
}

# 加密编码函数（加密文件名）
encode_encrypt() {
    local input_file="$1"
    local basename=$(basename "$input_file")
    
    local enc_name=$(urlsafe_base64_encode "$basename")
    local output_file="${enc_name}.efb64"
    
    echo -e "${GREEN}正在加密编码文件: $input_file${NC}"
    echo -e "${BLUE}输出文件: $output_file${NC}"
    base64 "$input_file" > "$output_file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 加密编码完成${NC}"
    else
        echo -e "${RED}✗ 编码失败${NC}"
        exit 1
    fi
}

# 普通解码函数（.b64文件）
decode_normal() {
    local input_file="$1"
    local basename=$(basename "$input_file")
    
    if [[ ! "$basename" =~ \.b64$ ]]; then
        echo -e "${RED}错误: 普通解码的文件必须以 .b64 结尾${NC}"
        exit 1
    fi
    
    local output_file="${basename%.b64}"
    
    echo -e "${GREEN}正在普通解码文件: $input_file${NC}"
    base64 -d "$input_file" > "$output_file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 普通解码完成${NC}"
    else
        echo -e "${RED}✗ 解码失败${NC}"
        exit 1
    fi
}

# 加密解码函数（.efb64文件）
decode_encrypt() {
    local input_file="$1"
    local basename=$(basename "$input_file")
    
    if [[ ! "$basename" =~ \.efb64$ ]]; then
        echo -e "${RED}错误: 加密解码的文件必须以 .efb64 结尾${NC}"
        exit 1
    fi
    
    local name_part="${basename%.efb64}"
    local output_file=$(urlsafe_base64_decode "$name_part")
    
    if [ -z "$output_file" ]; then
        echo -e "${RED}✗ 解码失败，无法解析文件名${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}正在加密解码文件: $input_file${NC}"
    echo -e "${BLUE}输出文件名: $output_file${NC}"
    base64 -d "$input_file" > "$output_file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 加密解码完成${NC}"
    else
        echo -e "${RED}✗ 解码失败${NC}"
        exit 1
    fi
}

# 根据模式执行操作
case $MODE in
    "encode")
        if [ $ENCRYPT_FNAME -eq 1 ]; then
            encode_encrypt "$FILENAME"
        else
            encode_normal "$FILENAME"
        fi
        ;;
    "decode")
        if [[ "$FILENAME" =~ \.efb64$ ]]; then
            decode_encrypt "$FILENAME"
        elif [[ "$FILENAME" =~ \.b64$ ]]; then
            decode_normal "$FILENAME"
        else
            echo -e "${RED}错误: 解码的文件必须是 .b64 或 .efb64 格式${NC}"
            exit 1
        fi
        ;;
    "auto")
        if [[ "$FILENAME" =~ \.efb64$ ]]; then
            decode_encrypt "$FILENAME"
        elif [[ "$FILENAME" =~ \.b64$ ]]; then
            decode_normal "$FILENAME"
        else
            if [ $ENCRYPT_FNAME -eq 1 ]; then
                encode_encrypt "$FILENAME"
            else
                encode_normal "$FILENAME"
            fi
        fi
        ;;
esac