const skillsFilename = 'global\\excel\\skills.txt';
const skillsFile = D2RMM.readTsv(skillsFilename);

const skillDescFilename = 'global\\excel\\skilldesc.txt';
const skillDescFile = D2RMM.readTsv(skillDescFilename);

const skillStringFilename = 'local\\lng\\strings\\skills.json';
const skillStringFile = D2RMM.readJson(skillStringFilename);

const charStatsFilename = 'global\\excel\\charstats.txt';
const charStatsFile = D2RMM.readTsv(charStatsFilename);

const lastID = parseInt(skillsFile.rows[skillsFile.rows.length - 1]["*Id"]) + 1;

skillsFile.rows.push({
    
    "skill": "Recall",
    "*Id": lastID,
    "skilldesc": "recall",
    "srvdofunc": 27,
    "stsound": "sorceress_teleport",
    "castoverlay": "teleport",
    "warp": 1,
    "enhanceable": 1,
    "attackrank": 0,
    "range": "none",
    "anim": "SC",
    "seqtrans": "SC",
    "monanim": "xx",
    "LineOfSight": 5,
    "reqlevel": 1,
    "restrict": 1,
    "localdelay": 375,
    "leftskill": 0,
    "rightskill": 1,
    "minmana": 0,
    "manashift": 8,
    "mana": 0,
    "lvlmana": 0,
    "interrupt": 1,
    "InGame": 1,
    "HitShift": 8,
    "cost add": 0,
    "*eol\r": 0
});

D2RMM.writeTsv(skillsFilename, skillsFile);


skillDescFile.rows.push({
    
    "skilldesc": "recall",
    "SkillPage": 0,
    "SkillRow": 0,
    "SkillColumn": 0,
    "ListRow": 0,
    "IconCel": 16,
    "str name": "recallSkill",
    "str short": "recallDesc",
    "str long": "recallDesc",
    "str alt": "recallDesc",
    "*eol\r": 0
});

D2RMM.writeTsv(skillDescFilename, skillDescFile);


charStatsFile.rows.forEach((charStat) => {
    
    if (charStat["class"] != "Expansion" && charStat["class"] != "Barbarian" && charStat["class"] != "Assassin") {
        charStat["Skill 8"] = "Recall";
    }
    else if (charStat["class"] == "Assassin") {
        charStat["Skill 9"] = "Recall";
    }
    else if (charStat["class"] == "Barbarian") {
        charStat["Skill 10"] = "Recall";
    }
});

D2RMM.writeTsv(charStatsFilename, charStatsFile);


skillStringFile.push(
     {
        id: D2RMM.getNextStringID(),
        Key: 'recallSkill',
        enUS: 'Recall',
        zhTW: 'Recall',
        deDE: 'Recall',
        esES: 'Recall',
        frFR: 'Recall',
        itIT: 'Recall',
        koKR: 'Recall',
        plPL: 'Recall',
        esMX: 'Recall',
        jaJP: 'Recall',
        ptBR: 'Recall',
        ruRU: 'Recall',
        zhCN: 'Recall'
    },
    {
        id: D2RMM.getNextStringID(),
        Key: 'recallDesc',
        enUS: 'Recall all units\n to the target location\n\nCasting Delay: 15 seconds',
        zhTW: 'Recall all units\n to the target location\n\nCasting Delay: 15 seconds',
        deDE: 'Recall all units\n to the target location\n\nCasting Delay: 15 seconds',
        esES: 'Recall all units\n to the target location\n\nCasting Delay: 15 seconds',
        frFR: 'Recall all units\n to the target location\n\nCasting Delay: 15 seconds',
        itIT: 'Recall all units\n to the target location\n\nCasting Delay: 15 seconds',
        koKR: 'Recall all units\n to the target location\n\nCasting Delay: 15 seconds',
        plPL: 'Recall all units\n to the target location\n\nCasting Delay: 15 seconds',
        esMX: 'Recall all units\n to the target location\n\nCasting Delay: 15 seconds',
        jaJP: 'Recall all units\n to the target location\n\nCasting Delay: 15 seconds',
        ptBR: 'Recall all units\n to the target location\n\nCasting Delay: 15 seconds',
        ruRU: 'Recall all units\n to the target location\n\nCasting Delay: 15 seconds',
        zhCN: 'Recall all units\n to the target location\n\nCasting Delay: 15 seconds'
    }
);

D2RMM.writeJson(skillStringFilename, skillStringFile);

