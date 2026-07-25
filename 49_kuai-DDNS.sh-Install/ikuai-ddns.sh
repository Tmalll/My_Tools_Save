#!/bin/bash

# ==============================================================================
# 日志模块初始化 (自动创建文件夹、捕获终端输出、倒序合并并清理过期日志)
# ==============================================================================
init_log_top() {
    local name=$1
    SCRIPT_NAME="${0##*/}"
    SCRIPT_NAME="${SCRIPT_NAME%.sh}"    
    LOG_DIR="$(cd "$(dirname "$0")"; pwd)"
    mkdir -p "$LOG_DIR"
    LOG_FILE="$LOG_DIR/$name.log"
    LOG_TMP="$LOG_DIR/$name.tmp"

    _finish() {
        exec 1>&- 2>&-; sleep 0.1
        [ -f "$LOG_TMP" ] && { 
            [ -f "$LOG_FILE" ] && find "$LOG_FILE" -mtime +7 -exec cp /dev/null {} \; 2>/dev/null
            [ -f "$LOG_FILE" ] && (cat "$LOG_TMP" "$LOG_FILE" > "$LOG_FILE.new" && mv "$LOG_FILE.new" "$LOG_FILE") || cp "$LOG_TMP" "$LOG_FILE"
            rm -f "$LOG_TMP"
        }
    }
    trap _finish EXIT; exec > >(tee "$LOG_TMP") 2>&1
}

init_log_top "ikuai-ddns"
echo ""
echo ""
echo "=========================================="
echo "执行时间: $(date '+%Y-%m-%d %H:%M:%S')"


# ==============================================================================
# 第一部分：从爱快 (iKuai) 获取 IPv6 地址
# ==============================================================================

# 爱快路由器配置
IKUAI_URL="http://192.168.1.33"
IKUAI_USER="admin"
IKUAI_PASS_HASH="14d39d5ab4318092575a2732f6036660" # 你的密码 md5
IKUAI_PASS_BASE64="c2FsdF8xMWlLdWFpQFRFekBOUEUlYWthVVEyN0xnMDJnXk5Hdw==" # 爱快前端加密串

echo "=========================================="
echo "[1/2] 开始从爱快路由器获取 IPv6 地址..."

# 1. 请求登录，从 Response Header 的 Set-Cookie 中提取 sess_key
iKuaiAPI_key=$(curl -s -i "${IKUAI_URL}/Action/login" \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Content-Type: application/json;charset=UTF-8' \
  --data-raw "{\"username\":\"${IKUAI_USER}\",\"passwd\":\"${IKUAI_PASS_HASH}\",\"pass\":\"${IKUAI_PASS_BASE64}\",\"remember_password\":\"\"}" \
  | grep -i 'Set-Cookie:' \
  | sed -n 's/.*sess_key=\([^;]*\).*/\1/p' \
  | tr -d '\r\n')

# 排错输出与等待
echo "获取到的 iKuaiAPI_key: [${iKuaiAPI_key}]"
sleep 1

if [ -z "${iKuaiAPI_key}" ]; then
  echo "错误: 未能获取到爱快 sess_key，请检查网络或登录凭证！"
  exit 1
fi

# 2. 携带 sess_key 调用 /Action/call 获取 WAN 口 IPv6
# 过滤并提取 dhcp6_ip_addr 中的 IP（剔除掩码 /64 等部分）
dhcp6_ip_addr=$(curl -s "${IKUAI_URL}/Action/call" \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Content-Type: application/json;charset=UTF-8' \
  -H "Cookie: username=${IKUAI_USER}; login=1; sess_key=${iKuaiAPI_key}" \
  --data-raw '{"func_name":"ipv6","action":"show","param":{"TYPE":"data,total","limit":"0,20","ORDER_BY":"","ORDER":""}}' \
  | jq -r '.Data.data[] | select(.dhcp6_ip_addr != null and .dhcp6_ip_addr != "") | .dhcp6_ip_addr' \
  | head -n 1 \
  | cut -d'/' -f1)

# 排错输出与等待
echo "获取到的 dhcp6_ip_addr: [${dhcp6_ip_addr}]"
sleep 1

if [ -z "${dhcp6_ip_addr}" ]; then
  echo "警告: 未获取到爱快的 IPv6 地址！"
fi


# ==============================================================================
# 第二部分：Cloudflare DDNS 脚本 (注册表加强版)
# ==============================================================================

echo "=========================================="
echo "[2/2] 开始执行 Cloudflare DDNS 同步..."

# Cloudflare 凭证配置
CF_API_TOKEN="9MvmrZxW4qvTWg0pCm5x1ecNPSJIMOGWl4nUczOP"
ZONE_ID="d362e0bd36b803be9068be789bf22747"

# 1. 准备全局 IP 变量
IPV4_ADDR=$(curl --doh-url https://223.5.5.5/dns-query -s -4 https://4.ident.me 2>/dev/null | tr -d '\r\n')
IPV6_ADDR="${dhcp6_ip_addr}"

echo "当前公网 IPv4: [${IPV4_ADDR:-无}]"
echo "当前公网 IPv6: [${IPV6_ADDR:-无}]"

# 2. DDNS 注册表配置 (格式: "域名|记录类型|使用的IP|是否开启Proxy(true/false)")
DOMAINS_CONFIG=(
  "ikuai.miaosky.top|A|${IPV4_ADDR}|false"
  "ikuai.miaosky.top|AAAA|${IPV6_ADDR}|false"
  "ikuai-v4.miaosky.top|A|${IPV4_ADDR}|false"
  "ikuai-v6.miaosky.top|AAAA|${IPV6_ADDR}|false"
)

# 3. 遍历注册表并更新 DNS 记录
for config in "${DOMAINS_CONFIG[@]}"; do
  # 解析配置行
  IFS="|" read -r HOSTNAME RECORD_TYPE TARGET_IP PROXIED <<< "$config"

  echo "------------------------------------------"
  echo "正在处理: $HOSTNAME ($RECORD_TYPE) -> $TARGET_IP"

  # 校验 IP / 内容是否合法
  if [ -z "$TARGET_IP" ]; then
    echo "跳过: 未获取到对应的 IP/内容 地址。"
    continue
  fi

  # 查询 Cloudflare 上现有的 DNS 记录
  DNS_INFO=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=$RECORD_TYPE&name=$HOSTNAME" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json")

  RECORD_ID=$(echo "$DNS_INFO" | jq -r '.result[0].id // empty')
  EXISTING_IP=$(echo "$DNS_INFO" | jq -r '.result[0].content // empty')

  # 比对逻辑：如果记录已存在且 IP 未发生改变，则跳过更新
  if [ -n "$RECORD_ID" ] && [ "$EXISTING_IP" == "$TARGET_IP" ]; then
    echo "匹配成功: 云端记录与当前 IP 一致 ($TARGET_IP)，跳过更新。"
    continue
  fi

  # 如果记录存在但 IP 变了，进行 PUT 更新
  if [ -n "$RECORD_ID" ]; then
    echo "检测到 IP 变动 (原: $EXISTING_IP -> 新: $TARGET_IP)，更新记录中..."
    UPDATE_RESULT=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "{\"type\":\"$RECORD_TYPE\",\"name\":\"$HOSTNAME\",\"content\":\"$TARGET_IP\",\"ttl\":1,\"proxied\":$PROXIED}")
    
    SUCCESS=$(echo "$UPDATE_RESULT" | jq -r '.success')
    if [ "$SUCCESS" == "true" ]; then
      echo "成功: $HOSTNAME ($RECORD_TYPE) 已更新为 $TARGET_IP"
    else
      echo "失败: 更新 $HOSTNAME 失败，错误信息: $(echo "$UPDATE_RESULT" | jq -c '.errors')"
    fi
  else
    # 如果记录不存在，进行 POST 新建
    echo "未找到现有记录，创建新记录中..."
    CREATE_RESULT=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "{\"type\":\"$RECORD_TYPE\",\"name\":\"$HOSTNAME\",\"content\":\"$TARGET_IP\",\"ttl\":1,\"proxied\":$PROXIED}")
    
    SUCCESS=$(echo "$CREATE_RESULT" | jq -r '.success')
    if [ "$SUCCESS" == "true" ]; then
      echo "成功: $HOSTNAME ($RECORD_TYPE) 已创建，指向 $TARGET_IP"
    else
      echo "失败: 创建 $HOSTNAME 失败，错误信息: $(echo "$CREATE_RESULT" | jq -c '.errors')"
    fi
  fi
done

echo "=========================================="
echo "全部流程处理完成。"
echo ""
echo ""
echo ""
