// ******************************** 宝石与符文需求等级设定为1 ********************************** //
const TargetFiles = [ // 这里指定要修改的文件
  "global\\excel\\misc.txt",
  "global\\excel\\armor.txt"
];

const FilterTarget1 = ["type", "type1", "type2"]; // 筛选字段（列名）
const FilterTarget1Fields = ["gema", "gemt", "gems", "geme", "gemr", "gemd", "gemz", "rune"]; // 筛选字段的匹配值

const ModifyTarget = ["level", "ShowLevel", "levelreq"]; // 要修改的字段（列名）
const ModifyTargetFields = ["1"]; // 修改后的值，这里只支持统一修改成一个值

TargetFiles.forEach((targetFile) => {
  const file = D2RMM.readTsv(targetFile);

  file.rows.forEach((row) => {
    // 判断是否符合筛选条件，任一筛选字段匹配筛选值即视为匹配
    const isMatch = FilterTarget1.some(field => 
      FilterTarget1Fields.includes(row[field])
    );

    if (isMatch) {
      // 对所有需要修改的字段统一赋值
      ModifyTarget.forEach(field => {
        if (row[field] !== undefined && row[field] !== "") {
          row[field] = ModifyTargetFields[0];
        }
      });
    }
  });

  D2RMM.writeTsv(targetFile, file);
});
