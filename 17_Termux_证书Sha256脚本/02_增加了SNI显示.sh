cat << 'EOF' > shacert.sh
#!/usr/bin/env bash

# 扫描深度
MAX_DEPTH=3; 

# 证书类型
CERT_EXTS="crt|pem|cer|der"

# 颜色函数
RED='\033[1;31m';
GREEN='\033[1;32m';
YELLOW='\033[1;33m';
BLUE='\033[1;34m';
PURPLE='\033[1;35m';
CYAN='\033[1;36m';
NC='\033[0m'

# 检测依赖
check_dependencies() {
    for cmd in openssl cut tr find realpath; do
        if ! command -v $cmd &>/dev/null; then echo -e "${RED}错误: 未找到 $cmd${NC}"; exit 1; fi
    done
}

# 帮助信息
show_help() {
    clear; echo -e "${PURPLE}SHA-256 证书指纹提取工具 (加强版)${NC}"
    echo "---------- ---------- ---------- ---------- ----------"
    echo -e "${GREEN}[自动扫描模式]:${NC}"
    echo -e "  用法: shacert"
    echo -e "  功能: 递归扫描当前目录${YELLOW}(深度:$MAX_DEPTH层)${NC}下的所有证书文件。(层数可在脚本内修改)"
    echo -e "  格式: 支持 ${CYAN}.crt, .pem, .cer, .der${NC} (可在脚本内添加类型)"
    echo -e "  安全: 不追踪软链接，不跨越文件系统。"
    echo ""
    echo -e "${CYAN}[手动模式]:${NC}"
    echo -e "  用法: shacert [域名/文件路径]"
    echo -e "  示例: ${YELLOW}shacert www.google.com${NC} | 默认443端口, 可手动指定端口 xxx.com:8443"
    echo -e "        ${YELLOW}shacert ./certs/server.pem${NC}"
    echo "---------- ---------- ---------- ---------- ----------"
}

# 核心函数
get_sha256() {
    local target="$1" type="$2"
    local cert_raw=""
    
    if [ "$type" = "file" ]; then
        echo -e "${BLUE}$(realpath "$target") ↓${NC}"
        # 尝试 PEM 格式
        cert_raw=$(openssl x509 -in "$target" 2>/dev/null)
        # 如果 PEM 失败，尝试 DER 格式转换
        if [ $? -ne 0 ]; then
            cert_raw=$(openssl x509 -inform DER -in "$target" 2>/dev/null)
        fi
    else
        conn="$target"; if [[ "$target" != *:* ]]; then conn="$target:443"; fi
        echo -e "${BLUE}$target ↓${NC}"
        # 提取纯净的 PEM 证书块
        cert_raw=$(echo | openssl s_client -connect "$conn" -servername "${target%%:*}" 2>/dev/null | openssl x509 2>/dev/null)
    fi

    if [ -n "$cert_raw" ]; then
        # 提取指纹
        hash=$(echo "$cert_raw" | openssl x509 -noout -fingerprint -sha256 | cut -d'=' -f2 | tr -d ':' | tr '[:upper:]' '[:lower:]')
        echo -e "    sha: ${YELLOW}$hash${NC}"
        
        # 提取可用名称 (SNI/SAN)
        echo -e "${CYAN}可用名称(SNI): ↓${NC}"
        # 获取全部扩展文本
        local cert_text=$(echo "$cert_raw" | openssl x509 -text -noout)
        names=$(echo "$cert_text" | grep -A1 "Subject Alternative Name" | tail -n1 | sed 's/DNS://g; s/IP Address://g; s/,//g')
        
        if [[ -n "$names" && "$names" != *"Subject Alternative Name"* ]]; then
            for name in $names; do
                echo -e "    ${NC}$name${NC}"
            done
        else
            # 如果没找到 SAN，提取 Common Name (CN)
            cn=$(echo "$cert_text" | grep "Subject:" | sed -n 's/.*CN = //p' | cut -d',' -f1)
            [ -n "$cn" ] && echo -e "    ${NC}$cn${NC}" || echo -e "    ${RED}(未找到可用名称)${NC}"
        fi
        echo ""
    else
        echo -e "${RED}sha: 无法解析证书 (格式错误或连接失败)${NC}\n"
    fi
}

# 扫描函数
do_recursive_scan() {
    echo -e "${BLUE}>>> 正在递归扫描证书 ${YELLOW}(深度:$MAX_DEPTH)${NC}${BLUE}...${NC}\n"
    find . -maxdepth $MAX_DEPTH -xdev -type f | grep -E "\.(${CERT_EXTS})$" | while read -r f; do get_sha256 "$f" "file"; done
    echo -e "${BLUE}>>> 扫描完成。${NC}"
}

# 帮助参数
check_dependencies
if [ -n "$1" ]; then
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then show_help; exit 0; fi
    if [ -f "$1" ]; then get_sha256 "$1" "file"; else get_sha256 "$1" "domain"; fi
    exit 0
fi

# 核心确认逻辑
show_help
CONFIRM_COUNT=0
FAIL_COUNT=0
while [ $CONFIRM_COUNT -lt 3 ]; do
    PROMPT="${YELLOW}[请确认是否执行当前目录模式!]${NC} ${CYAN}按 A / 空格 / 回车 确认继续执行! | 按 X / ESC 退出脚本...${NC}"
    
    if [ $CONFIRM_COUNT -eq 2 ]; then
        echo -ne "$PROMPT ${PURPLE}(再按就开始了!)${NC} "
    else
        echo -ne "$PROMPT "
    fi    
    read -s -n 1 char; char_up=$(echo "$char" | tr '[:lower:]' '[:upper:]')
    case "$char_up" in
        X|$'\e') echo -e " ${RED}[已退出]${NC}"; exit 0 ;;
        A|""|" ") 
            echo -e " ${GREEN}[确认]${NC}"
            ((CONFIRM_COUNT++))
            FAIL_COUNT=0
            ;;
        *) 
            echo -e " ${RED}[按键错误!]${NC}"
            ((FAIL_COUNT++))
            if [ $FAIL_COUNT -ge 3 ]; then
                sleep 0.5; CONFIRM_COUNT=0; FAIL_COUNT=0; show_help
            fi
            ;;
    esac
done

echo -e "\n${GREEN}开始执行相关脚本...${NC}\n"
do_recursive_scan
EOF

chmod +x shacert.sh
ln -sf "$(pwd)/shacert.sh" "${PREFIX:-/usr/local}/bin/shacert"