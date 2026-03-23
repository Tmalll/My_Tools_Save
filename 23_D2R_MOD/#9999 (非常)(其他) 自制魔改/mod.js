// ************************ 修改(戒指, 项链, 珠宝, 护符)的掉率 ************************ //
const treasureClassfilename = 'global\\excel\\treasureclassex.txt';
const treasureClass = D2RMM.readTsv(treasureClassfilename);
      
      // 先统一基础掉率, 平衡戒指, 项链, 珠宝, 护符的基础掉落
      const Base_TARGET_ITEMS = ['rin', 'amu', 'jew', 'cm3', 'cm2', 'cm1'];
      treasureClass.rows.forEach(row => {
        for (let i = 1; i <= 10; i++) {
          const itemKey = `Item${i}`;
          const probKey = `Prob${i}`;
          if (Base_TARGET_ITEMS.includes(row[itemKey])) {
            const originalValue = Number(row[probKey]);
            if (!isNaN(originalValue) && originalValue > 0) {
              row[probKey] = 15; // 平衡后的值
            }
          }
        }
      });

      // 增加(戒指, 项链, 珠宝, 护符)的掉落量
      // 掉落量倍数
      const PICKS_MULTIPLIER = 1; // 增加(戒指, 项链, 珠宝, 护符)的基础掉落量
      const TARGET_ROWS = ['Jewelry A', 'Jewelry B', 'Jewelry C'];
      treasureClass.rows.forEach(row => {
        if (TARGET_ROWS.includes(row['Treasure Class'])) {
          const originalPicks = Number(row['Picks']);
          if (!isNaN(originalPicks) && originalPicks > 0) {
            row['Picks'] = originalPicks * PICKS_MULTIPLIER;
          }
        }
      });

      // 增加更上一级的掉落量
      // Act 1 Good
      // Act 2 Good
      // Act 3 Good
      // Act 4 Good
      // Act 5 Good
      // Act 1 (N) Good
      // Act 2 (N) Good
      // Act 3 (N) Good
      // Act 4 (N) Good
      // Act 5 (N) Good
      // Act 1 (H) Good
      // Act 2 (H) Good
      // Act 3 (H) Good
      // Act 4 (H) Good
      // Act 5 (H) Good
      // 就是修改这几个表的Picks来增加掉落量
      // 掉落量倍数
      const PICKS_MULTIPLIER2 = 2;
      const TARGET_ROWS2 = ['Jewelry A', 'Jewelry B', 'Jewelry C'];
      treasureClass.rows.forEach(row => {
        for (let i = 1; i <= 10; i++) {
          const itemKey = `Item${i}`;
          if (TARGET_ROWS2.includes(row[itemKey])) {
            const originalPicks = Number(row['Picks']);
            if (!isNaN(originalPicks) && originalPicks > 0) {
              row['Picks'] = originalPicks * PICKS_MULTIPLIER2;
            }
            break; // 找到一个就够了，不需要继续检查
          }
        }
      });

      // 修改包含这些表的掉落表, 提高权重.
      const ACT_GOOD_LIST = [
        'Act 1 Good',
        'Act 2 Good',
        'Act 3 Good',
        'Act 4 Good',
        'Act 5 Good',
        'Act 1 (N) Good',
        'Act 2 (N) Good',
        'Act 3 (N) Good',
        'Act 4 (N) Good',
        'Act 5 (N) Good',
        'Act 1 (H) Good',
        'Act 2 (H) Good',
        'Act 3 (H) Good',
        'Act 4 (H) Good',
        'Act 5 (H) Good'
      ];
      const PROB_ADD_VALUE = 2; // 权重倍数
      treasureClass.rows.forEach(row => {
        // 遍历 Item1 ~ Item10
        for (let i = 1; i <= 10; i++) {
          const itemKey = `Item${i}`;
          const probKey = `Prob${i}`;

          // 如果当前 Item 是目标 Act Good 类别
          if (ACT_GOOD_LIST.includes(row[itemKey])) {
            const originalValue = Number(row[probKey]);
            if (!isNaN(originalValue) && originalValue > 0) {
              // 原值 + 增加值
              row[probKey] = originalValue * PROB_ADD_VALUE;
            }
          }
        }
      });

D2RMM.writeTsv(treasureClassfilename, treasureClass);



// ************************ 技能参数修改器 ************************ //
const skills2Filename = 'global\\excel\\skills.txt';
const skills2 = D2RMM.readTsv(skills2Filename);

const skills2modifyList = [

    //  { // 暴风雪
    //    sID: "59", 
    //    mods: { "EDmgSymPerCalc": "(skill('Ice Bolt'.blvl)+skill('Ice Blast'.blvl)+skill('Glacial Spike'.blvl))*par8 + (skill('Blizzard'.blvl) * 20)",
    //            "Param8": "10" // 默认: 5, 新增自身每升1级+20%伤害.
    //    }
    //  },
      { sID: "64", // 冰封球
        mods: { //  "EDmgSymPerCalc": "(skill('Ice Bolt'.blvl)+skill('Ice Blast'.blvl)+skill('Glacial Spike'.blvl)+skill('Frost Nova'.blvl)+skill('Blizzard'.blvl))*par8 + (skill('Frozen Orb'.blvl) * 25)",
                  "EDmgSymPerCalc": "(skill('Ice Bolt'.blvl)*par8) + (skill('Frozen Orb'.blvl) * par8)",
                  "Param8": "10" // 默认: 2
        }
      },
      { sID: "48", // 闪电新星
        mods: { // "EDmgSymPerCalc": "(skill('Static Field'.blvl))*par8" // 默认          
                   "Param8": "10", // 默认: 5
                   "EDmgSymPerCalc": "(skill('Static Field'.blvl)+skill('Nova'.blvl))*par8" // 除了原有的静电立场, 还和自己联动.
        }
      }
];

skills2modifyList.forEach(entry => {
  const row = skills2.rows.find(r => r['*Id'] === entry.sID);
  if (row) Object.assign(row, entry.mods);
});
D2RMM.writeTsv(skills2Filename, skills2);


// ************************ 射弹速度修改（精准匹配 Missile + "*ID"） ************************ //
const missileFilename = "global\\excel\\missiles.txt";
const missileTable = D2RMM.readTsv(missileFilename);
const missilesmodifyList = [
  { ids: [{ Missile: "hydra", "*ID": "247" }],mods: {
      Vel: "30",      // 速度,越大越快. 默认16
      MaxVel: "30",   // 速度,越大越快. 默认16      
      Range: "75"//,     // 距离, 单位针, 存活时间按针算, 25针=1秒.
      // SrcDamage: "96"

    }
  },
  { ids: [{ Missile: "firebolt", "*ID": "58" }],mods: {
      Vel: "30",      // 速度,越大越快. 默认20
      MaxVel: "30",   // 速度,越大越快. 默认20
      Range: "75"     // 距离, 单位针, 存活时间按针算, 25针=1秒.
    }
  },
  { ids: [{ Missile: "icebolt", "*ID": "59" }],mods: {
      Vel: "30",      // 速度,越大越快. 默认12
      MaxVel: "30",   // 速度,越大越快. 默认12
      Range: "75"     // 距离, 单位针, 存活时间按针算, 25针=1秒.
    }
  },
  { ids: [{ Missile: "blizzardcenter", "*ID": "158" }],mods: { // 修改暴风雪技能持续时间.
      "Range": "100",  // 基础持续时间, 1秒=25
      "LevRange": "5"  // 每级增加多少, 1秒=25
    }
  },
];

missilesmodifyList.forEach(({ ids, mods }) => {
  ids.forEach((criteria) => {
    missileTable.rows.forEach((row) => {
      const match = Object.entries(criteria).every(
        ([key, val]) => row[key] === val
      );
      if (match) {
        Object.entries(mods).forEach(([key, value]) => {
          row[key] = value;
        });}});});});
D2RMM.writeTsv(missileFilename, missileTable);



// ************************ 修改独特物品(暗金) ************************ //
const filename = 'global\\excel\\uniqueitems.txt';
const file = D2RMM.readTsv(filename);

const modifyList = [
  {
    ids: [400],   // Hellfire Torch, 示例ID，替换成你需要的数字ID ids: [400, 401],
    mods: {
      "carry1": "1",

      "prop5": "kill-skill",  // 击中时释放
      "par5": "197",          // 197=火炬风暴
      "min5": "10",            // 触发率
      "max5": "20",           // 技能等级

      "prop6": "kill-skill",  // 杀敌后释放
      "par6": "62",           // 62=九头蛇
      "min6": "30",           // 触发率
      "max6": "30",           // 技能等级
    }
  }  
];

modifyList.forEach(rule => {
  file.rows.forEach(row => {
    if (rule.ids.includes(Number(row["*ID"]))) {
      for (const [key, val] of Object.entries(rule.mods)) {
        row[key] = val;
      }
    }
  });
});
D2RMM.writeTsv(filename, file);



// ************************ 通用魔法词缀字段替换修复器 ************************ //
const targetFiles = [
  'global\\excel\\automagic.txt',
  'global\\excel\\magicprefix.txt',
  'global\\excel\\magicsuffix.txt',
];

// 替换规则（四个字段全匹配才替换）
const replacements = [
  {match: ['att-skill', '53', '5', '3'], replace: ['hit-skill', '53', '8', '6'],},
  {match: ['att-skill', '53', '8', '3'], replace: ['hit-skill', '53', '11', '9'],},
  {match: ['att-skill', '53', '8', '5'], replace: ['hit-skill', '53', '14', '12'],},
];

for (const filename of targetFiles) {
  const file = D2RMM.readTsv(filename);
  let modifiedCount = 0;
  for (const row of file.rows) {
    for (let i = 1; i <= 3; i++) {
      const codeKey  = `mod${i}code`;
      const paramKey = `mod${i}param`;
      const minKey   = `mod${i}min`;
      const maxKey   = `mod${i}max`;
      for (const { match, replace } of replacements) {
        const [mCode, mParam, mMin, mMax] = match;
        const [rCode, rParam, rMin, rMax] = replace;
        if ( row[codeKey] === mCode &&
            (row[paramKey] || '') === mParam &&
            (row[minKey]   || '') === mMin &&
            (row[maxKey]   || '') === mMax
        ) { row[codeKey]  = rCode;
            row[paramKey] = rParam;
            row[minKey]   = rMin;
            row[maxKey]   = rMax;
            modifiedCount++;
        }}}}
  D2RMM.writeTsv(filename, file);
  console.log(`${filename}: 修改了 ${modifiedCount} 个词缀`);
}



// **************************** 魔法技能获得武器伤害 **************************** //
const skillsFilename = "global\\excel\\skills.txt";
const skillsFile = D2RMM.readTsv(skillsFilename);
const weaponDamageMap = {
  128: [ '49' ], // 100% 49=闪电
  96:  [ '48', '53' ], // 75% 48=闪电新星 53=连锁闪电
  64:  [ '55', '44' ], // 50% 55=冰尖柱 44=冰霜新星
  32:  [ '38' ], // 25%
  1:   [ ]  // 1%
};
skillsFile.rows.forEach((skill) => {
  const skillId = String(skill["*Id"]);
  for (const [srcDam, ids] of Object.entries(weaponDamageMap)) {
    if (ids.includes(skillId)) {
      skill["SrcDam"] = parseInt(srcDam);
      break;
    }
  }
});
D2RMM.writeTsv(skillsFilename, skillsFile);

// 冰系
// 44=冰霜新星, 以敌人为中心产生连锁反应.
// 55=冰尖柱, 以敌人为中心产生连锁反应.
// 64=冰封球, 以自己为中心产生连锁反应.
// 59=暴风雪, 以敌人为中心产生连锁反应.

// 火系
// 51=火墙, 以敌人为中心产生连锁反应.
// 56=陨石, 无连锁反应.
// 234=dru的裂隙,英文=Eruption,原翻译名字不对. 以敌人为中心产生连锁反应
// 197=英雄火炬(Hellfire Torch)无连锁反应
// 62=Hydra=九头蛇
// Volcano 244 火山

// 电系
// 49=闪电(Lightning), 以敌人为中心产生连锁反应.
// 48=闪电新星, 以敌人为中心产生连锁反应.
// 53=连锁闪电(Chain Lightning), 以敌人为中心产生连锁反应.
// 121=天堂之拳(Fist of the Heavens)

// 魔法, 其他.
// Teeth 67 牙 
// Bone Spear  84 骨矛
// 92=毒新星, 以自己为中心产生连锁反应.
// 74=尸爆, 特效显示有些问题.
// 273=心灵爆震
// Poison Explosion 83=毒爆=75%武器伤害加成
// Tornado 245 龙卷风



// ******************************** 手工艺品装备大修 ********************************** //
const recipeFilename = 'global\\excel\\cubemain.txt';
const recipeFile = D2RMM.readTsv(recipeFilename);

// 精简 原版的 description 字段
const allowedKeywords = ['Hit Power', 'Blood', 'Caster', 'Safety', 'MyCustom'];
recipeFile.rows.forEach((row) => {
  const desc = row['description'];
  if (desc && desc.includes('->')) {
    const result = desc.split('->')[1].trim();
    if (allowedKeywords.some(keyword => result.startsWith(keyword))) {
      row['description'] = 'MyCustom Crafted ' + result;
    }
  }
});

/// 统一修改原版"input1"可接受的装备类型
const keywordMap = {
  "Helm": "helm,upg", 
  "Boots": "boot,upg", 
  "Gloves": "glov,upg", 
  "Belt": "belt,upg",
  "Shield": "shie,upg", 
  "Body": "tors,upg", 
  "Amulet": "amul", 
  "Ring": "ring", 
  "Weapon": "mele,upg" // weap=所有武器, mele=只近战武器, miss=弓弩, thro=投掷武器, comb=混合武器, 投掷近战.
};
const baseKeywords = ["Hit Power", "Blood", "Caster", "Safety"];
recipeFile.rows.forEach((recipe) => {
  const desc = recipe["description"];
    
  for (const [suffix, input] of Object.entries(keywordMap)) {
    if (baseKeywords.some(base => desc.includes(`${base} ${suffix}`))) {
      recipe["input 1"] = input;
      recipe["ilvl"] = "100"; // 使用第一个输入物品等级的百分比来确定输出等级
      recipe["plvl"] = ""; // 使用玩家等级的百分比来确定输出等级
      recipe["lvl"] = ""; // 强制设定输出物品的等级
      break;
    }
  }
  if (baseKeywords.some(base => desc.includes(base))) { // 兼容远程武器不消耗弹药MOD增加的手工配方
    if (recipe["input 1"].includes("bowq,mag")) {
      recipe["input 1"] = "bowq";
      recipe["ilvl"] = "100";
      recipe["plvl"] = "";
      recipe["lvl"] = "";
    } else if (recipe["input 1"].includes("xboq,mag")) {
      recipe["input 1"] = "xboq";
      recipe["ilvl"] = "100";
      recipe["plvl"] = "";
      recipe["lvl"] = "";
    }
  }
});

// === 各大类统一修改 ===
const batchMods = [
  // Hit Power
  { keyword: "Hit Power",
    mods: {
      "input 3": "r10",         // #10=冰伤害
      "input 4": "gpb",         // 完美蓝宝石

      "mod 1": "ease",            // 需求降低
      "mod 1 chance": "",
      "mod 1 param": "",
      "mod 1 min": "-100",
      "mod 1 max": "-100",

      "mod 2": "dmg-cold/lvl",  // 每8=1/级
      "mod 2 chance": "",
      "mod 2 param": "16",      // 每级+2点伤害
      "mod 2 min": "",
      "mod 2 max": "",

      "mod 3": "",
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "",
      "mod 3 max": "",

      "mod 4": "crush",         // 粉碎打击
      "mod 4 chance": "",
      "mod 4 param": "",
      "mod 4 min": "20",        // 触发率
      "mod 4 max": "20",

      "mod 5": "mag%/lvl",      // 每8点数值, 加1%寻找魔法装备/人物等级
      "mod 5 chance": "",
      "mod 5 param": "40",      // 每级+5%寻找魔法装备
      "mod 5 min": "",
      "mod 5 max": "",
    },
  },
  { keyword: "Hit Power Weapon",
    mods: {
      "mod 2": "dmg-cold/lvl",    // 每8=1/级
      "mod 2 chance": "",
      "mod 2 param": "40",        // 每级+5点伤害
      "mod 2 min": "",
      "mod 2 max": "",

      "mod 3": "dmg/lvl",         // 每8=1/级
      "mod 3 chance": "",
      "mod 3 param": "40",        // 每级+5点伤害
      "mod 3 min": "",
      "mod 3 max": "",
      
      "mod 4": "crush",           // 粉碎打击
      "mod 4 chance": "",
      "mod 4 param": "",
      "mod 4 min": "40",          // 触发率
      "mod 4 max": "40",

      "mod 5": "att-skill",       // 攻击时, 只对近战生效
      "mod 5 chance": "",
      "mod 5 param": "44",        // 技能ID=44=冰霜新星
      "mod 5 min": "50",          // 触发率
      "mod 5 max": "3",           // 技能等级
    },
  },
  { keyword: "Hit Power Amulet",
    mods: {
      "mod 1": "addxp",         // 增加经验
      "mod 1 chance": "",
      "mod 1 param": "",
      "mod 1 min": "100",
      "mod 1 max": "100", 

      "mod 3": "hit-skill",       // 攻击时, 只对近战生效
      "mod 3 chance": "",
      "mod 3 param": "59",        // 59=暴风雪
      "mod 3 min": "10",          // 触发率
      "mod 3 max": "15",          // 技能等级
    },
  },
  { keyword: "Hit Power Ring",
    mods: {
      "mod 1": "hit-skill",       // 命中时, 近战远程都生效.
      "mod 1 chance": "",
      "mod 1 param": "44",        // 技能ID=44=冰霜新星
      "mod 1 min": "5",           // 触发率
      "mod 1 max": "3",           // 技能等级

      "mod 3": "pierce-cold",     // 降低敌人冰抗
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "50",
      "mod 3 max": "50",
    },
  },
  { keyword: "Hit Power Gloves",   // 手套
    mods: {
      "mod 3": "freeze",           // 冻结目标
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "10",
      "mod 3 max": "10",
    },
  },
  { keyword: "Hit Power Belt",     // 腰带
    mods: {
      "mod 3": "balance2",         // 更快打击恢复
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "100",
      "mod 3 max": "100",
    },
  },
  { keyword: "Hit Power Boots",
    mods: {
      "mod 3": "move2",            // 移速
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "50",
      "mod 3 max": "50",
    },
  },
  { keyword: "Hit Power Helm",
    mods: {
      "mod 3": "balance2",         // 更快打击恢复
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "100",
      "mod 3 max": "100",
    },
  },
  { keyword: "Hit Power Shield",
    mods: {
      "mod 3": "gethit-skill",    // 被击中时
      "mod 3 chance": "",
      "mod 3 param": "59",        // 59=暴风雪
      "mod 3 min": "100",         // 触发率
      "mod 3 max": "20",          // 技能等级
    },
  },
  { keyword: "Hit Power Body",
    mods: {
      "mod 3": "balance2",         // 更快打击恢复
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "100",
      "mod 3 max": "100",
    },
  },

  // Blood
  { keyword: "Blood",
    mods: {
      "input 3": "r08",         // #8=火伤害
      "input 4": "gpr",         // 完美红宝石

      "mod 1": "ease",          // 需求降低
      "mod 1 chance": "",
      "mod 1 param": "",
      "mod 1 min": "-100",
      "mod 1 max": "-100",

      "mod 2": "lifesteal",     // 吸血
      "mod 2 chance": "",
      "mod 2 param": "",
      "mod 2 min": "3",
      "mod 2 max": "3",

      "mod 3": "",
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "",
      "mod 3 max": "",

      "mod 4": "hp/lvl",        // 每8=1点生命值.
      "mod 4 chance": "",
      "mod 4 param": "40",      // 每级+5点生命值.
      "mod 4 min": "",
      "mod 4 max": "",

      "mod 5": "mag%/lvl",      // 每8点数值, 加1%寻找魔法装备/人物等级
      "mod 5 chance": "",
      "mod 5 param": "40",      // 每级+5%寻找魔法装备
      "mod 5 min": "",
      "mod 5 max": "",
    },
  },
  { keyword: "Blood Weapon",
    mods: {
      "mod 2": "lifesteal",     // 吸血
      "mod 2 chance": "",
      "mod 2 param": "",
      "mod 2 min": "9",
      "mod 2 max": "9",

      "mod 3": "dmg%",          // 增加伤害
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "180",
      "mod 3 max": "180",

      "mod 4": "hp/lvl",        // 每8=1点生命值.
      "mod 4 chance": "",
      "mod 4 param": "40",      // 每级+5点生命值.
      "mod 4 min": "",
      "mod 4 max": "",

      "mod 5": "hit-skill",     // 命中时, 对近和远程都生效, 但容易产生连锁反应
      "mod 5 chance": "",
      "mod 5 param": "56",      // 56=陨石=75%武器伤害加成
      "mod 5 min": "15",        // 触发率
      "mod 5 max": "1",         // 技能等级
    },
  },
  { keyword: "Blood Amulet",
    mods: {
      "mod 1": "addxp",         // 增加经验
      "mod 1 chance": "",
      "mod 1 param": "",
      "mod 1 min": "100",
      "mod 1 max": "100",

      "mod 3": "hit-skill",     // 命中时, 对近和远程都生效, 但容易产生连锁反应
      "mod 3 chance": "",
      "mod 3 param": "234",     // 234=地裂=100%武器伤害加成
      "mod 3 min": "10",        // 触发率
      "mod 3 max": "1",         // 技能等级
    },
  },
  { keyword: "Blood Ring",
    mods: {
      "mod 1": "hit-skill",     // 命中时, 对近和远程都生效, 但容易产生连锁反应
      "mod 1 chance": "",
      "mod 1 param": "56",      // 56=陨石=75%武器伤害加成
      "mod 1 min": "5",         // 触发率
      "mod 1 max": "1",         // 技能等级

      "mod 3": "pierce-fire",   // 降低敌人火抗
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "50",
      "mod 3 max": "50",
    },
  },
  { keyword: "Blood Gloves", 
    mods: {
      "mod 3": "deadly",        // 致命攻击%
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "30",
      "mod 3 max": "30",
    },
  },  
  { keyword: "Blood Belt", 
    mods: {
      "mod 3": "openwounds",     // 开放伤口%
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "30",
      "mod 3 max": "30",
    },
  },  
  { keyword: "Blood Boots", 
    mods: {
      "mod 3": "deadly",        // 致命攻击%
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "30",
      "mod 3 max": "30",
    },
  }, 
  { keyword: "Blood Helm", 
    mods: {
      "mod 3": "openwounds",     // 开放伤口%
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "30",
      "mod 3 max": "30",
    },
  }, 
  { keyword: "Blood Shield", 
    mods: {
      "mod 3": "gethit-skill",    // 被击中时
      "mod 3 chance": "",
      "mod 3 param": "234",       // 234=地裂=100%武器伤害加成
      "mod 3 min": "100",         // 触发率
      "mod 3 max": "10",          // 技能等级
    },
  },
  { keyword: "Blood Body", 
    mods: {
      "mod 3": "deadly",        // 致命攻击%
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "30",
      "mod 3 max": "30",
    },
  },  

  // Caster
  { keyword: "Caster",
    mods: {
      "input 3": "r09",       // #9=电伤害
      "input 4": "gpy",       // 完美黄宝石

      "mod 1": "ease",        // 需求降低
      "mod 1 chance": "",
      "mod 1 param": "",
      "mod 1 min": "-100",
      "mod 1 max": "-100",

      "mod 2": "cast2",       // 增加施法速度
      "mod 2 chance": "",
      "mod 2 param": "",
      "mod 2 min": "20",
      "mod 2 max": "20",

      "mod 3": "",
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "",
      "mod 3 max": "",

      "mod 4": "mana/lvl",    // 法力值
      "mod 4 chance": "",
      "mod 4 param": "40",    // 每级+5点法力值
      "mod 4 min": "",
      "mod 4 max": "",

      "mod 5": "mag%/lvl",    // 每级+5%寻找魔法装备
      "mod 5 chance": "",
      "mod 5 param": "40",
      "mod 5 min": "",
      "mod 5 max": "",
    },
  },
  { keyword: "Caster Weapon",
    mods: {
      "mod 2": "cast2",       // 增加施法速度
      "mod 2 chance": "",
      "mod 2 param": "",
      "mod 2 min": "60",
      "mod 2 max": "60",

      "mod 3": "dmg%",        // 增加伤害
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "180",
      "mod 3 max": "180", 

      "mod 4": "mana/lvl",    // 法力值
      "mod 4 chance": "",
      "mod 4 param": "40",    // 每级+5点法力值
      "mod 4 min": "",
      "mod 4 max": "",

      "mod 5": "hit-skill",   // 命中时, 对近和远程都生效, 但容易产生连锁反应
      "mod 5 chance": "",
      "mod 5 param": "49",    // 49=闪电=100%武器伤害加成
      "mod 5 min": "15",      // 触发率
      "mod 5 max": "1",       // 技能等级
    },
  },
  { keyword: "Caster Amulet",
    mods: {
      "mod 1": "addxp",         // 增加经验
      "mod 1 chance": "",
      "mod 1 param": "",
      "mod 1 min": "100",
      "mod 1 max": "100",

      "mod 3": "hit-skill",     // 命中时
      "mod 3 chance": "",
      "mod 3 param": "53",      // 53=连锁闪电=75%武器伤害加成
      "mod 3 min": "10",        // 触发率
      "mod 3 max": "1",         // 技能等级
    },
  },
  { keyword: "Caster Ring",
    mods: {
      "mod 1": "hit-skill",     // 命中时
      "mod 1 chance": "",
      "mod 1 param": "49",      // 49=闪电=100%武器伤害加成
      "mod 1 min": "5",         // 触发率
      "mod 1 max": "1",         // 技能等级

      "mod 3": "pierce-ltng",   // 降低敌人电抗
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "50",
      "mod 3 max": "50",
    },
  },
  { keyword: "Caster Gloves", // 手套
    mods: {
      "mod 3": "mana-kill",   // 杀人回蓝
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "5",
      "mod 3 max": "5",
    },
  },
  { keyword: "Caster Belt",   // 腰带
    mods: {
      "mod 3": "slow",        // 减速目标%
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "75",
      "mod 3 max": "75",
    },
  },
  { keyword: "Caster Boots", // 鞋
    mods: {
      "mod 3": "move2", // 移速
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "50",
      "mod 3 max": "50",
    },
  },
  { keyword: "Caster Helm", // 头
    mods: {
      "mod 3": "heal-kill", // 击杀回血
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "5",
      "mod 3 max": "5",
    },
  },
  { keyword: "Caster Shield", // 盾
    mods: {
      "mod 3": "gethit-skill",    // 被击中时
      "mod 3 chance": "",
      "mod 3 param": "53",        // 53=连锁闪电=75%武器伤害加成
      "mod 3 min": "100",         // 触发率
      "mod 3 max": "10",          // 技能等级
    },
  },
  { keyword: "Caster Body",  // 衣
    mods: {
      "mod 3": "regen-mana",  // 法力回复
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "200",
      "mod 3 max": "200",
    },
  },

  // Safety
  { keyword: "Safety",
    mods: {
      "input 3": "r07",           // #7=毒伤害
      "input 4": "gpg",           // 完美绿宝石

      "mod 1": "ease",            // 需求降低
      "mod 1 chance": "",
      "mod 1 param": "",
      "mod 1 min": "-100",
      "mod 1 max": "-100",

      "mod 2": "thorns/lvl",      // 反弹伤害, 每8=1/级
      "mod 2 chance": "",
      "mod 2 param": "40",        // 每级+5反弹伤害
      "mod 2 min": "",
      "mod 2 max": "",

      "mod 3": "red-dmg",         // 物理减伤, 固定值
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "50",
      "mod 3 max": "50",

      "mod 4": "red-mag",         // 魔法减伤, 固定值
      "mod 4 chance": "",
      "mod 4 param": "",
      "mod 4 min": "50",
      "mod 4 max": "50",

      "mod 5": "mag%/lvl",        // 每级+5%寻找魔法装备
      "mod 5 chance": "",
      "mod 5 param": "40",
      "mod 5 min": "",
      "mod 5 max": "",
    },
  },
  { keyword: "Safety Weapon",
    mods: {
      "mod 2": "hit-skill",       // 击中敌人时
      "mod 2 chance": "",
      "mod 2 param": "92",        // 92=毒新星=75%武器伤害加成
      "mod 2 min": "10",          // 触发率
      "mod 2 max": "1",           // 技能等级

    //  "mod 3": "dmg-elem",      // 增加三种元素伤害. 冰/火/电分别增加, 255-511, 电63-1023
    //  "mod 3 chance": "",
    //  "mod 3 param": "",
    //  "mod 3 min": "250",
    //  "mod 3 max": "500",

      "mod 3": "swing2",          // 增加攻速%
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "100",
      "mod 3 max": "100", 

      "mod 4": "dmg-mag",         // 增加魔法伤害. 最大值255-511
      "mod 4 chance": "",
      "mod 4 param": "",
      "mod 4 min": "250",
      "mod 4 max": "500", 

      "mod 5": "hit-skill",       // 命中敌人时
      "mod 5 chance": "",
      "mod 5 param": "84",        // 84=骨矛=75%武器伤害加成
      "mod 5 min": "35",          // 触发率
      "mod 5 max": "1",           // 技能等级
    },
  },
  { keyword: "Safety Amulet",
    mods: {
      "mod 1": "addxp",           // 增加经验
      "mod 1 chance": "",
      "mod 1 param": "",
      "mod 1 min": "100",
      "mod 1 max": "100",

      "mod 2": "hit-skill",       // 击中敌人时
      "mod 2 chance": "",
      "mod 2 param": "92",        // 92=毒新星=75%武器伤害加成
      "mod 2 min": "10",          // 触发率
      "mod 2 max": "1",           // 技能等级

  //    "mod 2": "freeze",          // 冻结敌人
  //    "mod 2 chance": "",
  //    "mod 2 param": "",
  //    "mod 2 min": "10",
  //    "mod 2 max": "10",

  //    "mod 2": "stupidity",       // 致盲目标
  //    "mod 2 chance": "",
  //    "mod 2 param": "",
  //    "mod 2 min": "3",
  //    "mod 2 max": "3",
    },
  },
  { keyword: "Safety Ring",
    mods: {
      "mod 2": "hit-skill",       // 击中敌人时
      "mod 2 chance": "",
      "mod 2 param": "92",        // 92=毒新星=75%武器伤害加成
      "mod 2 min": "5",           // 触发率
      "mod 2 max": "1",           // 技能等级

      "mod 2": "pierce-pois",     // 减敌人毒素抗性
      "mod 2 chance": "",
      "mod 2 param": "",
      "mod 2 min": "50",
      "mod 2 max": "50",
    },
  },
  { keyword: "Safety Shield",
    mods: {
      "mod 5": "gethit-skill",    // 被击中时
      "mod 5 chance": "",
      "mod 5 param": "92",        // 92=毒新星=75%武器伤害加成
      "mod 5 min": "100",         // 触发率
      "mod 5 max": "10",          // 技能等级
    },
  },

  // Bolt
  { keyword: "Bolt",
    mods: {
      "mod 1": "stupidity",       // 致盲目标
      "mod 1 chance": "",
      "mod 1 param": "",
      "mod 1 min": "3",
      "mod 1 max": "3",
    },
  },    
  
];
batchMods.forEach((batch) => {
  recipeFile.rows.forEach((recipe) => {
    if (recipe["description"] && recipe["description"].includes(batch.keyword)) {
      for (const [key, val] of Object.entries(batch.mods)) {
        recipe[key] = val;
      }
    }
  });
});



/// 副武器复制的配方
const recipeCopies = [
  {
    baseDescription: "Hit Power Weapon",
    newDescription: "Crafted Hit Power Missile",
    changes: {
      "input 1": "miss,upg",

      "mod 4": "oskill",          // 获得附加技能
      "mod 4 chance": "",
      "mod 4 param": "31",        // 急冻箭
      "mod 4 min": "1",
      "mod 4 max": "1",

      "mod 5": "hit-skill",       // 攻击时, 只对近战生效
      "mod 5 chance": "",
      "mod 5 param": "59",        // 59=暴风雪
      "mod 5 min": "15",          // 触发率
      "mod 5 max": "15",          // 技能等级  
    },
  },
  {
    baseDescription: "Hit Power Weapon",
    newDescription: "Crafted Hit Power Combo",
    changes: {
      "input 1": "comb,upg",
      "input 5": "yps", // 添加一个解毒药剂
      "numinputs": "5",

      "mod 4": "pierce",        // 穿刺攻击%
      "mod 4 chance": "",
      "mod 4 param": "",
      "mod 4 min": "100",
      "mod 4 max": "100",

      "mod 5": "hit-skill",       // 攻击时, 只对近战生效
      "mod 5 chance": "",
      "mod 5 param": "59",        // 59=暴风雪
      "mod 5 min": "15",          // 触发率
      "mod 5 max": "15",          // 技能等级 
    },
  },
  {
    baseDescription: "Blood Weapon",
    newDescription: "Crafted Blood Missile",
    changes: {
      "input 1": "miss,upg",

      "mod 4": "oskill",      // 给与技能
      "mod 4 chance": "",
      "mod 4 param": "26",    // 26=速射Strafe=自带100%武器伤害. 1级5目标, 6级10目标.
      "mod 4 min": "1",       // 技能等级
      "mod 4 max": "1",       // 技能等级

      "mod 5": "hit-skill",
      "mod 5 chance": "",
      "mod 5 param": "234",   // 234=地裂=100%武器伤害加成
      "mod 5 min": "15",      // 触发率
      "mod 5 max": "1",
    },
  },
  {
    baseDescription: "Blood Weapon",
    newDescription: "Crafted Blood Combo",
    changes: {
      "input 1": "comb,upg",
      "input 5": "yps", // 添加一个解毒药剂
      "numinputs": "5",

      "mod 4": "pierce", // 穿刺攻击%
      "mod 4 chance": "",
      "mod 4 param": "",
      "mod 4 min": "100",
      "mod 4 max": "100",

      "mod 5": "hit-skill",
      "mod 5 chance": "",
      "mod 5 param": "234",   // 234=地裂=100%武器伤害加成
      "mod 5 min": "15",      // 触发率
      "mod 5 max": "1",
    },
  },
  {
    baseDescription: "Caster Weapon",
    newDescription: "Crafted Caster Missile",
    changes: {
      "input 1": "miss,upg",

      "mod 4": "oskill",      // 给与技能
      "mod 4 chance": "",
      "mod 4 param": "26",    // 26=速射Strafe=自带100%武器伤害. 1级5目标, 6级10目标.
      "mod 4 min": "1",       // 技能等级
      "mod 4 max": "1",       // 技能等级      

      "mod 5": "hit-skill",   // 命中时, 对近和远程都生效, 但容易产生连锁反应
      "mod 5 chance": "",
      "mod 5 param": "53",    // 53=连锁闪电=75%武器伤害加成
      "mod 5 min": "15",      // 触发率
      "mod 5 max": "1",       // 技能等级
    },
  },
  {
    baseDescription: "Caster Weapon",
    newDescription: "Crafted Caster Combo",
    changes: {
      "input 1": "comb,upg",
      "input 5": "yps", // 添加一个解毒药剂
      "numinputs": "5",

    //  "mod 2": "oskill",      // 给与技能
    //  "mod 2 chance": "",
    //  "mod 2 param": "35",    // 35=闪电之怒=自带100%武器伤害. 4级5目标, 9级10目标.
    //  "mod 2 min": "4",       // 技能等级
    //  "mod 2 max": "4",       // 技能等级

      "mod 4": "pierce",      // 穿刺攻击%
      "mod 4 chance": "",
      "mod 4 param": "",
      "mod 4 min": "100",
      "mod 4 max": "100",

      "mod 5": "hit-skill",   // 命中时, 对近和远程都生效, 但容易产生连锁反应
      "mod 5 chance": "",
      "mod 5 param": "53",    // 53=连锁闪电=75%武器伤害加成
      "mod 5 min": "15",      // 触发率
      "mod 5 max": "1",       // 技能等级      
    },
  },
  {
    baseDescription: "Safety Weapon",
    newDescription: "Crafted Safety Missile",
    changes: {
      "input 1": "miss,upg",

      "mod 3": "oskill",          // 给与技能
      "mod 3 chance": "",
      "mod 3 param": "26",        // 26=速射Strafe=自带100%武器伤害. 1级5目标, 6级10目标.
      "mod 3 min": "1",           // 技能等级
      "mod 3 max": "1",           // 技能等级

      "mod 5": "hit-skill",       // 命中敌人时
      "mod 5 chance": "",
      "mod 5 param": "84",        // 84=骨矛=75%武器伤害加成
      "mod 5 min": "50",          // 触发率
      "mod 5 max": "1",           // 技能等级

    },
  },
  {
    baseDescription: "Safety Weapon",
    newDescription: "Crafted Safety Combo",
    changes: {
      "input 1": "comb,upg",
      "input 5": "yps",
      "numinputs": "5",

      "mod 3": "pierce",          // 穿刺攻击%
      "mod 3 chance": "",
      "mod 3 param": "",
      "mod 3 min": "100",
      "mod 3 max": "100",

      "mod 5": "hit-skill",       // 命中敌人时
      "mod 5 chance": "",
      "mod 5 param": "67",        // 67=牙=75%武器伤害加成
      "mod 5 min": "50",          // 触发率
      "mod 5 max": "30",          // 技能等级

    },
  },

  // 合成箭筒配方
  {
    baseDescription: "2 Arrows -> Bolts",
    newDescription: "Make Bolts",
    changes: {
      "input 1": "aqv,qty=2",
      "output": "cqv",
      "numinputs": "2",
    },
  },
  {
    baseDescription: "2 Bolts -> Arrows",
    newDescription: "Make Arrows",
    changes: {
      "input 1": "cqv,qty=2",
      "output": "aqv",
      "numinputs": "2",
    },
  },
];
recipeCopies.forEach((cfg) => {
  const base = recipeFile.rows.find(
    (recipe) =>
      recipe["description"] && recipe["description"].includes(cfg.baseDescription)
  );
  if (base) {
    const copy = { ...base };
    copy["description"] = cfg.newDescription;
    for (const [key, value] of Object.entries(cfg.changes)) {
      copy[key] = value;
    }
    recipeFile.rows.push(copy);
  } else {
    console.warn(`未找到 description 包含 "${cfg.baseDescription}" 的配方`);
  }
});

D2RMM.writeTsv(recipeFilename, recipeFile);





// ******************************** 创建白装可用的克隆配方 ********************************** //
const CloneFileName = "global\\excel\\cubemain.txt";
const CloneCubeMain = D2RMM.readTsv(CloneFileName);

// 关键词列表
const clonekeywords = ["Hit Power", "Blood", "Caster", "Safety"];

// 找到符合关键词的配方
const matchedRecipes = CloneCubeMain.rows.filter(recipe => {
  return recipe["description"] && clonekeywords.some(kw => recipe["description"].includes(kw));
});

// 复制并修改
matchedRecipes.forEach((original) => {
  const copy = { ...original };
  copy["description"] = (copy["description"] || "") + " MODcopy";
  copy["input 4"] = "isc";      // 鉴定卷轴, 原 冰符文+完美冰宝石+宝珠 >   冰符文+鉴定卷轴+宝珠
//  copy["numinputs"] = "5";
  copy["output"] = "usetype,mod";
  CloneCubeMain.rows.push(copy);
});

// 写回文件
D2RMM.writeTsv(CloneFileName, CloneCubeMain);









