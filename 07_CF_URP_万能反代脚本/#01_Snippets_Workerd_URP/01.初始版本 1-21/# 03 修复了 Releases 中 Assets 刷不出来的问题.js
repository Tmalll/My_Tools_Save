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

    // 🔧 使用 HTMLRewriter 修复所有路径
if (ct.includes("text/html")) {
    const targetOrigin = target.origin;
    const workerPrefix = url.origin + "/" + targetOrigin;

    // 创建 HTMLRewriter 实例
    const rewriter = new HTMLRewriter()
        .on('*[href]', {
            element: (element) => {
                let href = element.getAttribute('href');
                if (href) {
                    // 1. 重写以单斜杠开头的相对路径 (/path -> /https://target.com/path)
                    if (href.startsWith('/') && !href.startsWith('//')) {
                        element.setAttribute('href', `/${targetOrigin}${href}`);
                    }
                    // 2. 重写绝对路径 (https://target.com/path -> /https://target.com/path)
                    else if (href.startsWith(targetOrigin)) {
                        element.setAttribute('href', href.replace(targetOrigin, workerPrefix));
                    }
                }
            }
        })
        .on('*[src]', {
            element: (element) => {
                let src = element.getAttribute('src');
                if (src) {
                    // 1. 重写以单斜杠开头的相对路径 (/path -> /https://target.com/path)
                    if (src.startsWith('/') && !src.startsWith('//')) {
                        element.setAttribute('src', `/${targetOrigin}${src}`);
                    }
                    // 2. 重写绝对路径 (https://target.com/path -> /https://target.com/path)
                    else if (src.startsWith(targetOrigin)) {
                        element.setAttribute('src', src.replace(targetOrigin, workerPrefix));
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
