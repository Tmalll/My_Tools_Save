#!/data/data/com.termux/files/usr/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo -e "${GREEN}Base64 编码/解码工具${NC}"
    echo "用法: $0 [选项] <文件名>"
    echo ""
    echo "选项:"
    echo "  -e, --encode    强制编码文件"
    echo "  -d, --decode    强制解码文件"
    echo "  -h, --help      显示此帮助信息"
    echo ""
    echo "自动模式:"
    echo "  如果文件扩展名为 .b64，则自动解码"
    echo "  否则自动编码"
    echo ""
    echo "示例:"
    echo "  $0 document.txt         # 编码为 document.txt.b64"
    echo "  $0 image.jpg            # 编码为 image.jpg.b64"
    echo "  $0 document.txt.b64     # 自动解码为 document.txt"
    echo "  $0 -e image.jpg         # 强制编码，即使文件名为.b64"
    echo "  $0 -d document.txt.b64  # 强制解码"
}

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${RED}错误: 请提供文件名${NC}"
    show_help
    exit 1
fi

# 初始化变量
MODE="auto"  # auto, encode, decode
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

# URL安全的base64编码（使用sed而不是tr来处理下划线）
urlsafe_base64_encode() {
    echo -n "$1" | base64 | tr -d '\n' | sed 's/+/-/g; s/\//_/g; s/=*$//'
}

# URL安全的base64解码（使用sed而不是tr来处理下划线）
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

# 编码函数
encode_file() {
    local input_file="$1"
    local parts=$(get_filename_parts "$input_file")
    
    if [ $(echo "$parts" | wc -w) -eq 2 ]; then
        # 有扩展名的情况
        local name=$(echo "$parts" | awk '{print $1}')
        local ext=$(echo "$parts" | awk '{print $2}')
        
        # 编码文件名和扩展名
        local encoded_name=$(urlsafe_base64_encode "$name")
        local encoded_ext=$(urlsafe_base64_encode "$ext")
        
        local output_file="${encoded_name}.${encoded_ext}.b64"
    else
        # 没有扩展名的情况
        local name="$parts"
        local encoded_name=$(urlsafe_base64_encode "$name")
        local output_file="${encoded_name}.b64"
    fi
    
    # 编码文件内容
    echo -e "${GREEN}正在编码文件: $input_file${NC}"
    base64 "$input_file" > "$output_file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 编码完成${NC}"
        echo -e "${YELLOW}输出文件: $output_file${NC}"
        echo -e "文件大小: $(wc -c < "$output_file") 字节"
    else
        echo -e "${RED}✗ 编码失败${NC}"
        exit 1
    fi
}

# 解码函数
decode_file() {
    local input_file="$1"
    local basename=$(basename "$input_file")
    
    # 检查是否以 .b64 结尾
    if [[ ! "$basename" =~ \.b64$ ]]; then
        echo -e "${RED}错误: 解码的文件必须以 .b64 结尾${NC}"
        exit 1
    fi
    
    # 移除 .b64 后缀
    local without_b64="${basename%.b64}"
    
    # 检查剩下的部分是否包含点号
    if [[ "$without_b64" == *.* ]]; then
        # 有点号的情况，分隔文件名和扩展名
        local encoded_name="${without_b64%.*}"
        local encoded_ext="${without_b64##*.}"
        
        # 解码文件名和扩展名
        local name=$(urlsafe_base64_decode "$encoded_name")
        local ext=$(urlsafe_base64_decode "$encoded_ext")
        
        local output_file="${name}.${ext}"
    else
        # 没有点号的情况，直接解码整个文件名
        local name=$(urlsafe_base64_decode "$without_b64")
        local output_file="$name"
    fi
    
    # 检查输出文件是否已存在
    if [ -f "$output_file" ]; then
        echo -e "${YELLOW}警告: 文件 '$output_file' 已存在${NC}"
        read -p "是否覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}操作已取消${NC}"
            exit 1
        fi
    fi
    
    # 解码文件内容
    echo -e "${GREEN}正在解码文件: $input_file${NC}"
    base64 -d "$input_file" > "$output_file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 解码完成${NC}"
        echo -e "${YELLOW}输出文件: $output_file${NC}"
        echo -e "文件大小: $(wc -c < "$output_file") 字节"
    else
        echo -e "${RED}✗ 解码失败，文件可能不是有效的base64编码${NC}"
        # 删除可能已创建的无效文件
        [ -f "$output_file" ] && rm "$output_file"
        exit 1
    fi
}

# 根据模式执行操作
case $MODE in
    "encode")
        encode_file "$FILENAME"
        ;;
    "decode")
        decode_file "$FILENAME"
        ;;
    "auto")
        # 自动判断模式
        if [[ "$FILENAME" =~ \.b64$ ]]; then
            decode_file "$FILENAME"
        else
            encode_file "$FILENAME"
        fi
        ;;
esac