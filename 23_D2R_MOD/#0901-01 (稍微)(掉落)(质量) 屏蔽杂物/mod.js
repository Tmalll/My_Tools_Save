// 去除暗金护符唯一限制
const uniqueitemsFilename = 'global\\excel\\uniqueitems.txt';
const uniqueitems = D2RMM.readTsv(uniqueitemsFilename);
uniqueitems.rows.forEach((row) => {
  const itemCode = row.code;  
  // cs2 好像是新版护符
  if ( itemCode === 'cm3' || itemCode === 'cm2' || itemCode === 'cm1') {
    row.spawnable = '1';
    row.disableChronicle = '';
    row.DropConditionCalc = '';
    row.firstLadderSeason = '';
    row.lastLadderSeason = '';
    row.rarity = '1';
    row.nolimit = '1';
  }
});
D2RMM.writeTsv(uniqueitemsFilename, uniqueitems);


// 商人出售相關
const miscFilename = 'global\\excel\\misc.txt';
const misc = D2RMM.readTsv(miscFilename);

const shopRegistry = [
  // 世界之石碎片
  { code: 'xa1', config: 'open', costMult: 0.5 },
  { code: 'xa2', config: 'open', costMult: 0.5 },
  { code: 'xa3', config: 'open', costMult: 0.5 },
  { code: 'xa4', config: 'open', costMult: 0.5 },
  { code: 'xa5', config: 'open', costMult: 0.5 },

  // 洗点徽章
  { code: 'toa', config: 'allowToken', costMult: 3 },

  // 三红门钥匙
  { code: 'pk1', config: 'allowUKey',  costMult: 3 },
  { code: 'pk2', config: 'allowUKey',  costMult: 3 },
  { code: 'pk3', config: 'allowUKey',  costMult: 3 },

  // 紫药水
  { code: 'rvs', config: 'open', costMult: 3 }, // 小紫
  { code: 'rvl', config: 'open', costMult: 3 }  // 大紫
];

const registryMap = {};
shopRegistry.forEach(item => { registryMap[item.code] = item; });

misc.rows.forEach((row) => {
  const itemConfig = registryMap[row.code];
  if (itemConfig) {
    const isEnabled = (itemConfig.config === 'open') || (config[itemConfig.config]);

    if (isEnabled) {
      row.spawnable = 1;
      row.PermStoreItem = 1;
      row.multibuy = 1;
      row.DropConditionCalc = '';
      row.UsageConditionCalc = '';
      row.quest = 0;

      // --- 分类处理 Type ---
      // 只有非药水类的东西（碎片、钥匙、勋章）才需要改 type 为 key
      if (row.code !== 'rvs' && row.code !== 'rvl') {
        row.type = 'key'; 
      }
      // 药水类 (rvs, rvl) 会保持原有的 type: 'potion'，这样就能进腰带了

      if (row.cost) {
        row.cost = Math.floor(row.cost * itemConfig.costMult);
      }

      // 注意：这里 Lysander 必须首字母大写 'Lysander'，否则 TSV 可能识别不了
      const vendors = ['Akara', 'Lysander', 'Ormus', 'Jamella', 'Malah'];
      vendors.forEach(v => {
        row[v + 'Min'] = 1;
        row[v + 'Max'] = 1;
      });
    }
  }
});

D2RMM.writeTsv(miscFilename, misc);

// --- 马拉商店格位清理 ---
const weaponsFilename = 'global\\excel\\weapons.txt';
const weapons = D2RMM.readTsv(weaponsFilename);
weapons.rows.forEach((row) => {
  const type = row['type'];
  if (type === 'jave' || type === 'taxe' || type === 'tkni') {
    row['MalahMin'] = 0;
    row['MalahMax'] = 0;
    row['MalahMagicMin'] = '';
    row['MalahMagicMax'] = '';
    
    row['FaraMin'] = 0;
    row['FaraMax'] = 0;
    row['FaraMagicMin'] = '';
    row['FaraMagicMax'] = '';
  }
});
D2RMM.writeTsv(weaponsFilename, weapons);

// gheed 基德(A1赌博)
// charsi 恰西
// akara 阿卡拉
// lysander 雷山德
// drognan 卓格南
// elzix 艾吉斯(A2赌博)
// fara 法拉
// hratli 赫拉鐵力
// alkor 艾柯(A3赌博)
// ormus 奧瑪斯
// asheara 艾席拉
// jamella 賈梅拉(A4赌博)
// halbu 海爾布
// malah 瑪拉
// drehya 安亞(A5赌博)
// larzuk 拉蘇克
// nihlathak 尼拉塞克(A5赌博)





// 物品屏蔽MOD
const treasureclassexFilename = 'global\\excel\\treasureclassex.txt';
const treasureclassex = D2RMM.readTsv(treasureclassexFilename);

const Block_list_for_Item_and_Prob = [
  // 精確匹配
  { mode: "block", Treasure_Class: "Potion 6", Item_code: "hp4", control_switch: "open" },

  // 屏蔽BOSS精华
  { mode: "block", Treasure_Class: "", Item_code: "tes", control_switch: "open" }, // 扭曲的痛苦精华
  { mode: "block", Treasure_Class: "", Item_code: "ceh", control_switch: "open" }, // 充能的憎恨精华
  { mode: "block", Treasure_Class: "", Item_code: "bet", control_switch: "open" }, // 燃烧的恐惧精华
  { mode: "block", Treasure_Class: "", Item_code: "fed", control_switch: "open" }, // 腐烂的毁灭精华

  // 屏蔽世界之石碎片
  { mode: "block", Treasure_Class: "Act 1 Terrorize Act Consumable Desecrated ", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 2 Terrorize Act Consumable Desecrated ", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 3 Terrorize Act Consumable Desecrated ", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 4 Terrorize Act Consumable Desecrated ", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 5 Terrorize Act Consumable Desecrated ", Item_code: "", control_switch: "open" },

  // 屏蔽次級寶石
  { mode: "block", Treasure_Class: "Chipped Gem", Item_code: "", control_switch: "open" },   // 屏蔽 碎裂的宝石
  { mode: "block", Treasure_Class: "Flawed Gem", Item_code: "", control_switch: "open" },    // 屏蔽 瑕疵的宝石
  { mode: "block", Treasure_Class: "Normal Gem", Item_code: "", control_switch: "open" },    // 屏蔽 普通的宝石
  { mode: "block", Treasure_Class: "Flawless Gem", Item_code: "", control_switch: "open" },  // 屏蔽 无瑕疵的宝石
  
  // 地狱难度 Good 表注入完美宝石 (Item7 原本通常是宝石位)
  // probMult: 1.5 代表爆率是该行平均值的 150%，0.8 代表 80%
  { mode: "add", Treasure_Class: "Act 1 (H) Good", Item_code: "Perfect Gem", control_switch: "open", probMult: 0.5  },
  { mode: "add", Treasure_Class: "Act 2 (H) Good", Item_code: "Perfect Gem", control_switch: "open", probMult: 0.5  },
  { mode: "add", Treasure_Class: "Act 3 (H) Good", Item_code: "Perfect Gem", control_switch: "open", probMult: 0.5  },
  { mode: "add", Treasure_Class: "Act 4 (H) Good", Item_code: "Perfect Gem", control_switch: "open", probMult: 0.5  },
  { mode: "add", Treasure_Class: "Act 5 (H) Good", Item_code: "Perfect Gem", control_switch: "open", probMult: 0.5  },

  // 药水屏蔽
  { mode: "block", Treasure_Class: "Potion 1", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Potion 2", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Potion 3", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Potion 4", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Potion 5", Item_code: "", control_switch: "open" }, 
  { mode: "block", Treasure_Class: "Potion 6", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Hpotion 1", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Hpotion 2", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Hpotion 3", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Hpotion 4", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Hpotion 5", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Hpotion 6", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "", Item_code: "vps", control_switch: "open" }, // 精力药剂
  { mode: "block", Treasure_Class: "", Item_code: "yps", control_switch: "open" }, // 解毒药剂
  { mode: "block", Treasure_Class: "", Item_code: "wms", control_switch: "open" }, // 解冻药剂
  { mode: "block", Treasure_Class: "", Item_code: "hp1", control_switch: "open" }, // 紅藥水
  { mode: "block", Treasure_Class: "", Item_code: "hp2", control_switch: "open" },
  { mode: "block", Treasure_Class: "", Item_code: "hp3", control_switch: "open" },
  { mode: "block", Treasure_Class: "", Item_code: "hp4", control_switch: "open" },
  { mode: "block", Treasure_Class: "", Item_code: "hp5", control_switch: "open" },
  { mode: "block", Treasure_Class: "", Item_code: "mp1", control_switch: "open" }, // 藍藥水
  { mode: "block", Treasure_Class: "", Item_code: "mp2", control_switch: "open" },
  { mode: "block", Treasure_Class: "", Item_code: "mp3", control_switch: "open" },
  { mode: "block", Treasure_Class: "", Item_code: "mp4", control_switch: "open" },
  { mode: "block", Treasure_Class: "", Item_code: "mp5", control_switch: "open" },
  { mode: "block", Treasure_Class: "", Item_code: "rvs", control_switch: "open" }, // 小紫
  { mode: "block", Treasure_Class: "", Item_code: "rvl", control_switch: "open" }, // 大紫

  // 屏蔽杂物与金币
  { mode: "block", Treasure_Class: "", Item_code: "*gld*", control_switch: "open" }, // 屏蔽金币 ( *gld* = 包含 gld,mul=xxx 等格式)  
  { mode: "block", Treasure_Class: "", Item_code: "key", control_switch: "open" }, // 钥匙
  { mode: "block", Treasure_Class: "", Item_code: "isc", control_switch: "open" }, // 辨识卷轴
  { mode: "block", Treasure_Class: "", Item_code: "tsc", control_switch: "open" }, // 回城卷轴
  { mode: "block", Treasure_Class: "", Item_code: "ibk", control_switch: "open" }, // 辨识书
  { mode: "block", Treasure_Class: "", Item_code: "tbk", control_switch: "open" }, // 回城书
  { mode: "block", Treasure_Class: "", Item_code: "aqv", control_switch: "open" }, // 箭矢
  { mode: "block", Treasure_Class: "", Item_code: "cqv", control_switch: "open" }, // 弩箭

  // 垃圾
  { mode: "block", Treasure_Class: "Act 1 Junk", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 2 Junk", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 3 Junk", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 4 Junk", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 5 Junk", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 1 (N) Junk", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 2 (N) Junk", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 3 (N) Junk", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 4 (N) Junk", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 5 (N) Junk", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 1 (H) Junk", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 2 (H) Junk", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 3 (H) Junk", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 4 (H) Junk", Item_code: "", control_switch: "open" },
  { mode: "block", Treasure_Class: "Act 5 (H) Junk", Item_code: "", control_switch: "open" },
];

// 用于记录哪些 TC 已经变为空行了
let emptyTCs = new Set();

// --- 第一遍扫描：执行原始 Block/Add 并压缩 ---
treasureclassex.rows.forEach((row) => {
  const rowTCName = row['Treasure Class'];

  Block_list_for_Item_and_Prob.forEach((rule) => {
    const isEnabled = (rule.control_switch === 'open') || (config[rule.control_switch]);
    if (!isEnabled) return;

    if (rule.mode === "block") {
      for (let i = 1; i <= 10; i++) {
        const itemCell = row['Item' + i] || '';
        if (itemCell === '') continue;

        let isMatched = false;
        const target = rule.Item_code;

        if (target.startsWith('*') && target.endsWith('*')) {
          const keyword = target.slice(1, -1);
          if (itemCell.includes(keyword)) isMatched = true;
        } else if (target !== "") {
          const baseItemCode = itemCell.split(',')[0];
          if (baseItemCode === target) isMatched = true;
        }

        if ((rule.Treasure_Class === "" && target !== "" && isMatched) || 
            (rule.Treasure_Class !== "" && rowTCName === rule.Treasure_Class && isMatched) ||
            (rule.Treasure_Class !== "" && target === "" && itemCell === rule.Treasure_Class)) {
          row['Item' + i] = '';
          row['Prob' + i] = '';
        }
      }
    } 
    else if (rule.mode === "add" && rowTCName === rule.Treasure_Class) {
      let exists = false;
      let totalProb = 0, count = 0, firstEmpty = -1;
      for (let i = 1; i <= 10; i++) {
        const item = row['Item' + i];
        const prob = parseInt(row['Prob' + i]);
        if (item === rule.Item_code) { exists = true; break; }
        if (item !== '' && item !== null) {
          if (!isNaN(prob)) { totalProb += prob; count++; }
        } else if (firstEmpty === -1) { firstEmpty = i; }
      }
      if (!exists && firstEmpty !== -1) {
        const mult = rule.probMult !== undefined ? rule.probMult : 1.0;
        let avgProb = count > 0 ? (totalProb / count) : 10;
        let finalProb = Math.round(avgProb * mult);
        if (finalProb < 1) finalProb = 1;
        row['Item' + firstEmpty] = rule.Item_code;
        row['Prob' + firstEmpty] = finalProb.toString();
      }
    }
  });

  // 第一次压缩
  let activeItems = [];
  for (let i = 1; i <= 10; i++) {
    if (row['Item' + i] !== '' && row['Item' + i] !== null) {
      activeItems.push({ name: row['Item' + i], prob: row['Prob' + i] });
    }
  }
  for (let i = 1; i <= 10; i++) {
    if (i <= activeItems.length) {
      row['Item' + i] = activeItems[i - 1].name;
      row['Prob' + i] = activeItems[i - 1].prob;
    } else {
      row['Item' + i] = ''; row['Prob' + i] = '';
    }
  }

  // 如果这一行完全空了，记录它的名字
  if (activeItems.length === 0 && rowTCName !== '') {
    emptyTCs.add(rowTCName);
  }
});

// --- 第二遍扫描：清理指向空行的引用 (彻底解决漏网之鱼) ---
if (emptyTCs.size > 0) {
  treasureclassex.rows.forEach((row) => {
    let needsRecompact = false;

    for (let i = 1; i <= 10; i++) {
      const itemCell = row['Item' + i];
      if (itemCell !== '' && emptyTCs.has(itemCell)) {
        row['Item' + i] = '';
        row['Prob' + i] = '';
        needsRecompact = true;
      }
    }

    if (needsRecompact) {
      let finalItems = [];
      for (let i = 1; i <= 10; i++) {
        if (row['Item' + i] !== '' && row['Item' + i] !== null) {
          finalItems.push({ name: row['Item' + i], prob: row['Prob' + i] });
        }
      }
      for (let i = 1; i <= 10; i++) {
        if (i <= finalItems.length) {
          row['Item' + i] = finalItems[i - 1].name;
          row['Prob' + i] = finalItems[i - 1].prob;
        } else {
          row['Item' + i] = ''; row['Prob' + i] = '';
        }
      }
    }
  });
}

D2RMM.writeTsv(treasureclassexFilename, treasureclassex);