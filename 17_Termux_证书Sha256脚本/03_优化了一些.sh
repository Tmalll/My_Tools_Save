cat << 'EOF' > shacert.sh
#!/usr/bin/env bash
MAX_DEPTH=3; CERT_EXTS="crt|pem|cer|der"
RED='\033[1;31m'; GREEN='\033[1;32m'; YELLOW='\033[1;33m'; BLUE='\033[1;34m'; PURPLE='\033[1;35m'; CYAN='\033[1;36m'; NC='\033[0m'
check_dependencies() { for cmd in openssl cut tr find realpath; do if ! command -v $cmd &>/dev/null; then echo -e "${RED}错误: 未找到 $cmd${NC}"; exit 1; fi; done; }
show_help() {
    clear; echo -e "${PURPLE}SHA-256 证书指纹提取工具 (加强版)${NC}"
    echo "---------- ---------- ---------- ---------- ----------"
    echo -e "${GREEN}[自动扫描模式]:${NC}\n  用法: shacert\n  功能: 递归扫描当前目录${YELLOW}(深度:$MAX_DEPTH层)${NC}下的所有证书文件。\n  格式: 支持 ${CYAN}.crt, .pem, .cer, .der${NC}\n  安全: 不追踪软链接，不跨越文件系统。\n"
    echo -e "${CYAN}[手动模式]:${NC}\n  用法: shacert [域名/文件路径]\n  示例: ${YELLOW}shacert www.google.com${NC} | 默认443, 可指定 xxx.com:8443\n        ${YELLOW}shacert ./certs/server.pem${NC}\n---------- ---------- ---------- ---------- ----------"
}
get_sha256() {
    local target="$1" type="$2" raw=""
    if [ "$type" = "file" ]; then
        echo -e "${BLUE}$(realpath "$target") ↓${NC}"
        raw=$(openssl x509 -in "$target" 2>/dev/null)
        if [ $? -ne 0 ]; then raw=$(openssl x509 -inform DER -in "$target" 2>/dev/null); fi
    else
        conn="$target"
        case "$target" in *:* ) ;; * ) conn="$target:443" ;; esac
        echo -e "${BLUE}$target ↓${NC}"
        raw=$(echo | openssl s_client -connect "$conn" -servername "${target%%:*}" 2>/dev/null | openssl x509 2>/dev/null)
    fi
    if [ -n "$raw" ]; then
        hash=$(echo "$raw" | openssl x509 -noout -fingerprint -sha256 | cut -d'=' -f2 | tr -d ':' | tr '[:upper:]' '[:lower:]')
        echo -e "    CertSha256: ${YELLOW}$hash${NC}\n${CYAN}可用名称(SNI): ↓${NC}"
        txt=$(echo "$raw" | openssl x509 -text -noout)
        names=$(echo "$txt" | grep -A1 "Subject Alternative Name" | tail -n1 | sed 's/DNS://g; s/IP Address://g; s/,//g')
        is_bad=0
        if [ -z "$names" ]; then is_bad=1; fi
        case "$names" in *"Subject Alternative Name"* ) is_bad=1 ;; esac
        if [ "$is_bad" = "1" ]; then
            names=$(echo "$txt" | grep "Subject:" | sed -n 's/.*CN = //p' | cut -d',' -f1)
        fi
        for n in $names; do echo -e "    $n"; done; echo ""
    else echo -e "${RED}CertSha256: 无法解析证书 (格式错误或连接失败)${NC}\n"; fi
}
do_recursive_scan() {
    echo -e "${BLUE}>>> 正在递归扫描证书 ${YELLOW}(深度:$MAX_DEPTH)${NC}${BLUE}...${NC}\n"
    find . -maxdepth $MAX_DEPTH -xdev -type f | grep -E "\.(${CERT_EXTS})$" | while read -r f; do get_sha256 "$f" "file"; done
    echo -e "${BLUE}>>> 扫描完成。${NC}"
}
check_dependencies
if [ -n "$1" ]; then
    case "$1" in -h|--help) show_help; exit 0 ;; esac
    if [ -f "$1" ]; then get_sha256 "$1" "file"; else get_sha256 "$1" "domain"; fi; exit 0
fi
show_help; CONFIRM_COUNT=0; FAIL_COUNT=0
while [ $CONFIRM_COUNT -lt 3 ]; do
    PROMPT="${YELLOW}[请确认是否执行当前目录模式!]${NC} ${CYAN}按 A/空格/回车 确认! | 按 X/ESC 退出...${NC}"
    if [ "$CONFIRM_COUNT" = "2" ]; then echo -ne "$PROMPT ${PURPLE}(再按就开始了!)${NC} "; else echo -ne "$PROMPT "; fi
    read -s -n 1 char; char_up=$(echo "$char" | tr '[:lower:]' '[:upper:]')
    case "$char_up" in
        X|$'\e') echo -e " ${RED}[已退出]${NC}"; exit 0 ;;
        A|""|" ") echo -e " ${GREEN}[确认]${NC}"; CONFIRM_COUNT=$((CONFIRM_COUNT+1)); FAIL_COUNT=0 ;;
        *) echo -e " ${RED}[按键错误!]${NC}"; FAIL_COUNT=$((FAIL_COUNT+1))
           if [ "$FAIL_COUNT" -ge "3" ]; then sleep 0.5; CONFIRM_COUNT=0; FAIL_COUNT=0; show_help; fi ;;
    esac
done
echo -e "\n${GREEN}开始执行相关脚本...${NC}\n"; do_recursive_scan
EOF
chmod +x shacert.sh
ln -sf "$(pwd)/shacert.sh" "${PREFIX:-/usr/local}/bin/shacert"
echo "已安装极限兼容版。已避开所有敏感逻辑符。"