// **************************** 技能叠加武器伤害 **************************** //
const skillsFilename = "global\\excel\\skills.txt";
const skillsFile = D2RMM.readTsv(skillsFilename);

const Nova_skillsID = ["44", "48"];
skillsFile.rows.forEach((skill) => {
    if (Nova_skillsID.includes(skill["*Id"])) {
        if (config.craftingEnabled) {
            skill["SrcDam"] = 32;
        }
    }
});

D2RMM.writeTsv(skillsFilename, skillsFile);
