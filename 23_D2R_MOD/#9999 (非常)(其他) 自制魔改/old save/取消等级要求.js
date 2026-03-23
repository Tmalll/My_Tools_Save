
// ******************************** 各种基础装备需求等级设成1，低级角色也能使用强力装备 ********************************** //
const EquipmentTargetFiles = [
  "global\\excel\\weapons.txt",
  "global\\excel\\armor.txt",
  "global\\excel\\setitems.txt",
  "global\\excel\\uniqueitems.txt"
]; // 要修改的文件

const EquipFields = ["levelreq", "lvl req"]; // 要修改的字段（不同文件中的列名可能不同）
const EquipNewValue = "1"; // 要设定的新值

EquipmentTargetFiles.forEach((targetFile) => {
  const file = D2RMM.readTsv(targetFile);

  file.rows.forEach((row) => {
    EquipFields.forEach((field) => {
      if (row[field] !== undefined && row[field] !== "") {
        row[field] = EquipNewValue;
      }
    });
  });

  D2RMM.writeTsv(targetFile, file);
});



// ******************************** 各种词条的等级设为1, 让低级的你能随机到更好的词条 ********************************** //
const MagicTargetFiles = [
  "global\\excel\\magicprefix.txt",
  "global\\excel\\magicsuffix.txt",
  "global\\excel\\automagic.txt"
]; // 要修改的文件

const MagicModifyMap = { // 每个字段对应要修改的值
  level: "1",
  levelreq: "1",
  maxlevel: "" // 设置为空字符串
};

MagicTargetFiles.forEach((targetFile) => {
  const file = D2RMM.readTsv(targetFile);

  file.rows.forEach((row) => {
    Object.entries(MagicModifyMap).forEach(([field, value]) => {
      if (row[field] !== undefined) {
        row[field] = value;
      }
    });
  });

  D2RMM.writeTsv(targetFile, file);
});
