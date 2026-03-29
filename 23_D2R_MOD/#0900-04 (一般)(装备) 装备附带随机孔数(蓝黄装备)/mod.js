const files = [
  'global\\excel\\magicprefix.txt',
  'global\\excel\\base\\magicprefix.txt',
  'global\\excel\\magicsuffix.txt',
  'global\\excel\\base\\magicsuffix.txt',
];

// 1. 基础排除列表, 满足一个即可排除
const excludeList = [
      { column: 'Name', value: '' }, // 排除文件空行
      { column: 'Name', value: null }, // 排除文件空行
      // { column: 'Name', value: 'Sturdy' },
      // { column: 'Name', value: 'Strong' },
      // { column: 'Name', value: 'Glorious' },
      // { column: 'itype1', value: 'ring' },
];

// 2. 组合排除条件, 需要同时满足
const comboExcludes = [
      { version: '100', spawnable: '0', multiply: '', add: '' }, // 排除文件最后面的空词缀
      // { version: '100', spawnable: '999', multiply: '', add: '' },
      // { Name: 'Fortified', level: '14' },
      // ...其他组合排除...
];

// 3. 白名单功能, 忽略上面的排除, 只要一个条件满足即可.
const whiteList = [
      // { column: 'Name', value: 'of Blight' },
      // { column: 'itype1', value: 'amul' }
];

files.forEach((filename) => {
  const data = D2RMM.readTsv(filename);
  
  data.rows.forEach((row) => {
    // --- 第一步：白名单检查 ---
    let isWhiteListed = whiteList.some(condition => row[condition.column] === condition.value);

    if (!isWhiteListed) {
      // --- 第二步：基础排除检查 ---
      let shouldExclude = excludeList.some(condition => {
        const rowValue = row[condition.column];
        if (condition.value === '' || condition.value === null) {
          return rowValue === '' || rowValue == null;
        }
        return rowValue === condition.value;
      });
      if (shouldExclude) return;

      // --- 第三步：组合排除检查 ---
      let shouldComboExclude = comboExcludes.some(conditions => {
        return Object.keys(conditions).every(key => {
          const rowValue = row[key];
          const condValue = conditions[key];
          if (condValue === '' || condValue === null) {
            return rowValue === '' || rowValue == null;
          }
          return rowValue === condValue;
        });
      });
      if (shouldComboExclude) return;
    }

    // --- 第四步：智能修改逻辑 (修正了此处的引号错误) ---
    let applied = false;
    for (let i = 1; i <= 3; i++) {
      const codeKey = 'mod' + i + 'code';
      const minKey = 'mod' + i + 'min';
      const maxKey = 'mod' + i + 'max';

      if (!applied && (row[codeKey] === '' || row[codeKey] == null)) {
        row[codeKey] = 'sock';
        row[minKey] = 1;
        row[maxKey] = 6;
        applied = true;
      }
    }
  });

  D2RMM.writeTsv(filename, data);
});