const EXCLUDE_CODES = [
  // add skill points to class
  // value is class
  'randclassskill',
  // add skill points to specific skill
  // value is skill
  'skill-rand',
  // param = spell, min = charges, max = level
  // min/max can also be nagative: https://d2mods.info/forum/viewtopic.php?p=67042&highlight=magicsuffix+charged#67042
  'charged',
  // cast skill on action
  // param = spell, min = chance, max = level
  'att-skill',
  'death-skill',
  'gethit-skill',
  'hit-skill',
  'kill-skill',
  'levelup-skill',
  // variable damage affixes (e.g. +15-45 cold damage, randomized on each hit)
  // param = spell, min = min damage, max = max damage
  'dmg-fire',
  'dmg-ltng',
  'dmg-mag',
  'dmg-cold',
  'dmg-pois',
  'dmg-throw',
  'dmg-norm',
  'dmg-elem',
];

function UpdateRow(row, codeKey, minKey, maxKey) {
  const code = row[codeKey];
  const minValue = +row[minKey];
  const maxValue = +row[maxKey];

  if (EXCLUDE_CODES.indexOf(code) === -1 && minValue < maxValue) {
    row[minKey] = row[maxKey];
  }
}

// some rows in automagic/magicprefix/magicaffix serve as lower tier affixes
// for multiple different higher tier affixes (for example, a lower tier affix
// might work for weapons and armor, but from then on, weapon and armor progression
// follows different affixes)
// here, we split those affixes into multiple rows, one for each item type
// in order to not break existing items, we have to make sure we're appending to the
// end of the table, and not modifying any existing mods in terms of what item types
// they can appear on, so instead, we set them to unspawnable
function SplitAffixesIntoOneAffixPerItemType(rows, startIndex) {
  // we only need to do this if we're going to try to make affix tiers perfect
  if (config.equalchances !== 'perfect') {
    return;
  }

  // pad the rows so that we're always modifying the same index even
  // after the game updates and adds more affixes
  // this also enables to *very limited* compatibility with other mods
  // that do this kind of thing
  for (let i = rows.length; i < startIndex - 1; i++) {
    rows.push({ multiply: '0', 'add\r': 0 });
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    const types = [
      row.itype1,
      row.itype2,
      row.itype3,
      row.itype4,
      row.itype5,
      row.itype6,
      row.itype7,
    ].filter((type) => type !== '');

    // ignore rows for affixes that can't naturally spawn anyway
    if (row.spawnable != '1') {
      continue;
    }

    // ignore rows that already only influence one base item type
    if (types.length <= 1) {
      continue;
    }

    // set the raw as unspawnable
    row.spawnable = 0;

    // insert new rows instead
    for (const type of types) {
      rows.push({
        ...row,
        spawnable: 1,
        itype1: type,
        itype2: '',
        itype3: '',
        itype4: '',
        itype5: '',
        itype6: '',
        itype7: '',
      });
    }
  }
}

let affixTierMap = new Map();

function getAffixTierKey(row) {
  return `${row.group}:${row.itype1}:${row.mod1code}:${row.mod2code}:${row.mod3code}:${row.mod1param}:${row.mod2param}:${row.mod3param}`;
}

function CalculateAffixTierMap(rows) {
  // we only need to do this if we're going to try to make affix tiers perfect
  if (config.equalchances !== 'perfect') {
    return;
  }

  affixTierMap = new Map();
  for (const row of rows) {
    const key = getAffixTierKey(row);
    const set = affixTierMap.get(key) ?? new Set();
    affixTierMap.set(key, set.add(row));
  }
}

function getAllAffixTiers(row, rows) {
  const key = getAffixTierKey(row);
  const set = affixTierMap.get(key);
  return (
    [...set]
      // sort by affix tier in descending order
      .sort((a, b) => a.level - b.level)
  );
}

function UpdateFrequency(row, rows) {
  if (config.equalchances === true) {
    if (row.frequency != '' && row.frequency != '0') {
      // equalize the chances of all affix tiers within each group
      row.frequency = '1';
    }
  }

  if (config.equalchances === 'perfect') {
    if (row.level == '') {
      return;
    }

    // check if there's a previous affix tier for this affix
    const affixes = getAllAffixTiers(row, rows);
    const index = affixes.findIndex((r) => r.level == row.level);
    const previousAffixTier = index > 0 ? affixes[index - 1] : null;

    if (previousAffixTier != null) {
      // frequency can only hold a maximum value of 255, so instead of making
      // higher tiers of affixes *more likely* to drop, we just prevent lower
      // tiers of affixes from being able to drop for a higher level item at all
      previousAffixTier.maxlevel = row.level - 1;
    }
  }
}

if (config.runeword) {
  ['global\\excel\\runes.txt', 'global\\excel\\base\\runes.txt'].forEach(
    (fileName) => {
      const fileContent = D2RMM.readTsv(fileName);
      if (!fileContent) return;
      fileContent.rows.forEach((row) => {
        UpdateRow(row, 'T1Code1', 'T1Min1', 'T1Max1');
        UpdateRow(row, 'T1Code2', 'T1Min2', 'T1Max2');
        UpdateRow(row, 'T1Code3', 'T1Min3', 'T1Max3');
        UpdateRow(row, 'T1Code4', 'T1Min4', 'T1Max4');
        UpdateRow(row, 'T1Code5', 'T1Min5', 'T1Max5');
        UpdateRow(row, 'T1Code6', 'T1Min6', 'T1Max6');
        UpdateRow(row, 'T1Code7', 'T1Min7', 'T1Max7');
      });
      D2RMM.writeTsv(fileName, fileContent);
    },
  );
}

if (config.automagic) {
  [
    'global\\excel\\automagic.txt',
    'global\\excel\\base\\automagic.txt',
  ].forEach((fileName) => {
    const fileContent = D2RMM.readTsv(fileName);
    if (!fileContent) return;
    SplitAffixesIntoOneAffixPerItemType(fileContent.rows, 100);
    CalculateAffixTierMap(fileContent.rows);
    fileContent.rows.forEach((row, index, rows) => {
      UpdateRow(row, 'mod1code', 'mod1min', 'mod1max');
      UpdateRow(row, 'mod2code', 'mod2min', 'mod2max');
      UpdateRow(row, 'mod3code', 'mod3min', 'mod3max');
      UpdateFrequency(row, rows);
    });
    D2RMM.writeTsv(fileName, fileContent);
  });
}

if (config.unique) {
  [
    'global\\excel\\uniqueitems.txt',
    'global\\excel\\base\\uniqueitems.txt',
  ].forEach((fileName) => {
    const fileContent = D2RMM.readTsv(fileName);
    if (!fileContent) return;
    fileContent.rows.forEach((row) => {
      UpdateRow(row, 'prop1', 'min1', 'max1');
      UpdateRow(row, 'prop2', 'min2', 'max2');
      UpdateRow(row, 'prop3', 'min3', 'max3');
      UpdateRow(row, 'prop4', 'min4', 'max4');
      UpdateRow(row, 'prop5', 'min5', 'max5');
      UpdateRow(row, 'prop6', 'min6', 'max6');
      UpdateRow(row, 'prop7', 'min7', 'max7');
      UpdateRow(row, 'prop8', 'min8', 'max8');
      UpdateRow(row, 'prop9', 'min9', 'max9');
      UpdateRow(row, 'prop10', 'min10', 'max10');
      UpdateRow(row, 'prop11', 'min11', 'max11');
      UpdateRow(row, 'prop12', 'min12', 'max12');
    });
    D2RMM.writeTsv(fileName, fileContent);
  });
}

if (config.set) {
  ['global\\excel\\setitems.txt', 'global\\excel\\base\\setitems.txt'].forEach(
    (fileName) => {
      const fileContent = D2RMM.readTsv(fileName);
      if (!fileContent) return;
      fileContent.rows.forEach((row) => {
        UpdateRow(row, 'prop1', 'min1', 'max1');
        UpdateRow(row, 'prop2', 'min2', 'max2');
        UpdateRow(row, 'prop3', 'min3', 'max3');
        UpdateRow(row, 'prop4', 'min4', 'max4');
        UpdateRow(row, 'prop5', 'min5', 'max5');
        UpdateRow(row, 'prop6', 'min6', 'max6');
        UpdateRow(row, 'prop7', 'min7', 'max7');
        UpdateRow(row, 'prop8', 'min8', 'max8');
        UpdateRow(row, 'prop9', 'min9', 'max9');

        // not sure if amin1a/amax1a/etc... should also be equalized
        // they seem to be for the set item affixes, which shouldn't vary
      });
      D2RMM.writeTsv(fileName, fileContent);
    },
  );
}

if (config.highquality) {
  [
    'global\\excel\\qualityitems.txt',
    'global\\excel\\base\\qualityitems.txt',
  ].forEach((fileName) => {
    const fileContent = D2RMM.readTsv(fileName);
    if (!fileContent) return;
    fileContent.rows.forEach((row) => {
      row.mod1min = row.mod1max;
      row.mod2min = row.mod2max;
    });
    D2RMM.writeTsv(fileName, fileContent);
  });
}

if (config.defense) {
  ['global\\excel\\armor.txt', 'global\\excel\\base\\armor.txt'].forEach(
    (fileName) => {
      const fileContent = D2RMM.readTsv(fileName);
      if (!fileContent) return;
      fileContent.rows.forEach((row) => {
        if (+row.maxac > +row.minac) {
          row.minac = row.maxac;
        }
      });
      D2RMM.writeTsv(fileName, fileContent);
    },
  );
}

if (config.crafted) {
  ['global\\excel\\cubemain.txt', 'global\\excel\\base\\cubemain.txt'].forEach(
    (fileName) => {
      const fileContent = D2RMM.readTsv(fileName);
      if (!fileContent) return;
      fileContent.rows.forEach((row) => {
        if (row.output === '"usetype,crf"') {
          UpdateRow(row, 'mod 1', 'mod 1 min', 'mod 1 max');
          UpdateRow(row, 'mod 2', 'mod 2 min', 'mod 2 max');
          UpdateRow(row, 'mod 3', 'mod 3 min', 'mod 3 max');
          UpdateRow(row, 'mod 4', 'mod 4 min', 'mod 4 max');
          UpdateRow(row, 'mod 5', 'mod 5 min', 'mod 5 max');
        }
      });
      D2RMM.writeTsv(fileName, fileContent);
    },
  );
}

[
  'global\\excel\\propertygroups.txt',
  'global\\excel\\base\\propertygroups.txt',
].forEach((fileName) => {
  const fileContent = D2RMM.readTsv(fileName);
  if (!fileContent) return;
  fileContent.rows.forEach((row) => {
    for (let i = 1; i <= 8; i++) {
      UpdateRow(row, `Prop${i}`, `ModMin${i}`, `ModMax${i}`);
    }
  });
  D2RMM.writeTsv(fileName, fileContent);
});






// ==========================================
// 词缀修改排除注册表
// ==========================================
const skilltab3_exclude_config = {  
  itypes: ['lcha'], 
  names: []
};

// ==========================================
// 1. 精准智能拆分：只有 [含 skilltab] 且 [含排除底材] 的混合行才拆分
// ==========================================
const SmartFlattenRows = (rows) => {
  const newRows = [];
  const excludeSet = new Set(skilltab3_exclude_config.itypes);

  rows.forEach((row) => {
    // 条件 A: 检查是否存在 skilltab 属性
    const hasSkillTab = (row.mod1code === 'skilltab' || row.mod2code === 'skilltab' || row.mod3code === 'skilltab');
    
    // 条件 B: 获取所有有效的 itype
    const rowITypes = [];
    for (let i = 1; i <= 7; i++) {
      if (row['itype' + i]) rowITypes.push(row['itype' + i]);
    }

    // 条件 C: 检查底材中是否包含排除项
    const hasExcludeIType = rowITypes.some(t => excludeSet.has(t));

    // 执行逻辑：
    // 只有同时满足 (有技能词条) AND (底材包含排除项) AND (底材数量大于1) 时才拆分
    if (hasSkillTab && hasExcludeIType && rowITypes.length > 1) {
      rowITypes.forEach((type) => {
        const newRow = { ...row };
        for (let i = 1; i <= 7; i++) { newRow['itype' + i] = ''; }
        newRow['itype1'] = type;
        newRows.push(newRow);
      });
    } else {
      // 其他所有情况（不含技能、不含排除项、或已经是单行）都不拆分
      newRows.push(row);
    }
  });
  return newRows;
};

// ==========================================
// 2. 词缀处理逻辑 (此时数据已按需拆分)
// ==========================================
const adjustAffixRow = (row, index, rows) => {
  // 基础强化 (config.blue)
  if (config.blue) {
    if (typeof UpdateRow === 'function') {
      ['mod1', 'mod2', 'mod3'].forEach(m => UpdateRow(row, m+'code', m+'min', m+'max'));
    }
    if (typeof UpdateFrequency === 'function') UpdateFrequency(row, rows);
  }

  // 技能 +3 逻辑 (config.skilltab3)
  if (config.skilltab3) {
    // 1. 名称排除
    if (skilltab3_exclude_config.names.includes(row.Name)) return;

    // 2. 底材排除检查
    let isExcludedRow = false;
    for (let i = 1; i <= 7; i++) {
      const t = row['itype' + i];
      if (t && skilltab3_exclude_config.itypes.includes(t)) {
        isExcludedRow = true;
        break;
      }
    }
    if (isExcludedRow) return;

    // 3. 将符合条件的 skilltab 修改为 3
    for (let i = 1; i <= 3; i++) {
      if (row['mod' + i + 'code'] === 'skilltab') {
        row['mod' + i + 'min'] = '3';
        row['mod' + i + 'max'] = '3';
      }
    }
  }
};

// ==========================================
// 主执行流程
// ==========================================
if (config.blue || config.skilltab3) {
  const targetFiles = [
    'global\\excel\\magicprefix.txt',
    'global\\excel\\base\\magicprefix.txt',
    'global\\excel\\magicsuffix.txt',
    'global\\excel\\base\\magicsuffix.txt',
    'global\\excel\\automagic.txt',
    'global\\excel\\base\\automagic.txt',
  ];

  targetFiles.forEach((fileName) => {
    let fileContent = D2RMM.readTsv(fileName);
    if (!fileContent) return;

    // 第一步：按需拆分（仅针对含技能且含排除底材的混合行）
    fileContent.rows = SmartFlattenRows(fileContent.rows);

    // 第二步：重算映射
    if (typeof CalculateAffixTierMap === 'function') {
      CalculateAffixTierMap(fileContent.rows);
    }

    // 第三步：执行修改与排除
    fileContent.rows.forEach(adjustAffixRow);

    D2RMM.writeTsv(fileName, fileContent);
  });
}














