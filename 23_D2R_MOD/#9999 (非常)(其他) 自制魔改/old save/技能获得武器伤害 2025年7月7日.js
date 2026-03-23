// **************************** 技能获得武器伤害 **************************** //
const skillsFilename = "global\\excel\\skills.txt";
const skillsFile = D2RMM.readTsv(skillsFilename);

const SkillsID_100 = ["44", "48", "56", "234" ];  // 赋予100%武器伤害的技能, ID
skillsFile.rows.forEach((skill) => {
    if (SkillsID_100.includes(skill["*Id"])) {
        if (config.craftingEnabled) {
            skill["SrcDam"] = 128;        }    } });

const SkillsID_75 = [""];  // 赋予75%武器伤害的技能, ID
skillsFile.rows.forEach((skill) => {
    if (SkillsID_75.includes(skill["*Id"])) {
        if (config.craftingEnabled) {
            skill["SrcDam"] = 96;        }    } });

const SkillsID_50 = [""];  // 赋予50%武器伤害的技能, ID
skillsFile.rows.forEach((skill) => {
    if (SkillsID_50.includes(skill["*Id"])) {
        if (config.craftingEnabled) {
            skill["SrcDam"] = 64;        }    } });

const SkillsID_25 = [""];  // 赋予25%武器伤害的技能, ID
skillsFile.rows.forEach((skill) => {
    if (SkillsID_25.includes(skill["*Id"])) {
        if (config.craftingEnabled) {
            skill["SrcDam"] = 32;        }    } });

const SkillsID_1 = [""];  // 赋予1%武器伤害的技能, ID
skillsFile.rows.forEach((skill) => {
    if (SkillsID_1.includes(skill["*Id"])) {
        if (config.craftingEnabled) {
            skill["SrcDam"] = 1;        }    } });

D2RMM.writeTsv(skillsFilename, skillsFile);