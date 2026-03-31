// White: 'ÿc0', 白
// Gray: 'ÿc5', 灰色
// Black: 'ÿc6', 黑
// LightRed: 'ÿc1', 亮红
// BrightRed: 'ÿcV', 深红
// Gold: 'ÿc4', 金色
// Yellow: 'ÿc9', 黄色
// Orange: 'ÿc8', 橙色
// BrightGreen: 'ÿc2', 亮绿
// DarkGreen: 'ÿcA', 深绿
// LightTeal: 'ÿcI', 青绿色
// LightCyan: 'ÿcU', 青蓝色
// BrightCyan: 'ÿcO', 深青色
// LightBlue: 'ÿcQ', 亮蓝色
// Blue: 'ÿc3', 蓝色
// Purple: 'ÿc;', 紫色
// Pink: 'ÿcP', 粉色

// 以下是旧版代码, 可能不准
// 代码,最终渲染颜色,游戏内典型用途
//  ÿc0 , 白色 (White),普通物品、默认文字
//  ÿc1 , 红色 (Red),属性不足、生命值、红宝石
//  ÿc2 , 绿色 (Bright Green),套装物品、绿宝石
//  ÿc3 , 蓝色 (Blue),魔法物品、蓝宝石
//  ÿc4 , 暗金色 (Gold),暗金装备 (Unique)
//  ÿc5 , 灰色 (Dark Gray),孔装、无形、骷髅
//  ÿc6 , 黑色 (Black),基本看不见（除非背景亮）
//  ÿc7 , 浅棕色 (Tan),物品栏网格颜色
//  ÿc8 , 橙色 (Orange),符文、手工物品
//  ÿc9 , 黄色 (Yellow),亮金装备 (Rare)、黄宝石
//  ÿc: , 深绿色 (Dark Green),任务物品
//  ÿc; , 紫色 (Purple),紫宝石、部分特殊UI
//  ÿc< , 暗绿色 (Sage Green),较少见，比 2 深一些
//  ÿc? , 金黄色
//  ÿc@ , 橙色


// 1. 定义修改注册表
// 示例 1: 仅对 zhTW 生效（改名 + 改色）
// { id: 1061, color_code: `ÿc;`, target_language: "zhTW", target_name: "克林姆的遺願是头猪", SwitchName: "open" }, 
    
// 示例 2: 屏蔽名称（target_name 为空则覆写为空，方便屏蔽不需要的东西）
// { id: 1061, color_code: `off`, target_language: "zhCN", target_name: "", SwitchName: "open" },

// 示例 3: 不改整体颜色，仅修改 zhCN 的文字内容（内容里带颜色）
// { id: 1061, color_code: "off", target_language: "zhCN", target_name: "旧连枷ÿc;|任务物品", SwitchName: "open" }  
// color_code 对应颜色代码, off表示不修改颜色.

// 大型护符示例：target_language 为 off，则忽略 target_name，只修改全部语言的颜色

// { id: 20437, color_code: `ÿcP`, target_language: "off", append_mode: "", target_name: "", SwitchName: "open" },
// 重新梳理下这个注册表,
// id: 20437, 数字ID用来识别要修改项目的主要参数, 不做改变.
// color_code: `ÿcP`, 整体使用的颜色代码, 不做改变. off 不修改颜色, 各种 ÿc... 表示修改颜色.
// target_language: "off", off 表示忽略 target_name 不修改描述语言只着色,  all 表示修改所有语言,  zhCN \ zhTW \ enUS .... 表示只修改对应语言的描述.
// target_name: "", 留空 "" 表示清空某语言描述, 用来屏蔽某些不想显示的东西. 也可在其中自定义插入颜色代码 target_name: "旧连枷ÿc;|任务物品" 比如这样.
// 新增一个 append_mode: 1 / 0 的参数, 表示追加模式 1开启 0关闭. 选择1 的时候 target_name: "ÿc;|任务" 的值追加到原有描述上面, 比如前面这样, 原来叫 xxx卷轴 > xxx卷轴ÿc;|任务.
// SwitchName: "open" 保留原有功能, open表示常开, 其他值由 控制文件中的开关控制.    
// 新的这些修改保留我写的这些注释, 只修改必要的地方.


const Modify_item_names = [
    // id: 物品数字ID
    // color_code: `ÿcP`, 整体使用的颜色代码。"off"为不修改。
    // target_language: "off" (仅变色), "all" (全语言修改), "zhCN" 等 (特定语言修改)。
    // target_name: 自定义描述。为空"" 且 append_mode 为0时表示隐藏/清空描述。
    // append_mode: 1 为追加模式（在原名后加上target_name）, 0 为覆盖模式（直接使用target_name）。
    // SwitchName: "open" 或 config中的开关变量名。
    
    { id: 20435, color_code: `ÿcP`, target_language: "off", target_name: "", append_mode: 0, SwitchName: "open" },
    { id: 20436, color_code: `ÿcP`, target_language: "off", target_name: "", append_mode: 0, SwitchName: "open" },
    { id: 20437, color_code: `ÿcP`, target_language: "off", target_name: "", append_mode: 0, SwitchName: "open" },
    
    // 示例：给暗金项链(id 521)在所有语言下追加“|任务”字样并染成紫色
    // { id: 521, color_code: `ÿcP`, target_language: "all", target_name: "ÿc;|任务", append_mode: 1, SwitchName: "open" },
];

// 2. 预处理映射表
const registryMap = {};
Modify_item_names.forEach(rule => {
    // 兼容 SwitchName 开关逻辑
    const isEnabled = rule.SwitchName === 'open' || (typeof config !== 'undefined' && config[rule.SwitchName]);
    if (isEnabled) {
        registryMap[rule.id] = rule;
    }
});

/**
 * 核心处理函数
 */
function processItemNames(item) {
    const rule = registryMap[item.id];
    if (!rule) return;

    // 内部函数：处理单个字符串的内容修改逻辑
    const transformText = (originalText, rule) => {
        let newText = "";

        // 处理文本内容 (覆盖 vs 追加)
        if (rule.append_mode === 1) {
            newText = originalText + rule.target_name;
        } else {
            newText = rule.target_name; // 如果 target_name 是 ""，这里就实现了隐藏
        }

        // 处理颜色 (如果颜色不是 off，且新文本不为空)
        if (rule.color_code !== "off" && newText !== "") {
            // 兼容 D2R 的性别/复数标签 [ms] [fs] [m] [f] 等
            // 颜色代码必须放在这些标签之后，否则标签会失效
            const match = newText.match(/^(\[[a-zA-Z0-9]+\])?(.*)$/);
            const prefix = match[1] || '';
            const content = match[2];
            return `${prefix}${rule.color_code}${content}`;
        }

        return newText;
    };

    // --- 逻辑分发 ---

    // 情况 A: target_language 为 "off" -> 仅对所有语言进行整体上色，不修改文本内容
    if (rule.target_language === "off") {
        for (const lang in item) {
            if (lang === 'id' || lang === 'Key') continue;
            // 此时不参考 target_name，只把原名传进去上色
            item[lang] = transformText(item[lang], { ...rule, target_name: "", append_mode: 1 });
        }
    } 
    // 情况 B: target_language 为 "all" -> 对所有语言应用 target_name 的修改逻辑
    else if (rule.target_language === "all") {
        for (const lang in item) {
            if (lang === 'id' || lang === 'Key') continue;
            item[lang] = transformText(item[lang], rule);
        }
    } 
    // 情况 C: 针对特定语言修改 (如 "zhCN")
    else {
        const lang = rule.target_language;
        if (item[lang] !== undefined) {
            item[lang] = transformText(item[lang], rule);
        }
    }
}

// 3. 执行修改
const itemNamesFilename = 'local\\lng\\strings\\item-names.json';
const itemNames = D2RMM.readJson(itemNamesFilename);
itemNames.forEach(processItemNames);
D2RMM.writeJson(itemNamesFilename, itemNames);






