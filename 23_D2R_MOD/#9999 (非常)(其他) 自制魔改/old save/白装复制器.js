/// 配方复制器, Hit Power投掷
const targetDescription2 = "Hit Power Weapon";   // 匹配关键字
const newDescription2 = "Hit Power Combo";       // 新名称
const matchedRecipe2 = recipeFile.rows.find(recipe => recipe["description"] && recipe["description"].includes(targetDescription2));
if (matchedRecipe2) {  
    const copy = { ...matchedRecipe2 };
    copy["description"] = newDescription2;
    copy["input 1"] = "comb,upg"; /// comb = 投掷武器,标枪,投斧,投匕
    copy["input 6"] = "comb,upg"; /// 为了不和上面的冲突, 需要一个额外的投掷武器才能转换.
    copy["numinputs"] = "5";
    copy["mod 1"]         = "hit-skill"; /// 覆盖原版的挨打触发冰霜新星
    copy["mod 1 chance"]  = "";
    copy["mod 1 param"]   = "273";
    copy["mod 1 min"]     = "33";
    copy["mod 1 max"]     = "11";
    recipeFile.rows.push(copy); } else { console.warn(`未找到 description 包含 "${targetDescription2}" 的配方`); }
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
  copy["input 5"] = "i073";        // 解毒药水（Antidote Potion）
  copy["numinputs"] = "5";
  copy["output"] = "usetype,mod";
  CloneCubeMain.rows.push(copy);
});

// 写回文件
D2RMM.writeTsv(CloneFileName, CloneCubeMain);