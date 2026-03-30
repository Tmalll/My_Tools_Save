// 1. 定义修改注册表
const Modify_item_names = [
    // 示例 1: 仅对 zhTW 生效（改名 + 改色）
    // { id: 1061, color_code: `ÿc;`, target_language: "zhTW", target_name: "克林姆的遺願是头猪", SwitchName: "open" }, 
    
    // 示例 2: 屏蔽名称（target_name 为空则覆写为空，方便屏蔽不需要的东西）
    // { id: 1061, color_code: `off`, target_language: "zhCN", target_name: "", SwitchName: "open" },

    // 示例 3: 不改整体颜色，仅修改 zhCN 的文字内容（内容里带颜色）
    // { id: 1061, color_code: "off", target_language: "zhCN", target_name: "旧连枷ÿc;|任务物品", SwitchName: "open" }  
    // color_code 对应颜色代码, off表示不修改颜色.

    // 大型护符示例：target_language 为 off，则忽略 target_name，只修改全部语言的颜色
    { id: 20435, color_code: `ÿc;`, target_language: "off", target_name: "", SwitchName: "open" },
    { id: 20436, color_code: `ÿc;`, target_language: "off", target_name: "", SwitchName: "open" },
    { id: 20437, color_code: `ÿc;`, target_language: "off", target_name: "", SwitchName: "open" },
];

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
//  ÿc? , 青蓝色 (Cyan),浅蓝色
//  ÿc@ , 银色 (Silver),比 0 稍暗一点的亮灰
//  ÿcA , 深绿色






// 2. 预处理映射表
const registryMap = {};
Modify_item_names.forEach(rule => {
    const isEnabled = rule.SwitchName === 'open' || config[rule.SwitchName];
    if (isEnabled) {
        registryMap[rule.id] = rule;
    }
});

function processItemNames(item) {
    const rule = registryMap[item.id];
    if (!rule) return;

    // 封装颜色处理逻辑，确保 [ms] [fs] 标签不被破坏
    const applyColor = (text, colorCode) => {
        if (colorCode === "off") return text;
        const match = text.match(/^(\[[mf]s\])?(.*)$/);
        const prefix = match[1] || '';
        const value = match[2];
        return `${prefix}${colorCode}${value}`;
    };

    // 逻辑 A: 修改全部语言的颜色 (target_language 为 "off" 或 "all")
    if (rule.target_language === "off" || rule.target_language === "all") {
        for (const langKey in item) {
            if (langKey === 'id' || langKey === 'Key') continue;
            item[langKey] = applyColor(item[langKey], rule.color_code);
        }
        return;
    }

    // 逻辑 B: 精确修改特定语言
    const langKey = rule.target_language;
    if (item[langKey] !== undefined) {
        // 核心修改：不再获取原名，target_name 是什么就改为什么（包括空字符串）
        let currentText = rule.target_name;
        
        // 应用颜色并覆写
        item[langKey] = applyColor(currentText, rule.color_code);
    }
}

// 3. 执行修改
const itemNamesFilename = 'local\\lng\\strings\\item-names.json';
const itemNames = D2RMM.readJson(itemNamesFilename);
itemNames.forEach(processItemNames);
D2RMM.writeJson(itemNamesFilename, itemNames);