const treasureclassexFilename = 'global\\excel\\treasureclassex.txt';
const treasureclassex = D2RMM.readTsv(treasureclassexFilename);

function SafeClear(row, TCName, start, end) {
  if (row['Treasure Class'] === TCName) {
    for (let i = start; i <= end; i++) {
      row['Item' + i] = '';
      row['Prob' + i] = '';
    }
  }
}

function CleanMagicTCs(row) {
  const tc = row['Treasure Class'];
  if (tc.match(/Act [1-5]( \(N\)| \(H\))? (Cast|Wraith) [A-C]/)) {
    for (let i = 1; i <= 10; i++) {
      if (row['Item' + i] === 'Magic') {
        row['Item' + i] = '';
        row['Prob' + i] = '';
      }
    }
  }
}

treasureclassex.rows.forEach((row) => {
  const tc = row['Treasure Class'];


  // 1. 禁止 BOSS 掉落精华 (使用你提供的真实 Key: tes, ceh, bet, fed)
  if (config.disdrop_bosstoken) {
    if (tc.match(/^(Andariel|Duriel|Mephisto|Diablo|Baal)(q)?.*\(H\)/)) {
      for (let i = 1; i <= 10; i++) {
        const item = row['Item' + i];
        // 修正为对应的真实物品代码
        if (item === 'tes' || item === 'ceh' || item === 'bet' || item === 'fed') {
          row['Item' + i] = '';
          row['Prob' + i] = '';
        }
      }
    }
  }

  // 2. 宝石掉落控制
  if (config.gemdrop_select === 'dis_gem1') {
    if (tc.match(/^Act [1-5] \(H\) Good$/)) row['Item7'] = 'Perfect Gem';
  } else if (config.gemdrop_select === 'dis_gem2') {
    if (tc.match(/^Act [1-5] (\(N\) |\(H\) )?Good$/)) {
      row['Item7'] = '';
      row['Prob7'] = '';
    }
  }

  // 3. 药剂阶梯屏蔽
  const pLevel = config.disdrop_potion;
  if (pLevel !== 'dis_def') {
    if (tc.match(/^(H)?potion [1-6]$/)) {
      if (pLevel === 'dis_potion2') {
        row['Item1'] = 'rvs'; row['Prob1'] = '1';
        for (let i = 2; i <= 10; i++) { row['Item' + i] = ''; row['Prob' + i] = ''; }
      } else if (pLevel === 'dis_potion3' || pLevel === 'dis_potion4') {
        for (let i = 1; i <= 10; i++) { row['Item' + i] = ''; row['Prob' + i] = ''; }
      }
    }
    if (pLevel !== 'dis_potion1') CleanMagicTCs(row);
    if (pLevel === 'dis_potion4') {
      for (let i = 1; i <= 10; i++) {
        if (row['Item' + i] === 'rvl') { row['Item' + i] = ''; row['Prob' + i] = '0'; }
      }
      SafeClear(row, 'Elite Potion', 1, 10);
    }
  }

  // 4. 世界之石碎片屏蔽 (断绝引用)
  if (config.disdrop_Worldstone) {
    for (let i = 1; i <= 10; i++) {
      if (row['Item' + i] && row['Item' + i].includes('Terrorize Act Consumable Desecrated')) {
        row['Item' + i] = '';
        row['Prob' + i] = '0';
      }
    }
  }

  // 5. 杂物屏蔽
  if (config.disdrop_junk !== 'dis_def') {
    if (tc.match(/^Act [1-5] (\(N\) |\(H\) )?Junk$/)) {
      for (let i = 1; i <= 10; i++) {
        const item = row['Item' + i];
        if (item === 'Misc') { row['Item' + i] = ''; row['Prob' + i] = ''; }
        if (config.disdrop_junk === 'dis_junk2' && item === 'Ammo') {
          row['Item' + i] = ''; row['Prob' + i] = '';
        }
      }
    }
  }
});
D2RMM.writeTsv(treasureclassexFilename, treasureclassex);



/// 商人出售

const miscFilename = 'global\\excel\\misc.txt';
const misc = D2RMM.readTsv(miscFilename);

const shopRegistry = [
  { code: 'xa1', config: 'open', costMult: 3 },
  { code: 'xa2', config: 'open', costMult: 3 },
  { code: 'xa3', config: 'open', costMult: 3 },
  { code: 'xa4', config: 'open', costMult: 3 },
  { code: 'xa5', config: 'open', costMult: 3 },
  { code: 'toa', config: 'allowToken', costMult: 5 },
  { code: 'pk1', config: 'allowUKey',  costMult: 5 },
  { code: 'pk2', config: 'allowUKey',  costMult: 5 },
  { code: 'pk3', config: 'allowUKey',  costMult: 5 },
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
  }
});
D2RMM.writeTsv(weaponsFilename, weapons);



