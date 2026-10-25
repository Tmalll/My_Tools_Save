这是一份经过整理与脱敏处理的 Markdown 文档，您可以直接保存为 `.md` 文件使用。

---

# VPS 本地使用 Cloudflare Workerd 部署指南

本指南旨在说明如何在 Linux VPS 上使用 `workerd` 运行 Cloudflare Worker 脚本，并配合 Nginx 实现反向代理部署。

## 1. 安装 workerd 程序

执行以下命令下载并安装 `workerd` 二进制文件：

```bash
# 下载安装
curl -L -O https://github.com/cloudflare/workerd/releases/latest/download/workerd-linux-64.gz
gunzip workerd-linux-64.gz
rm -f /usr/bin/workerd
mv ./workerd-linux-64 /usr/bin/workerd
chmod +x /usr/bin/workerd

# 验证安装
workerd --help
workerd --version

```

## 2. 环境配置与脚本准备

创建工作目录并将 Worker 脚本放入其中。

```bash
# 创建目录
mkdir -p ~/workerd_runtime
cd ~/workerd_runtime

# 下载您的 Worker 脚本 (请替换为实际的脚本下载地址)
curl -L -o ./your_worker_script.js https://example.com/path/to/your_script.js

```

创建 `config.capnp` 配置文件，支持多脚本部署：

```capnp
using Workerd = import "/workerd/workerd.capnp";

# 定义 Worker 实体
const appWorkerOne :Workerd.Worker = (
    modules = [ ( name = "worker_1", esModule = embed "your_worker_script.js" ) ],
    compatibilityDate = "2026-01-01"
);

const appWorkerTwo :Workerd.Worker = (
    modules = [ ( name = "worker_2", esModule = embed "your_worker_script.js" ) ],
    compatibilityDate = "2026-01-01"
);

# 核心配置中心
const config :Workerd.Config = (
    services = [
        ( name = "service_A", worker = .appWorkerOne ),
        ( name = "service_B", worker = .appWorkerTwo )
    ],
    sockets = [
        ( name = "port_5670", address = "127.0.0.1:5670", http = (), service = "service_A" ),
        ( name = "port_5671", address = "127.0.0.1:5671", http = (), service = "service_B" )
    ]
);

```

> **提示**：首次测试时，可将 `address` 设置为 `0.0.0.0:5670` 以开放公网访问进行联调。测试通过后，请务必改回 `127.0.0.1:5670` 并配合 Nginx 进行反代，以确保安全。

## 3. Systemd 服务管理

创建服务文件 `/etc/systemd/system/workerd_runtime.service`：

```ini
[Unit]
Description=workerd Runtime
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/workerd_runtime
ExecStart=/usr/bin/workerd serve /root/workerd_runtime/config.capnp
Restart=always
RestartSec=30
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target

```

**管理命令：**

* **启动**：`systemctl daemon-reload && systemctl enable workerd_runtime && systemctl start workerd_runtime`
* **状态**：`systemctl status workerd_runtime`
* **停止**：`systemctl stop workerd_runtime`

## 4. Nginx 反向代理配置

在 Nginx 配置中添加反代规则，确保流式传输等特性正常工作：

```nginx
location /your_path_identifier {
    proxy_pass http://127.0.0.1:5670;
    auth_basic off;

    proxy_set_header Host $host:$server_port;
    proxy_set_header X-Real-Host $host:$server_port;
    
    # 协议透传逻辑
    set $real_proto $scheme;
    if ($server_port ~ "^(18080|18081)$") { set $real_proto "https"; } # 给xray回落使用
    proxy_set_header X-Real-Scheme $real_proto; 
    
    # 性能优化参数
    proxy_buffering off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    client_max_body_size 5120M;
    proxy_http_version 1.1;
    proxy_request_buffering off;
    proxy_set_header Connection "";
    gzip off;
}

```

## 5. Worker 脚本协议修复层

为了在本地 `workerd` 环境下正确解析 Nginx 传入的 Header，请在 Worker 脚本的请求处理入口处添加以下代码：

```javascript
// 本地 workerd 部署 Nginx 反代专用协议修复层
const realProto = request.headers.get("x-real-scheme") || null;
const realHost  = request.headers.get("x-real-host") || null;

if (realProto && realHost) {
    const u = new URL(request.url);
    const fixedUrl = `${realProto}://${realHost}${u.pathname}${u.search}${u.hash}`;

    request = new Request(fixedUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method === "GET" || request.method === "HEAD" ? null : request.body,
        redirect: "manual"
    });
}

```

---

*注：本配置适用于 Cloudflare Worker 脚本在本地 VPS 环境下的兼容性运行。*