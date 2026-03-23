/// Hit Power
recipeFile.rows.forEach((recipe) => {
    if (recipe["description"].includes("Hit Power")) { /// 对Hit Power的统一修改
        recipe["input 3"] = "r10";

        recipe["mod 1"]         = "addxp";
        recipe["mod 1 chance"]  = "";
        recipe["mod 1 param"]   = "";
        recipe["mod 1 min"]     = "100";
        recipe["mod 1 max"]     = "100";

        recipe["mod 2"]         = "dmg/lvl";
        recipe["mod 2 chance"]  = "";
        recipe["mod 2 param"]   = "4"; /// PS:每8点数值+1点伤害
        recipe["mod 2 min"]     = "";
        recipe["mod 2 max"]     = "";

        recipe["mod 3"]         = "crush"; /// 粉碎打击
        recipe["mod 3 chance"]  = "";
        recipe["mod 3 param"]   = "";
        recipe["mod 3 min"]     = "10";
        recipe["mod 3 max"]     = "10";        

        recipe["mod 4"]         = "swing2"; /// 增加攻速
        recipe["mod 4 chance"]  = "";
        recipe["mod 4 param"]   = "";
        recipe["mod 4 min"]     = "10";
        recipe["mod 4 max"]     = "10"; 

        recipe["mod 5"]         = "mag%/lvl";
        recipe["mod 5 chance"]  = "";
        recipe["mod 5 param"]   = "40"; /// 每8点数值+1%
        recipe["mod 5 min"]     = "";
        recipe["mod 5 max"]     = "";
    }    
});

recipeFile.rows.forEach((recipe) => {
    if (recipe["description"].includes("Hit Power Weapon")) { /// 单独定制Hit Power Weapon
        recipe["mod 1"]         = "att-skill";
        recipe["mod 1 chance"]  = "";
        recipe["mod 1 param"]   = "44"; /// 冰霜新星
        recipe["mod 1 min"]     = "30";
        recipe["mod 1 max"]     = "3";

        recipe["mod 2"]         = "dmg/lvl";
        recipe["mod 2 chance"]  = "";
        recipe["mod 2 param"]   = "40"; /// 每级+5点伤害
        recipe["mod 2 min"]     = "";
        recipe["mod 2 max"]     = "";
    }    
});

/// 配方复制器 > Hit Power 弓弩
const targetDescription1 = "Hit Power Weapon";   // 匹配关键字
const newDescription1 = "Hit Power Missile";     // 新名称
const matchedRecipe1 = recipeFile.rows.find(recipe => recipe["description"] && recipe["description"].includes(targetDescription1));
if (matchedRecipe1) {  
    const copy = { ...matchedRecipe1 };
    copy["description"] = newDescription1;
    copy["input 1"] = "miss,upg";
    copy["mod 1"]         = "oskill"; /// +1 Freezing Arrow id=31
    copy["mod 1 chance"]  = "";
    copy["mod 1 param"]   = "31";
    copy["mod 1 min"]     = "1";
    copy["mod 1 max"]     = "1";
    recipeFile.rows.push(copy); 
} else { console.warn(`未找到 description 包含 "${targetDescription1}" 的配方`); }

/// 配方复制器 > Hit Power 投掷
const targetDescription2 = "Hit Power Weapon";   // 匹配关键字
const newDescription2 = "Hit Power Combo";       // 新名称
const matchedRecipe2 = recipeFile.rows.find(recipe => recipe["description"] && recipe["description"].includes(targetDescription2));
if (matchedRecipe2) {  
    const copy = { ...matchedRecipe2 };
    copy["description"] = newDescription2;
    copy["input 1"] = "comb,upg";   /// comb = 组合武器, 投掷武器,标枪,投斧,投匕  
    copy["input 5"] = "yps";        /// 解毒药水（Antidote Potion）
    copy["numinputs"] = "5";        /// 为防止冲突, 添加一个解毒
    copy["mod 1"]         = "hit-skill";
    copy["mod 1 chance"]  = "";
    copy["mod 1 param"]   = "84";   /// 33% lv10骨矛
    copy["mod 1 min"]     = "15"; 
    copy["mod 1 max"]     = "1";
    recipeFile.rows.push(copy); 
} else { console.warn(`未找到 description 包含 "${targetDescription2}" 的配方`); }
