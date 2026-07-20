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
    echo -e "${GREEN}Base64 编码/解码工具${NC}"
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
    echo "  *.efb64  → 加密解码（解码内容和文件名）"
    echo "  其他文件 → 普通编码（只编码内容，输出.b64文件）"
    echo ""
    echo "示例:"
    echo "  $0 document.txt               # 普通编码 → document.txt.b64"
    echo "  $0 -ef secret.txt            # 加密编码 → [base64].efb64"
    echo "  $0 document.txt.b64          # 普通解码 → document.txt"
    echo "  $0 ZG9jdW1lbnQ=.dHh0.efb64   # 加密解码 → document.txt"
    echo "  $0 -e image.jpg              # 强制普通编码"
    echo "  $0 -d file.b64               # 强制普通解码"
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

# 获取文件名和扩展名
get_filename_parts() {
    local fullname="$1"
    local basename=$(basename "$fullname")
    
    # 检查是否有点号
    if [[ "$basename" == *.* ]]; then
        # 有点号的情况
        local name="${basename%.*}"
        local ext="${basename##*.}"
        echo "$name $ext"
    else
        # 没有点号的情况
        echo "$basename"
    fi
}

# URL安全的base64编码
urlsafe_base64_encode() {
    echo -n "$1" | base64 | tr -d '\n' | sed 's/+/-/g; s/\//_/g; s/=*$//'
}

# URL安全的base64解码
urlsafe_base64_decode() {
    local encoded="$1"
    # 补齐缺失的=号
    local padding=$((4 - ${#encoded} % 4))
    if [ $padding -ne 4 ]; then
        for ((i=0; i<padding; i++)); do
            encoded="${encoded}="
        done
    fi
    echo -n "$encoded" | sed 's/-/+/g; s/_/\//g' | base64 -d 2>/dev/null
}

# 普通编码函数（不加密文件名）
encode_normal() {
    local input_file="$1"
    local basename=$(basename "$input_file")
    local output_file="${basename}.b64"
    
    # 检查输出文件是否已存在
    if [ -f "$output_file" ]; then
        echo -e "${YELLOW}警告: 输出文件 '$output_file' 已存在${NC}"
        read -p "是否覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}操作已取消${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}正在普通编码文件: $input_file${NC}"
    echo -e "${BLUE}输出文件: $output_file${NC}"
    
    base64 "$input_file" > "$output_file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 普通编码完成${NC}"
        echo -e "文件大小: $(wc -c < "$output_file") 字节"
    else
        echo -e "${RED}✗ 编码失败${NC}"
        exit 1
    fi
}

# 加密编码函数（加密文件名）
encode_encrypt() {
    local input_file="$1"
    local parts=$(get_filename_parts "$input_file")
    local output_file
    
    if [ $(echo "$parts" | wc -w) -eq 2 ]; then
        # 有扩展名的情况
        local name=$(echo "$parts" | awk '{print $1}')
        local ext=$(echo "$parts" | awk '{print $2}')
        
        # 编码文件名和扩展名
        local encoded_name=$(urlsafe_base64_encode "$name")
        local encoded_ext=$(urlsafe_base64_encode "$ext")
        
        output_file="${encoded_name}.${encoded_ext}.efb64"
    else
        # 没有扩展名的情况
        local name="$parts"
        local encoded_name=$(urlsafe_base64_encode "$name")
        output_file="${encoded_name}.efb64"
    fi
    
    # 检查输出文件是否已存在
    if [ -f "$output_file" ]; then
        echo -e "${YELLOW}警告: 输出文件 '$output_file' 已存在${NC}"
        read -p "是否覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}操作已取消${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}正在加密编码文件: $input_file${NC}"
    echo -e "${BLUE}输出文件: $output_file${NC}"
    
    base64 "$input_file" > "$output_file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 加密编码完成${NC}"
        echo -e "文件大小: $(wc -c < "$output_file") 字节"
    else
        echo -e "${RED}✗ 编码失败${NC}"
        exit 1
    fi
}

# 普通解码函数（.b64文件）
decode_normal() {
    local input_file="$1"
    local basename=$(basename "$input_file")
    
    # 检查是否以 .b64 结尾
    if [[ ! "$basename" =~ \.b64$ ]]; then
        echo -e "${RED}错误: 普通解码的文件必须以 .b64 结尾${NC}"
        exit 1
    fi
    
    # 移除 .b64 后缀
    local output_file="${basename%.b64}"
    
    # 检查输出文件是否已存在
    if [ -f "$output_file" ]; then
        echo -e "${YELLOW}警告: 输出文件 '$output_file' 已存在${NC}"
        read -p "是否覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}操作已取消${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}正在普通解码文件: $input_file${NC}"
    echo -e "${BLUE}输出文件: $output_file${NC}"
    
    base64 -d "$input_file" > "$output_file"
    
    if [ $? -eq 0 ] && [ -s "$output_file" ]; then
        echo -e "${GREEN}✓ 普通解码完成${NC}"
        echo -e "文件大小: $(wc -c < "$output_file") 字节"
    else
        echo -e "${RED}✗ 解码失败，文件可能不是有效的base64编码${NC}"
        [ -f "$output_file" ] && rm "$output_file"
        exit 1
    fi
}

# 加密解码函数（.efb64文件）
decode_encrypt() {
    local input_file="$1"
    local basename=$(basename "$input_file")
    
    # 检查是否以 .efb64 结尾
    if [[ ! "$basename" =~ \.efb64$ ]]; then
        echo -e "${RED}错误: 加密解码的文件必须以 .efb64 结尾${NC}"
        exit 1
    fi
    
    # 移除 .efb64 后缀
    local without_efb64="${basename%.efb64}"
    
    # 检查剩下的部分是否包含点号
    if [[ "$without_efb64" == *.* ]]; then
        # 有点号的情况，分隔文件名和扩展名
        local encoded_name="${without_efb64%.*}"
        local encoded_ext="${without_efb64##*.}"
        
        # 解码文件名和扩展名
        local name=$(urlsafe_base64_decode "$encoded_name")
        local ext=$(urlsafe_base64_decode "$encoded_ext")
        
        # 检查解码是否成功
        if [ -z "$name" ] || [ -z "$ext" ]; then
            echo -e "${RED}✗ 解码失败，无法解码文件名${NC}"
            exit 1
        fi
        
        local output_file="${name}.${ext}"
    else
        # 没有点号的情况，直接解码整个文件名
        local name=$(urlsafe_base64_decode "$without_efb64")
        
        # 检查解码是否成功
        if [ -z "$name" ]; then
            echo -e "${RED}✗ 解码失败，无法解码文件名${NC}"
            exit 1
        fi
        
        local output_file="$name"
    fi
    
    # 检查输出文件是否已存在
    if [ -f "$output_file" ]; then
        echo -e "${YELLOW}警告: 输出文件 '$output_file' 已存在${NC}"
        read -p "是否覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}操作已取消${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}正在加密解码文件: $input_file${NC}"
    echo -e "${BLUE}输出文件: $output_file${NC}"
    
    base64 -d "$input_file" > "$output_file"
    
    if [ $? -eq 0 ] && [ -s "$output_file" ]; then
        echo -e "${GREEN}✓ 加密解码完成${NC}"
        echo -e "文件大小: $(wc -c < "$output_file") 字节"
    else
        echo -e "${RED}✗ 解码失败，文件可能不是有效的base64编码${NC}"
        [ -f "$output_file" ] && rm "$output_file"
        exit 1
    fi
}

# 根据模式执行操作
case $MODE in
    "encode")
        # 强制编码
        if [ $ENCRYPT_FNAME -eq 1 ]; then
            encode_encrypt "$FILENAME"
        else
            encode_normal "$FILENAME"
        fi
        ;;
    "decode")
        # 强制解码，需要根据文件后缀判断类型
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
        # 自动判断模式
        if [[ "$FILENAME" =~ \.efb64$ ]]; then
            decode_encrypt "$FILENAME"
        elif [[ "$FILENAME" =~ \.b64$ ]]; then
            decode_normal "$FILENAME"
        else
            # 自动编码
            if [ $ENCRYPT_FNAME -eq 1 ]; then
                encode_encrypt "$FILENAME"
            else
                encode_normal "$FILENAME"
            fi
        fi
        ;;
esac