const files = [
  'global\\excel\\uniqueitems.txt',
  'global\\excel\\base\\uniqueitems.txt'
];

files.forEach((filename) => {
  const data = D2RMM.readTsv(filename);
  if (!data || !data.rows) return;

  data.rows.forEach((row) => {
    // --- 增加排除逻辑：排除 *ID 为空、空白或 undefined 的行 ---
    const idValue = row['*ID'];
    if (idValue == null || idValue.trim() === '') {
      return; // 直接跳过，不进行修改
    }

    // --- 对有效行进行修改 ---
    if (config.addSocket) {
      // 在第 12 个属性槽位强制写入打孔属性
      row['prop12'] = 'sock';
      row['min12'] = '1';
      row['max12'] = '6'; // 游戏会根据装备种类的最大孔数限制自动缩减
    }
  });

  D2RMM.writeTsv(filename, data);
});