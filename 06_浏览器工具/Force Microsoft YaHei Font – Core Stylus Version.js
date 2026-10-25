/* 
 * Force Microsoft YaHei Font – Core Stylus Version
 * 无 JS / 无闪烁 / 无动画
 */

/* ===== 全局默认字体（最高优先级） ===== */
html,
body {
    font-family:
        "Microsoft YaHei",
        "微软雅黑",
        "PingFang SC",
        system-ui,
        sans-serif !important;
}

/* ===== 正文内容字体强制（安全排除） ===== */
body *:not(
    /* 代码 / 编辑器 */
    code, pre, kbd, samp, tt,
    .monaco-editor, .monaco-editor *,
    .CodeMirror, .CodeMirror *,
    .ace_editor, .ace_editor *,

    /* 表单 / 控件 / 按钮 */
    input, textarea, select, option, button,
    [type="button"], [type="submit"], [type="reset"],
    [role="button"],

    /* 图标 / 符号字体 */
    i, i[class],
    svg, svg *, canvas,
    [class*="icon"], [class^="icon-"],
    [class^="fa"], .fa, .fas, .far, .fab,
    .material-icons,
    .material-symbols-outlined,
    .material-symbols-rounded,
    .material-symbols-sharp,
    .iconfont, [class*="iconfont"],

    /* 数学 / 公式 */
    math, mjx-container, .MathJax,
    .katex, .katex *
) {
    font-family:
        "Microsoft YaHei",
        "微软雅黑",
        "PingFang SC",
        system-ui,
        sans-serif !important;
}
