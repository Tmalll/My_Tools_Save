export default {
  async fetch(request) {
    const url = new URL(request.url);

    let targetPath = url.pathname.slice(1) + url.search + url.hash;
    if (!targetPath) {
      return new Response("Bad Request", { status: 400 });
    }

    if (!/^https?:\/\//i.test(targetPath)) {
      targetPath = "https://" + targetPath;
    }

    let target;
    try {
      target = new URL(targetPath);
    } catch {
      return new Response("Invalid target URL", { status: 400 });
    }

    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (!/^(host|origin|referer)$/i.test(key)) {
        headers.set(key, value.replace(url.origin, target.origin));
      }
    });

    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual"
    });

    if (
      upstream.status >= 300 &&
      upstream.status < 400 &&
      upstream.headers.get("Location")
    ) {
      const loc = new URL(upstream.headers.get("Location"), target).href;
      return Response.redirect(url.origin + "/" + loc, 302);
    }

    const respHeaders = new Headers(upstream.headers);
    [
      "content-security-policy",
      "permissions-policy",
      "cross-origin-embedder-policy",
      "cross-origin-resource-policy",
      "x-frame-options"
    ].forEach(h => {
      respHeaders.delete(h);
      respHeaders.delete(h + "-report-only");
    });

    respHeaders.set("access-control-allow-origin", "*");

    const ct = upstream.headers.get("content-type") || "";

    // 🔧 关键修复点：使用 HTMLRewriter 正确重写所有路径
    if (ct.includes("text/html")) {
        const targetOrigin = target.origin;
        // 正确的相对代理前缀，例如：/https://github.com
        const relativePrefix = "/" + targetOrigin;

        // 创建 HTMLRewriter 实例
        const rewriter = new HTMLRewriter()
            // 匹配所有带有 href, src, data-url, data-pjax 的元素 (增加 data-* 属性以修复动态内容)
            .on('*[href], *[src], *[data-url], *[data-pjax]', {
                element: (element) => {
                    
                    const attributes = ['href', 'src', 'data-url', 'data-pjax'];
                    
                    for (const attr of attributes) {
                        let value = element.getAttribute(attr);

                        if (value) {
                            // 1. 重写以单斜杠开头的相对路径 (/path -> /https://target.com/path)
                            if (value.startsWith('/') && !value.startsWith('//')) {
                                element.setAttribute(attr, `${relativePrefix}${value}`);
                            }
                            // 2. 修复绝对路径 (https://target.com/path -> /https://target.com/path)
                            else if (value.startsWith(targetOrigin)) {
                                // 关键修复：只替换为 relativePrefix，避免包含 url.origin
                                element.setAttribute(attr, value.replace(targetOrigin, relativePrefix));
                            }
                        }
                    }
                }
            });

        // 返回使用 rewriter 处理后的响应
        return rewriter.transform(upstream);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders
    });
  }
};