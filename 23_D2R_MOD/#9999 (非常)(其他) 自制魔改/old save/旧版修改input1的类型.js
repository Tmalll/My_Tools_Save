const Helm_Keywords = ["Hit Power Helm", "Blood Helm", "Caster Helm", "Safety Helm"];
recipeFile.rows.forEach((recipe) => {
    if (Helm_Keywords.some(keyword => recipe["description"].includes(keyword))) {
            recipe["input 1"] = "helm,upg";
    }
});

const Boots_Keywords = ["Hit Power Boots", "Blood Boots", "Caster Boots", "Safety Boots"];
recipeFile.rows.forEach((recipe) => {
    if (Boots_Keywords.some(keyword => recipe["description"].includes(keyword))) {
            recipe["input 1"] = "boot,upg";        
    }
});

const Gloves_Keywords = ["Hit Power Gloves", "Blood Gloves", "Caster Gloves", "Safety Gloves"];
recipeFile.rows.forEach((recipe) => {
    if (Gloves_Keywords.some(keyword => recipe["description"].includes(keyword))) {
            recipe["input 1"] = "glov,upg";        
    }
});

const Belt_Keywords = ["Hit Power Belt", "Blood Belt", "Caster Belt", "Safety Belt"];
recipeFile.rows.forEach((recipe) => {
    if (Belt_Keywords.some(keyword => recipe["description"].includes(keyword))) {
            recipe["input 1"] = "belt,upg";        
    }
});

const Shield_Keywords = ["Hit Power Shield", "Blood Shield", "Caster Shield", "Safety Shield"];
recipeFile.rows.forEach((recipe) => {
    if (Shield_Keywords.some(keyword => recipe["description"].includes(keyword))) {
            recipe["input 1"] = "shie,upg";        
    }
});

const Body_Keywords = ["Hit Power Body", "Blood Body", "Caster Body", "Safety Body"];
recipeFile.rows.forEach((recipe) => {
    if (Body_Keywords.some(keyword => recipe["description"].includes(keyword))) {
            recipe["input 1"] = "tors,upg";
    }
});

const Amulet_Keywords = ["Hit Power Amulet", "Blood Amulet", "Caster Amulet", "Safety Amulet"];
recipeFile.rows.forEach((recipe) => {
    if (Amulet_Keywords.some(keyword => recipe["description"].includes(keyword))) {
            recipe["input 1"] = "amul";
    }
});

const Ring_Keywords = ["Hit Power Ring", "Blood Ring", "Caster Ring", "Safety Ring"];
recipeFile.rows.forEach((recipe) => {
    if (Ring_Keywords.some(keyword => recipe["description"].includes(keyword))) {
            recipe["input 1"] = "ring";        
    }
});

const Weapon_Keywords = ["Hit Power Weapon", "Blood Weapon", "Caster Weapon", "Safety Weapon"];
recipeFile.rows.forEach((recipe) => {
    if (Weapon_Keywords.some(keyword => recipe["description"].includes(keyword))) {
            recipe["input 1"] = "weap,upg";
    }
});

// 修改箭筒以兼容远程武器不消耗MOD
const arrow_Keywords = ["Hit Power", "Blood", "Caster", "Safety"];
recipeFile.rows.forEach((recipe) => {
    if (arrow_Keywords.some(keyword => recipe["description"].includes(keyword))) {
        if (recipe["input 1"].includes("bowq,mag")) {
            recipe["input 1"] = "bowq";
        } 
        else if (recipe["input 1"].includes("xboq,mag")) {
            recipe["input 1"] = "xboq";
        }
    }
});