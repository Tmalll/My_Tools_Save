
// ******************************** 手工艺品装备大修 ********************************** //
const recipeFilename = 'global\\excel\\cubemain.txt';
const recipeFile = D2RMM.readTsv(recipeFilename);

recipeFile.rows.forEach((recipe) => {
    if (recipe["description"].includes("Hit Power")) {
            
        if (config.craftingRework) {
            /// 统一制作时所用符文为#10
            recipe["input 3"] =  "r10";
            recipe["output"] =   "usetype,crf"; // 设定输出的物品.

            /// 去除物品等级限制.
            recipe["ilvl"] = "100";
            recipe["plvl"] = "";
            recipe["lvl"] =  "";

            /// 调整通用属性词条.
            recipe["mod 1"]         = "hit-skill";
            recipe["mod 1 chance"]  = "";
            recipe["mod 1 param"]   = "44";
            recipe["mod 1 min"]     = "5";
            recipe["mod 1 max"]     = "4";

            recipe["mod 2"]         = "dmg-cold";
            recipe["mod 2 chance"]  = "";
            recipe["mod 2 param"]   = "125";
            recipe["mod 2 min"]     = "15";
            recipe["mod 2 max"]     = "30";

            recipe["mod 3"]         = "crush";
            recipe["mod 3 chance"]  = "";
            recipe["mod 3 param"]   = "";
            recipe["mod 3 min"]     = 5;
            recipe["mod 3 max"]     = 5;

            recipe["mod 4"]         = "dmg-cold/lvl";
            recipe["mod 4 chance"]  = "";
            recipe["mod 4 param"]   = "8";
            recipe["mod 4 min"]     = "";
            recipe["mod 4 max"]     = "";

            recipe["mod 5"]         = "pierce-cold";
            recipe["mod 5 chance"]  = "";
            recipe["mod 5 param"]   = "";
            recipe["mod 5 min"]     = 5;
            recipe["mod 5 max"]     = 5;                        
        }
    }    
});

recipeFile.rows.forEach((recipe) => {
    if (recipe["description"].includes("Blood")) {
            
        if (config.craftingRework) {
            /// 去除物品等级限制.
            recipe["ilvl"] = 100 ;
            recipe["plvl"] = ""  ;
            recipe["lvl"] =  ""  ;

            /// 调整通用属性词条.
        }
    }    
});

recipeFile.rows.forEach((recipe) => {
    if (recipe["description"].includes("Caster")) {
            
        if (config.craftingRework) {
            /// 去除物品等级限制.
            recipe["ilvl"] = 100 ;
            recipe["plvl"] = ""  ;
            recipe["lvl"] =  ""  ;

            /// 调整通用属性词条.
        }
    }    
});

recipeFile.rows.forEach((recipe) => {
    if (recipe["description"].includes("Safety")) {
            
        if (config.craftingRework) {
            /// 去除物品等级限制.
            recipe["ilvl"] = 100 ;
            recipe["plvl"] = ""  ;
            recipe["lvl"] =  ""  ;

            /// 调整通用属性词条.
        }
    }    
});

const Helm_Keywords = ["Hit Power Helm", "Blood Helm", "Caster Helm", "Safety Helm"];
recipeFile.rows.forEach((recipe) => {
    if (Helm_Keywords.some(keyword => recipe["description"].includes(keyword))) {
        if (config.craftingEnabled) {
            recipe["input 1"] = '"helm,upg"';
        }
    }
});

const Boots_Keywords = ["Hit Power Boots", "Blood Boots", "Caster Boots", "Safety Boots"];
recipeFile.rows.forEach((recipe) => {
    if (Boots_Keywords.some(keyword => recipe["description"].includes(keyword))) {
        if (config.craftingEnabled) {
            recipe["input 1"] = '"boot,upg"';
        }
    }
});

const Gloves_Keywords = ["Hit Power Gloves", "Blood Gloves", "Caster Gloves", "Safety Gloves"];
recipeFile.rows.forEach((recipe) => {
    if (Gloves_Keywords.some(keyword => recipe["description"].includes(keyword))) {
        if (config.craftingEnabled) {
            recipe["input 1"] = '"glov,upg"';
        }
    }
});

const Belt_Keywords = ["Hit Power Belt", "Blood Belt", "Caster Belt", "Safety Belt"];
recipeFile.rows.forEach((recipe) => {
    if (Belt_Keywords.some(keyword => recipe["description"].includes(keyword))) {
        if (config.craftingEnabled) {
            recipe["input 1"] = '"belt,upg"';
        }
    }
});

const Shield_Keywords = ["Hit Power Shield", "Blood Shield", "Caster Shield", "Safety Shield"];
recipeFile.rows.forEach((recipe) => {
    if (Shield_Keywords.some(keyword => recipe["description"].includes(keyword))) {
        if (config.craftingEnabled) {
            recipe["input 1"] = '"shie,upg"';
        }
    }
});

const Body_Keywords = ["Hit Power Body", "Blood Body", "Caster Body", "Safety Body"];
recipeFile.rows.forEach((recipe) => {
    if (Body_Keywords.some(keyword => recipe["description"].includes(keyword))) {
        if (config.craftingEnabled) {
            recipe["input 1"] = '"tors,upg"';
        }
    }
});

const Amulet_Keywords = ["Hit Power Amulet", "Blood Amulet", "Caster Amulet", "Safety Amulet"];
recipeFile.rows.forEach((recipe) => {
    if (Amulet_Keywords.some(keyword => recipe["description"].includes(keyword))) {
        if (config.craftingEnabled) {
            recipe["input 1"] = '"amul"';
        }
    }
});

const Ring_Keywords = ["Hit Power Ring", "Blood Ring", "Caster Ring", "Safety Ring"];
recipeFile.rows.forEach((recipe) => {
    if (Ring_Keywords.some(keyword => recipe["description"].includes(keyword))) {
        if (config.craftingEnabled) {
            recipe["input 1"] = '"ring"';
        }
    }
});

const Weapon_Keywords = ["Hit Power Weapon", "Blood Weapon", "Caster Weapon", "Safety Weapon"];
recipeFile.rows.forEach((recipe) => {
    if (Weapon_Keywords.some(keyword => recipe["description"].includes(keyword))) {
        if (config.craftingEnabled) {
            recipe["input 1"] = '"weap,upg"';
        }
    }
});

D2RMM.writeTsv(recipeFilename, recipeFile);

