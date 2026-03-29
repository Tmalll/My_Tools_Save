const files = [
  'global\\excel\\setitems.txt', 
  'global\\excel\\base\\setitems.txt'
];

files.forEach((filename) => {
  const data = D2RMM.readTsv(filename);
  // 防御性检查：确保文件读取成功且包含数据行
  if (!data || !data.rows) return;
  
  data.rows.forEach((row) => {
    // --- 增加排除逻辑：排除 *ID 列为空或仅包含空白字符的行 ---
    const idValue = row['*ID'];
    if (idValue == null || idValue.trim() === '') {
      return; // 跳过此行，不进行任何修改
    }

    // --- 对有效套装行进行修改 ---
    if (config.addSocket) {
      // 在套装属性槽位 9 强制写入打孔属性
      // 注意：如果该套装本身属性非常多，prop9 可能会覆盖原有属性
      row['prop9'] = 'sock';
      row['min9'] = '1';
      row['max9'] = '6'; 
    }
  });

  D2RMM.writeTsv(filename, data);
});