# 设置代理
```
export http_proxy="socks5h://192.168.1.40:10800"
export https_proxy="$http_proxy"
export HTTP_PROXY="$http_proxy"
export HTTPS_PROXY="$http_proxy"
```

# 安装依赖
```
apt update && apt install -y jq curl
```
