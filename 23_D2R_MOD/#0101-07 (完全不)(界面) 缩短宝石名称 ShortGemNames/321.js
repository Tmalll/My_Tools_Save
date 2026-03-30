const COLOR_PREFIX = '?c';

const ITEMS = [
  {
    id: '紫宝石',
    color: `${COLOR_PREFIX};`,
    codes: ['gcv', 'gfv', 'gsv', 'gzv', 'gpv'],
  },
  {
    id: '钻石',
    color: `${COLOR_PREFIX}:`,
    codes: ['gcw', 'gfw', 'gsw', 'glw', 'gpw'],
  },
  {
    id: '绿宝石',
    color: `${COLOR_PREFIX}2`,
    codes: ['gcg', 'gfg', 'gsg', 'glg', 'gpg'],
  },
  {
    id: 'RUBY', // 如果你想保留英文名对照也可以，这里统一改成中文
    id: '红宝石',
    color: `${COLOR_PREFIX}1`,
    codes: ['gcr', 'gfr', 'gsr', 'glr', 'gpr'],
  },
  {
    id: '蓝宝石',
    color: `${COLOR_PREFIX}3`,
    codes: ['gcb', 'gfb', 'gsb', 'glb', 'gpb'],
  },
  {
    id: '骷髅石',
    color: `${COLOR_PREFIX}:`,
    codes: ['skc', 'skf', 'sku', 'skl', 'skz'],
  },
  {
    id: '黄宝石',
    color: `${COLOR_PREFIX}9`,
    codes: ['gcy', 'gfy', 'gsy', 'gly', 'gpy'],
  },
];

// 代码,最终渲染颜色,游戏内典型用途
// ÿc0 , 白色 (White),普通物品、默认文字
// ÿc1 , 红色 (Red),属性不足、生命值、红宝石
// ÿc2 , 绿色 (Bright Green),套装物品、绿宝石
// ÿc3 , 蓝色 (Blue),魔法物品、蓝宝石
// ÿc4 , 暗金色 (Gold),暗金装备 (Unique)
// ÿc5 , 灰色 (Dark Gray),孔装、无形、骷髅
// ÿc6 , 黑色 (Black),基本看不见（除非背景亮）
// ÿc7 , 浅棕色 (Tan),物品栏网格颜色
// ÿc8 , 橙色 (Orange),符文、手工物品
// ÿc9 , 黄色 (Yellow),亮金装备 (Rare)、黄宝石
// ÿc: , 深绿色 (Dark Green),任务物品
// ÿc; , 紫色 (Purple),紫宝石、部分特殊UI
// ÿc< , 暗绿色 (Sage Green),较少见，比 2 深一些
// ÿc= , 淡绿色 (Bright Lime),非常亮的荧光绿
// ÿc> , 淡黄色 (Pale Yellow),比 9 浅一些
// ÿc? , 青蓝色 (Cyan),浅蓝色
// ÿc@ , 银色 (Silver),比 0 稍暗一点的亮灰
// ÿcA , 深蓝色 (Dark Blue),比 3 深很多
// ÿcB , 深黄色 (Dark Yellow),土黄色

function processItem(item) {
  const itemtype = item.Key;

  let newColor = null;
  let newShortName = null;

  // 匹配宝石类型和等级
  ITEMS.forEach(({ id, color, codes }) => {
    const quality = codes.indexOf(itemtype) + 1;
    if (quality > 0) {
      newColor = color;
      // 生成缩短后的名称：例如 "紫宝石 5"
      newShortName = id + ' ' + quality;
    }
  });

  if (newShortName != null) {
    // 遍历所有语言字段
    for (const key in item) {
      if (key !== 'id' && key !== 'Key') {
        const originalText = item[key];
        
        if (config.shorten) {
          // --- 开启 shorten：直接变成 [颜色][宝石名称][等级] ---
          item[key] = newColor + newShortName;
        } else {
          // --- 关闭 shorten：保留原名，只在前面加上颜色代码 ---
          // 这里的正则逻辑：保留 [ms] 或 [fs] 这种性别标签，然后插入颜色代码
          // 比如 "[ms]完美的紫宝石" -> "[ms]?c;完美的紫宝石"
          const match = originalText.match(/^(\[[mf]s\])?(.*)$/);
          const prefix = match[1] || '';
          const value = match[2];
          item[key] = `${prefix}${newColor}${value}`;
        }
      }
    }
  }
}

// 执行 JSON 文件的读取和处理
const itemNamesFilename = 'local\\lng\\strings\\item-names.json';
const itemNames = D2RMM.readJson(itemNamesFilename);
itemNames.forEach(processItem);
D2RMM.writeJson(itemNamesFilename, itemNames);

const itemNameAffixesFilename = 'local\\lng\\strings\\item-nameaffixes.json';
const itemNameAffixes = D2RMM.readJson(itemNameAffixesFilename);
itemNameAffixes.forEach(processItem);
D2RMM.writeJson(itemNameAffixesFilename, itemNameAffixes);


仿造这个脚本,  编写一个修改 local\\lng\\strings\\item-names.json 内容的MOD
item-names.json 内格式如下
{
    "id": 1060,
    "Key": "qf1",
    "enUS": "Khalim's Flail",
    "zhTW": "克林姆的連枷",
    "deDE": "Khalims Kultflegel",
    "esES": "Rompecabezas de Khalim",
    "frFR": "Fléau de Khalim",
    "itIT": "Flagello di Khalim",
    "koKR": "??? ???",
    "plPL": "Korbacz Khalima",
    "esMX": "Mangual de Khalim",
    "jaJP": "カリムのフレイル",
    "ptBR": "Mangual de Khalim",
    "ruRU": "Кистень Халима",
    "zhCN": "卡林姆的连枷"
  },
  {
    "id": 1061,
    "Key": "qf2",
    "enUS": "Khalim's Will",
    "zhTW": "克林姆的遺願",
    "deDE": "Khalims Wille",
    "esES": "Voluntad de Khalim",
    "frFR": "Volonté de Khalim",
    "itIT": "Volontà di Khalim",
    "koKR": "??? ??",
    "plPL": "Wola Khalima",
    "esMX": "Voluntad de Khalim",
    "jaJP": "カリムの意志",
    "ptBR": "Vontade de Khalim",
    "ruRU": "Воля Халима",
    "zhCN": "卡林姆的意志"
  },


{
  "name": "#0101-11 (完全不)(界面) 自定义物品名称",
  "description": "将宝石名称大幅缩短，并按类型上色。",
  "author": "olegbl",
  "website": "https://www.nexusmods.com/diablo2resurrected/mods/187",
  "version": "1.3",
  "config": [
    {
      "id": "Modify_item_names_1",
      "type": "checkbox",
      "name": "自定义物品名称1",
      "description": "",
      "defaultValue": true
    }
  ]
}


  
// 在脚本开始使用一个注册表来确定修改项目.
const Modify_item_names = [
    // 格式如下,
    { id: '对应上面的数字ID', color_code: `颜色代码 ÿc; \ ÿc1 \ 或者其他 `, target_language: "目标语言", target_name: "要覆写的物品名称", SwitchName: "对应mod.json中的控制开关" },
    
    // 示例和几种不同的写法.
    { id: '1061', color_code: `ÿc;`, target_language: "zhTW", target_name: "克林姆的遺願是头猪", SwitchName: "Modify_item_names_1" }, 
    // 覆写1061 为紫色并且修改物品名称, 带开关的模式. 这种应该是最精确的, 方便堆单独或一批物品名称进行控制.
    // color_code 表示修改全部的物品颜色
    
    { id: '1061', color_code: `ÿc;`, target_language: "off", target_name: "", SwitchName: "open" }, 
    // 另外一种写法, 同样覆写1061, 修改为紫色, target_language: off 表示不修改物品名称并且忽略target_name:, SwitchName:open表示忽略mod.json中的开关此条修改常开.

    { id: '1061', color_code: `off`, target_language: "zhTW", target_name: "克林姆的遺願ÿc;|任务物品", SwitchName: "open" },
    // 同样修改1061, color_code: `off` 表示不修改整体颜色, 目标zhTW, target_name: "克林姆的遺願ÿc;|任务物品" 表示按照自定义格式修改目标名称, 这里是在后面增加了个"ÿc;|任务物品", 开关方面是常开

    // 总结就是, 数字id定位, color_code修改整体颜色, 包括各种颜色代码和off(不修改). 
    // target_language 为要修改的目标语言名称,
    // target_name: "克林姆的遺願ÿc;|任务物品" 为要自定义的物品名称,
    // SwitchName: "open" 常开, 其他的对应mod.json中的控制开关.
];