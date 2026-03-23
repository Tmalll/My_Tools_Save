// ************************ 赌博价格修改器 ************************ //
const targetItems = [
  { code: "rin", "gamble cost": "10000" },   // 戒指
  { code: "amu", "gamble cost": "10000" },   // 项链
  { code: "cm1", "gamble cost": "10000" },
  { code: "cm2", "gamble cost": "10000" },
  { code: "cm3", "gamble cost": "10000" },
];

const miscFilename = "global\\excel\\misc.txt";
const miscTable = D2RMM.readTsv(miscFilename);

targetItems.forEach((item) => {
  const row = miscTable.rows.find(r => r.code === item.code);
  if (row) {
    row["gamble cost"] = item["gamble cost"];
  }
});
D2RMM.writeTsv(miscFilename, miscTable);

