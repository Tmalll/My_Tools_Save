const itemRunesFilename = 'local\\lng\\strings\\item-runes.json';
const itemRunes = D2RMM.readJson(itemRunesFilename);

itemRunes.forEach((item) => {
  const itemtype = item.Key; // 例如 "r16"
  
  if (itemtype && itemtype.match(/^r[0-9]{2}$/) != null) {
    // 1. 提取符文编号
    const runeNumber = itemtype.replace(/^r0?/, '');
    
    // 2. 获取并精简英文名称 (例如 "Io Rune" -> "Io")
    // 使用正则去掉末尾的 " Rune"
    const originalEnUS = (item.enUS || "").replace(/\s*Rune\s*$/i, "");

    // 3. 遍历所有本地化语言
    for (const key in item) {
      if (key !== 'id' && key !== 'Key') {
        let originalName = item[key];
        
        if (key === 'zhCN' || key === 'zhTW') {
          // 逻辑：精简中文名 | 精简英文名 (#编号)
          
          // 使用正则去掉中文里的“符文”和“：”符号
          // 能够处理 "符文：埃歐" -> "埃歐" 以及 "艾欧符文" -> "艾欧"
          const cleanChineseName = originalName.replace(/符文[:：]?|[:：]?符文/g, "");
          
          item[key] = `#${runeNumber} | ${cleanChineseName} | ${originalEnUS}`;
        } else {
          // 其他语言保持：原名 (#编号)
          item[key] = `#${runeNumber} | ${originalName}`;
        }
      }
    }
  }
});

D2RMM.writeJson(itemRunesFilename, itemRunes);