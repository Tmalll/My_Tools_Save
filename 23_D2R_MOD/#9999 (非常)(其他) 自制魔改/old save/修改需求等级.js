// ******************************** 装备词条需求等级设成1, 符文宝石需求设成1 ********************************** //
const filesToModify = [
  "global\\excel\\magicprefix.txt",
  "global\\excel\\magicsuffix.txt",
  "global\\excel\\automagic.txt",
  "global\\excel\\weapons.txt",
  "global\\excel\\armor.txt",
  "global\\excel\\misc.txt",
  "global\\excel\\skills.txt"
];

// 需要修改的等级字段
const levelFields = [ "level", "maxlevel", "levelreq", "classlevelreq", "ShowLevel", "reqlevel" ];

filesToModify.forEach((filename) => {
  const file = D2RMM.readTsv(filename);
  file.rows.forEach((row) => {
    levelFields.forEach(field => {
      if (row[field] !== undefined && row[field] !== "") {
        row[field] = "0"; // 或者改成 "1"，这里统一改成0代表最低等级要求
      }
    });
  });
  D2RMM.writeTsv(filename, file);
});

