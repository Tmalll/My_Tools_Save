const cubemainFilename = 'global\\excel\\cubemain.txt';
const cubemain = D2RMM.readTsv(cubemainFilename);

const LABELS = {
    mag: 'Magic',
    rar: 'Rare',
    rin: 'Ring',
    amu: 'Amulet',
    jew: 'Jewel',
    tors: 'Body Armor',
    helm: 'Helmet',
    shld: 'Shield',
    weap: 'Weapon',
    armo: 'Armor',
    low: 'Low Quality',
    hiq: 'Superior',
    nor: 'Normal',
    uni: 'Unique',
    set: 'Set',
    cm1: 'Small Charm',
    cm2: 'Large Charm',
    cm3: 'Grand Charm',
    bas: 'Basic',
    exc: 'Exceptional',
    eli: 'Elite',
};

const UPGRADE = {
    low: 'hiq',
    nor: 'hiq',
    hiq: 'hiq',

    bas: 'exc',
    exc: 'eli',

    cm1: 'cm2',
    cm2: 'cm3',
    cm3: 'cm1',
};

//    lvl:  '',   // 强制设定输出物品的等级
//    plvl: '',   // 使用玩家等级的百分比来确定输出等级
//    ilvl: '',   // 使用第一个输入物品等级的百分比来确定输出等级



// 物品洗白(#01)
if (config.item_to_Normal) {
    ['weap', 'armo', 'ring', 'amul', 'char', 'misl', 'jew'].forEach((itemType) => {
        const recipe = {
            description: `MyMOD PotionCraft item to Normal`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': `${itemType}`,
            'input 2': 'r01',
            ilvl: 100,
            output: 'usetype,nor',
            '*eol\r': 0,
        };
        if (config.isfree) {
            recipe['output b'] = 'r01';
        }
        cubemain.rows.push(recipe);
    });
}

// 白装转超强(#01+体力)
if (config.item_to_Hiq) {
    ['low', 'nor', 'hiq'].forEach((itemQuality) => {
        ['weap', 'armo', 'ring', 'amul', 'char', 'misl', 'jew'].forEach((itemType) => {
            const outQuality = UPGRADE[itemQuality];
            const recipe = {
                description: `MyMOD PotionCraft item to Hiq`,
                enabled: 1,
                version: 100,
                numinputs: 3,
                'input 1': `${itemType},${itemQuality}`,
                'input 2': 'r01',
                'input 3': 'vps', // 耐力药水(Stamina Potion)
                output: `"usetype,${outQuality}"`,                
                ilvl: 100,
                '*eol\r': 0,
            };
            if (config.isfree) {
                recipe['output b'] = 'r01';
                recipe['output c'] = 'vps';
            }
            cubemain.rows.push(recipe);
        });
    });
}

// 重掷物品属性(#02)
if (config.item_reroll) {
    ['weap', 'armo', 'ring', 'amul', 'char', 'misl', 'jew'].forEach((itemType) => {
        const recipe = {
            description: `MyMOD PotionCraft item to ReRoll`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': `"${itemType}"`,
            'input 2': 'r02',           
            ilvl: 100,
            output: '"useitem,reg"',           
            '*eol\r': 0,
        };
        if (config.isfree) {
            recipe['output b'] = 'r02';
        }
        cubemain.rows.push(recipe);
    });
}

// 物品升级(#02+体力)
if (config.item_upgrade) {
    ['bas', 'exc' ].forEach((itemLevel) => {
        ['weap', 'armo'].forEach((itemType) => {
            const outLevel = UPGRADE[itemLevel];
            const recipe = {
                description: `MyMOD PotionCraft item to Eli`,
                enabled: 1,
                version: 100,
                numinputs: 3,
                'input 1': `${itemType},${itemLevel}`,
                'input 2': 'r02',
                'input 3': 'vps',
                output: `"useitem,mod,${outLevel}"`,
                ilvl: 100,
                '*eol\r': 0,
            };
            if (config.isfree) {
                recipe['output b'] = 'r02';
                recipe['output c'] = 'vps';
            }
            cubemain.rows.push(recipe);
        });
    });
}

// 物品转无形(#03)
if (config.item_to_Ethereal) {
    ['weap', 'armo'].forEach((itemType) => {
        const recipe = {
            description: `MyMOD PotionCraft item to Ethereal`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': `"${itemType},noe"`,            
            'input 2': 'r03',
            output: 'usetype,mod', // usetype,mod
            'mod 1': 'ethereal',
            'mod 1 min': 1,
            'mod 1 max': 1,
            'mod 2': 'rep-dur',
            "mod 2 param": "5",
            'mod 3': 'dur',
            'mod 3 min': 200,
            'mod 3 max': 200,
            ilvl: 100,
            '*eol\r': 0,
        };
        if (config.isfree) {
            recipe['output b'] = 'r03';
        }
        cubemain.rows.push(recipe);
    });
}

// 物品修理(#03+体力)
if (config.item_to_Fix) {
    ['weap', 'armo'].forEach((itemType) => {
        const recipe = {
            description: `MyMOD PotionCraft item to Fix`,
            enabled: 1,
            version: 100,
            numinputs: 3,
            'input 1': `"${itemType}"`,
            'input 2': 'r03',
            'input 3': 'vps',
            output: '"useitem,rep,rch,qty=255"',
            ilvl: 100,
            '*eol\r': 0,
        };
        if (config.isfree) {
            recipe['output b'] = 'r03';   
            recipe['output c'] = 'vps';         
        }
        cubemain.rows.push(recipe);
    });
}

// 提升物品等级到lv25(重新生成)(#04)
if (config.item_to_lvl25) {
    ['weap', 'armo', 'ring', 'amul', 'char', 'misl', 'jew'].forEach((itemType) => {
        const recipe = {            
            description: `MyMOD PotionCraft item to lvl25`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': `${itemType}`,
            'input 2': 'r04',
            lvl: 25,
            output: 'usetype',
            '*eol\r': 0,
        };
        if (config.isfree) {
            recipe['output b'] = 'r04';
        }
        cubemain.rows.push(recipe);
    });
}

// 提升物品等级到lv40(重新生成)(#05)
if (config.item_to_lvl40) {
    ['weap', 'armo', 'ring', 'amul', 'char', 'misl', 'jew'].forEach((itemType) => {
        const recipe = {            
            description: `MyMOD PotionCraft item to lvl40`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': `${itemType}`,
            'input 2': 'r05',
            lvl: 40,
            output: 'usetype',
            '*eol\r': 0,
        };
        if (config.isfree) {
            recipe['output b'] = 'r05';
        }
        cubemain.rows.push(recipe);
    });
}

// 提升物品等级到lv99(重新生成)(#06)
if (config.item_to_lvl99) {
    ['weap', 'armo', 'ring', 'amul', 'char', 'misl', 'jew'].forEach((itemType) => {
        const recipe = {            
            description: `MyMOD PotionCraft item to lvl99`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': `${itemType}`,
            'input 2': 'r06',
            lvl: 99,
            output: 'usetype',
            '*eol\r': 0,
        };
        if (config.isfree) {
            recipe['output b'] = 'r06';
        }
        cubemain.rows.push(recipe);
    });
}

// 物品转绿装(#07)
if (config.item_to_set) {
    ['weap', 'armo', 'ring', 'amul', 'char', 'misl', 'jew'].forEach((itemType) => {
        const recipe = {            
            description: `MyMOD PotionCraft item to Set`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': `${itemType}`,
            'input 2': 'r07',
            ilvl: 100,
            output: 'usetype,set',
            '*eol\r': 0,
        };
        if (config.isfree) {
            recipe['output b'] = 'r07';
        }
        cubemain.rows.push(recipe);
    });
}

// 物品转暗金(#08)
if (config.item_to_uni) {
    ['weap', 'armo', 'ring', 'amul', 'char', 'misl', 'jew'].forEach((itemType) => {
        const recipe = {            
            description: `MyMOD PotionCraft item to Uni`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': `${itemType}`,
            'input 2': 'r08',
            ilvl: 100,
            output: 'usetype,uni',
            '*eol\r': 0,
        };
        if (config.isfree) {
            recipe['output b'] = 'r08';
        }
        cubemain.rows.push(recipe);
    });
}

// 物品转蓝装(#09)
if (config.item_to_Mag) {
    ['weap', 'armo', 'ring', 'amul', 'char', 'misl', 'jew'].forEach((itemType) => {
        const recipe = {            
            description: `MyMOD PotionCraft item to Mag`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': `${itemType}`,
            'input 2': 'r09',
            ilvl: 100,
            output: 'usetype,mag',
            '*eol\r': 0,
        };
        if (config.isfree) {
            recipe['output b'] = 'r09';
        }
        cubemain.rows.push(recipe);
    });
}

// 物品转金装(#10)
if (config.item_to_Rar) {
    ['weap', 'armo', 'ring', 'amul', 'char', 'misl', 'jew'].forEach((itemType) => {
        const recipe = {            
            description: `MyMOD PotionCraft item to Rar`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': `${itemType}`,
            'input 2': 'r10',
            ilvl: 100,
            output: 'usetype,rar',
            '*eol\r': 0,
        };
        if (config.isfree) {
            recipe['output b'] = 'r10';
        }
        cubemain.rows.push(recipe);
    });
}

// 合并戒指项链和珠宝
if (config.Merge_jewelry) {
    // (2个同色戒指项链珠宝 -> 1个同色戒指项链珠宝)
    function AddJewelryRecipe(inType, outType) {
        const recipe = {
            description: `MyMOD PotionCraft Merge 2 ring amul jew -> 1 ring amul jew`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': `"${inType},qty=2"`,
            ilvl: 100,
            plvl: 75,
            output: `"${outType}`,
            '*eol\r': 0,
        };
        cubemain.rows.push(recipe);
    }
    AddJewelryRecipe('rin', 'rin'); 
    AddJewelryRecipe('amu', 'amu');
    AddJewelryRecipe('jew', 'jew');


    // (2个护符 to 1个新的护符)
    ['cm1', 'cm2', 'cm3'].forEach((itemType) => {       
            const recipe1 = {
                description: `MyMOD PotionCraft 2 Charm -> 1 Charm`,
                enabled: 1,
                version: 100,
                numinputs: 2,
                'input 1': `${itemType},qty=2`,
                ilvl: 100,
                plvl: 75,
                output: `${itemType}`,
                '*eol\r': 0,
            };
            cubemain.rows.push(recipe1);

            // 1个护符 + #11 > 下一个尺寸
            if (config.item_nextSize) {
                const nextSize = UPGRADE[itemType]
                const recipe2 = {
                    description: `MyMOD PotionCraft Charm to Next`,
                    enabled: 1,
                    version: 100,
                    numinputs: 3,
                    'input 1': `${itemType}`,
                    'input 2': 'r11',
                    ilvl: 100,
                    output: `${nextSize}`,
                    '*eol\r': 0,            
                };
                if (config.isfree) {
                    recipe2['output b'] = 'r11';
                }
                cubemain.rows.push(recipe2);
            }        
    });

    // 1个项链 + #11 > 新的珠宝
    if (config.item_new_jewelry) {
            const recipe = {
                description: `MyMOD PotionCraft Amulet -> jewel`,
                enabled: 1,
                version: 100,
                numinputs: 2,
                'input 1': `amu`,
                'input 2': 'r11',
                ilvl: 100,
                plvl: 75,
                output: `jew`,
                '*eol\r': 0,
            };
            if (config.isfree) {
                recipe['output b'] = 'r11';            
            }
            cubemain.rows.push(recipe);       
    }

    // 1个戒指 + #11 > 新的护符
    if (config.item_new_charms) {
            const recipe = {
                description: `MyMOD PotionCraft Ring -> Charm`,
                enabled: 1,
                version: 100,
                numinputs: 2,
                'input 1': `rin`,
                'input 2': 'r11',
                ilvl: 100,
                plvl: 75,
                output: `cm3`,
                '*eol\r': 0,
            };
            if (config.isfree) {
                recipe['output b'] = 'r11';
            }
            cubemain.rows.push(recipe);
        
    }
}



// 珠宝制作配方
if (config.specific) { 
    const JEWEL_PREFIXES = {
        'res-all':  { label: 'All Resistaances', inputLabel: 'Perfect Diamond', input: 'gpw' },
        'res-cold': { label: 'Resist Cold', inputLabel: 'Perfect Sapphire', input: 'gpb' },
        'res-fire': { label: 'Resist Fire', inputLabel: 'Perfect Ruby', input: 'gpr' },
        'res-ltng': { label: 'Resist Lightning', inputLabel: 'Perfect Topaz', input: 'gpy' },
        'res-pois': { label: 'Resist Poison', inputLabel: 'Perfect Emerald', input: 'gpg' },
        'dmg%':     { label: '% Damage', inputLabel: 'Perfect Amethyst', input: 'gpv' },
        'dmg-max':  { label: 'Max Damage', inputLabel: 'Perfect Skull', input: 'skz' },
    };

    const JEWEL_SUFFIXES = {
        'swing1': { label: 'Attack Speed', inputLabel: 'Stamina Potion', input: 'vps' },
        'ease': { label: 'Lower Requirements', inputLabel: 'Thawing Potion', input: 'wms' },
    };

    const prefixKeys = Object.keys(JEWEL_PREFIXES);
    const prefixesFound = {};
    const magicprefixFilename = 'global\\excel\\magicprefix.txt';
    const magicprefix = D2RMM.readTsv(magicprefixFilename);
    let rowNum = 0;
    magicprefix.rows.forEach((row) => {
        if (row.spawnable == '1' && row.itype1 == 'jewl' && prefixKeys.indexOf(row.mod1code) !== -1)
            prefixesFound[row.mod1code] = rowNum;
        rowNum++;
    });

    // 宝石 + 完美宝石 -> 抵抗宝石
    // 宝石 + 完美紫水晶/骷髅 -> 伤害宝石
    for (const [key, value] of Object.entries(prefixesFound)) {
        const prefixEntry = JEWEL_PREFIXES[key];
        const recipe = {
            description: `MyMOD PotionCraft Jewel + ${prefixEntry.inputLabel} -> ${prefixEntry.label} Jewel`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': 'jew',
            'input 2': prefixEntry.input,
            ilvl: 100,
            output: `"jew,mag,pre=${value}`,
            'output b': prefixEntry.input,
            '*eol\r': 0,
        };
        cubemain.rows.push(recipe);
    };

    const suffixKeys = Object.keys(JEWEL_SUFFIXES);
    const suffixesFound = {};
    const magicsuffixFilename = 'global\\excel\\magicsuffix.txt';
    const magicsuffix = D2RMM.readTsv(magicsuffixFilename);
    rowNum = 0;
    magicsuffix.rows.forEach((row) => {
        if (row.spawnable == '1' && row.itype1 == 'jewl' && suffixKeys.indexOf(row.mod1code) !== -1)
            suffixesFound[row.mod1code] = rowNum;
        rowNum++;
    });
    
    // 宝石 + 耐力 -> 热情宝石
    // 宝石 + 解冻 -> 自由宝石
    for (const [key, value] of Object.entries(suffixesFound)) {
        const suffixEntry = JEWEL_SUFFIXES[key];
        const recipe = {
            description: `MyMOD PotionCraft Jewel + ${suffixEntry.inputLabel} -> Jewel of ${suffixEntry.label}`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': 'jew',
            'input 2': suffixEntry.input,
            ilvl: 100,
            output: `"jew,mag,suf=${value}`,
            'output b': suffixEntry.input,
            '*eol\r': 0,
        };
        cubemain.rows.push(recipe);
    };

    Object.entries(prefixesFound).forEach(([keyp, valuep]) => {
    Object.entries(suffixesFound).forEach(([keys, values]) => {
        const prefixEntry = JEWEL_PREFIXES[keyp];
        const suffixEntry = JEWEL_SUFFIXES[keys];
        const recipe = {
            description: `MyMOD PotionCraft Jewel + ${prefixEntry.inputLabel} + ${suffixEntry.inputLabel} -> ${prefixEntry.label} Jewel of ${suffixEntry.label}`,
            enabled: 1,
            version: 100,
            numinputs: 3,
            'input 1': 'jew',
            'input 2': prefixEntry.input,
            'input 3': suffixEntry.input,
            ilvl: 100,
            output: `"jew,mag,pre=${valuep},suf=${values}`,
            'output b': prefixEntry.input,
            'output c': suffixEntry.input,
            '*eol\r': 0,
        };
        cubemain.rows.push(recipe);
    });
    });
}

// 大型护符制作配方
if (config.specific) {
    const GCHARM_PREFIXES = {
        'Shimmering':  { label: 'Shimmering', inputLabel: 'Perfect Diamond', input: 'gpw' },
        'Sharp':  { label: 'Sharp', inputLabel: 'Perfect Skull', input: 'skz' },
    };

    const GCHARM_SKILL_PREFIXES = [
        { label: "Fletcher's", class: 'ama', skilltab: 0, inputLabel: 'Chipped Topaz', input: 'gcy' },
        { label: "Acrobat's", class: 'ama', skilltab: 1, inputLabel: 'Flawed Topaz', input: 'gfy' },
        { label: "Harpoonist's", class: 'ama', skilltab: 2, inputLabel: 'Flawless Topaz', input: 'gly' },
        { label: "Burning", class: 'sor', skilltab: 3, inputLabel: 'Chipped Sapphire', input: 'gcb' },
        { label: "Sparking", class: 'sor', skilltab: 4, inputLabel: 'Flawed Sapphire', input: 'gfb' },
        { label: "Chilling", class: 'sor', skilltab: 5, inputLabel: 'Flawless Sapphire', input: 'glb' },
        { label: "Hexing", class: 'nec', skilltab: 6, inputLabel: 'Chipped Skull', input: 'skc' },
        { label: "Fungal", class: 'nec', skilltab: 7, inputLabel: 'Flawed Skull', input: 'skf' },
        { label: "Graverobber's", class: 'nec', skilltab: 8, inputLabel: 'Flawless Skull', input: 'skl' },
        { label: "Lion Branded", class: 'pal', skilltab: 9, inputLabel: 'Chipped Diamond', input: 'gcw' },
        { label: "Captain's", class: 'pal', skilltab: 10, inputLabel: 'Flawed Diamond', input: 'gfw' },
        { label: "Preserver's", class: 'pal', skilltab: 11, inputLabel: 'Flawless Diamond', input: 'glw' },
        { label: "Expert's", class: 'bar', skilltab: 12, inputLabel: 'Chipped Amethyst', input: 'gcv' },
        { label: "Fanatic", class: 'bar', skilltab: 13, inputLabel: 'Flawed Amethyst', input: 'gfv' },
        { label: "Sounding", class: 'bar', skilltab: 14, inputLabel: 'Flawless Amethyst', input: 'gzv' },
        { label: "Trainer's", class: 'dru', skilltab: 15, inputLabel: 'Chipped Ruby', input: 'gcr' },
        { label: "Spiritual", class: 'dru', skilltab: 16, inputLabel: 'Flawed Ruby', input: 'gfr' },
        { label: "Nature's", class: 'dru', skilltab: 17, inputLabel: 'Flawless Ruby', input: 'glr' },
        { label: "Entrapping", class: 'ass', skilltab: 18, inputLabel: 'Chipped Emerald', input: 'gcg' },
        { label: "Mentalist's", class: 'ass', skilltab: 19, inputLabel: 'Flawed Emerald', input: 'gfg' },
        { label: "Shogukusha's", class: 'ass', skilltab: 20, inputLabel: 'Flawless Emerald', input: 'glg' },
    ];

    const GCHARM_SUFFIXES = {
        'of Vita': { label: 'Vita', inputLabel: 'Health Potion', input: 'hpot', output: 'hp5' },
        'of Substinence': { label: 'Sustenance', inputLabel: 'Mana Potion', input: 'mpot', output: 'mp5' },
        'of Balance': { label: 'Balance', inputLabel: 'Thawing Potion', input: 'wms', output: 'wms' },
        'of Greed': { label: 'Greed', inputLabel: 'Portal Scroll', input: 'tsc', output: 'tsc' },
        'of Inertia': { label: 'Inertia', inputLabel: 'Stamina Potion', input: 'vps', output: 'vps' },
    };
    
    const prefixKeys = Object.keys(GCHARM_PREFIXES);
    const prefixesFound = {};
    const skillPrefixesFound = [];
    const magicprefixFilename = 'global\\excel\\magicprefix.txt';
    const magicprefix = D2RMM.readTsv(magicprefixFilename);
    let rowNum = 0;
    magicprefix.rows.forEach((row) => {
        if (row.spawnable !== '1')
        {
            // do nothing
        }
        else if (row.itype1 == 'lcha' && prefixKeys.indexOf(row['Name']) !== -1)
            prefixesFound[row['Name']] = rowNum;
        else if (row.itype1 == 'lcha' && row.mod1code == 'skilltab')
            skillPrefixesFound[row.mod1param] = rowNum;
        rowNum++;
    });

    // 大护身符 + 缺损/瑕疵/完美宝石 -> 技能者
    for (let index = 0; index < GCHARM_SKILL_PREFIXES.length; index++) {
        if (typeof skillPrefixesFound[index] !== 'undefined') {
            const prefixEntry = GCHARM_SKILL_PREFIXES[index];
            const recipe = {
                description: `MyMOD PotionCraft Grand Charm + ${prefixEntry.inputLabel} -> ${prefixEntry.label} Charm`,
                enabled: 1,
                version: 100,
                numinputs: 2,
                'input 1': 'cm3',
                'input 2': prefixEntry.input,
                ilvl: 100,
                output: `"cm3,mag,pre=${skillPrefixesFound[index]}"`,
                'output b': prefixEntry.input,
                '*eol\r': 0,
            };
            cubemain.rows.push(recipe);
        }
    }

    // 大护身符 + 完美钻石/骷髅 -> 闪闪发光/锋利
    for (const [key, value] of Object.entries(prefixesFound)) {
        const prefixEntry = GCHARM_PREFIXES[key];
        const recipe = {
            description: `MyMOD PotionCraft Grand Charm + ${prefixEntry.inputLabel} -> ${prefixEntry.label} Charm`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': 'cm3',
            'input 2': prefixEntry.input,
            ilvl: 100,
            output: `"cm3,mag,pre=${value}`,
            'output b': prefixEntry.input,
            '*eol\r': 0,
        };
        cubemain.rows.push(recipe);
    };

    const suffixKeys = Object.keys(GCHARM_SUFFIXES);
    const suffixesFound = {};
    const magicsuffixFilename = 'global\\excel\\magicsuffix.txt';
    const magicsuffix = D2RMM.readTsv(magicsuffixFilename);
    rowNum = 0;
    magicsuffix.rows.forEach((row) => {
        if (row.spawnable == '1' && row.level < 100 && row.itype1 == 'lcha' && suffixKeys.indexOf(row['Name']) !== -1)
            suffixesFound[row['Name']] = rowNum;
        rowNum++;
    });

    // 大护身符 + 生命/法力/解冻/端口/耐力 -> 生命/补充/平衡/贪婪/惰性
    for (const [key, value] of Object.entries(suffixesFound)) {
        const suffixEntry = GCHARM_SUFFIXES[key];
        const recipe = {
            description: `MyMOD PotionCraft Grand Charm + ${suffixEntry.inputLabel} -> Charm of ${suffixEntry.label}`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': 'cm3',
            'input 2': suffixEntry.input,
            ilvl: 100,
            output: `"cm3,mag,suf=${value}`,
            'output b': suffixEntry.output,
            '*eol\r': 0,
        };
        cubemain.rows.push(recipe);
    };

    for (let index = 0; index < GCHARM_SKILL_PREFIXES.length; index++) {
        if (typeof skillPrefixesFound[index] == 'undefined') continue;
        const prefixEntry = GCHARM_SKILL_PREFIXES[index];
        const valuep = skillPrefixesFound[index];
        Object.entries(suffixesFound).forEach(([keys, values]) => {
            const suffixEntry = GCHARM_SUFFIXES[keys];
            const recipe = {
                description: `MyMOD PotionCraft Grand Charm + ${prefixEntry.inputLabel} + ${suffixEntry.inputLabel} -> ${prefixEntry.label} Charm of ${suffixEntry.label}`,
                enabled: 1,
                version: 100,
                numinputs: 3,
                'input 1': 'cm3',
                'input 2': prefixEntry.input,
                'input 3': suffixEntry.input,
                ilvl: 100,
                output: `"cm3,mag,pre=${valuep},suf=${values}`,
                'output b': prefixEntry.input,
                'output c': suffixEntry.output,
                '*eol\r': 0,
            };
            cubemain.rows.push(recipe);
        });
    };

    Object.entries(prefixesFound).forEach(([keyp, valuep]) => {
    Object.entries(suffixesFound).forEach(([keys, values]) => {
        const prefixEntry = GCHARM_PREFIXES[keyp];
        const suffixEntry = GCHARM_SUFFIXES[keys];
        const recipe = {
            description: `MyMOD PotionCraft Grand Charm + ${prefixEntry.inputLabel} + ${suffixEntry.inputLabel} -> ${prefixEntry.label} Charm of ${suffixEntry.label}`,
            enabled: 1,
            version: 100,
            numinputs: 3,
            'input 1': 'cm3',
            'input 2': prefixEntry.input,
            'input 3': suffixEntry.input,
            ilvl: 100,
            output: `"cm3,mag,pre=${valuep},suf=${values}`,
            'output b': prefixEntry.input,
            'output c': suffixEntry.output,
            '*eol\r': 0,
        };
        cubemain.rows.push(recipe);
    });
    });
}

// 小护符制作配方
if (config.specific) {
    const SCHARM_PREFIXES = {
        'Shimmering':  { label: 'Shimmering', inputLabel: 'Perfect Diamond', input: 'gpw' },
        'Sapphire': { label: 'Sapphire', inputLabel: 'Perfect Sapphire', input: 'gpb' },
        'Ruby': { label: 'Ruby', inputLabel: 'Perfect Ruby', input: 'gpr' },
        'Amber': { label: 'Amber', inputLabel: 'Perfect Topaz', input: 'gpy' },
        'Emerald': { label: 'Emerald', inputLabel: 'Perfect Emerald', input: 'gpg' },
        'Fine':  { label: 'Fine', inputLabel: 'Skull', input: 'sku' },
        'Pestilent':  { label: 'Pestilent', inputLabel: 'Emerald', input: 'gsg' },
        'Shocking':  { label: 'Shocking', inputLabel: 'Topaz', input: 'gsy' },
        'Flaming':  { label: 'Flaming', inputLabel: 'Ruby', input: 'gsr' },
        'Hibernal':  { label: 'Hibernal', inputLabel: 'Sapphire', input: 'gsb' },
    };

    const SCHARM_SUFFIXES = {
        'of Vita': { label: 'Vita', inputLabel: 'Health Potion', input: 'hpot', output: 'hp5' },
        'of Substinence': { label: 'Sustenance', inputLabel: 'Mana Potion', input: 'mpot', output: 'mp5' },
        'of Balance': { label: 'Balance', inputLabel: 'Thawing Potion', input: 'wms', output: 'wms' },
        'of Greed': { label: 'Greed', inputLabel: 'Portal Scroll', input: 'tsc', output: 'tsc' },
        'of Inertia': { label: 'Inertia', inputLabel: 'Stamina Potion', input: 'vps', output: 'vps' },
        'of Anthrax': { label: 'Anthrax', inputLabel: 'Antidote Potion', input: 'yps', output: 'yps' },
        'of Good Luck': { label: 'Good Luck', inputLabel: 'Identify Scroll', input: 'isc', output: 'isc' },
    };

    const prefixKeys = Object.keys(SCHARM_PREFIXES);
    const prefixesFound = {};
    const magicprefixFilename = 'global\\excel\\magicprefix.txt';
    const magicprefix = D2RMM.readTsv(magicprefixFilename);
    let rowNum = 0;
    magicprefix.rows.forEach((row) => {
        if (row.spawnable == '1' && row.itype1 == 'scha' && prefixKeys.indexOf(row['Name']) !== -1)
            prefixesFound[row['Name']] = rowNum;
        rowNum++;
    });
    //D2RMM.writeTsv(magicprefixFilename, magicprefix);

    // 小护身符 + 完美宝石 -> 抵抗护身符
    // 小护身符 + 标准宝石 -> 伤害护身符
    for (const [key, value] of Object.entries(prefixesFound)) {
        const prefixEntry = SCHARM_PREFIXES[key];
        const recipe = {
            description: `MyMOD PotionCraft Small Charm + ${prefixEntry.inputLabel} -> ${prefixEntry.label} Charm`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': 'cm1',
            'input 2': prefixEntry.input,
            ilvl: 100,
            output: `"cm1,mag,pre=${value}`,
            'output b': prefixEntry.input,
            '*eol\r': 0,
        };
        cubemain.rows.push(recipe);
    };

    const suffixKeys = Object.keys(SCHARM_SUFFIXES);
    const suffixesFound = {};
    const magicsuffixFilename = 'global\\excel\\magicsuffix.txt';
    const magicsuffix = D2RMM.readTsv(magicsuffixFilename);
    rowNum = 0;
    magicsuffix.rows.forEach((row) => {
        if (row.spawnable == '1' && row.level < 100 && row.itype1 == 'scha' && suffixKeys.indexOf(row['Name']) !== -1)
            suffixesFound[row['Name']] = rowNum;
        rowNum++;
    });
    //D2RMM.writeTsv(magicsuffixFilename, magicsuffix);

    // 小护身符 + 生命/法力/解冻/端口/耐力/抗/ID -> 生命/辅助/平衡/GF/MS/PD/MF
    for (const [key, value] of Object.entries(suffixesFound)) {
        const suffixEntry = SCHARM_SUFFIXES[key];
        const recipe = {
            description: `MyMOD PotionCraft Small Charm + ${suffixEntry.inputLabel} -> Charm of ${suffixEntry.label}`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': 'cm1',
            'input 2': suffixEntry.input,
            ilvl: 100,
            output: `"cm1,mag,suf=${value}`,
            'output b': suffixEntry.output,
            '*eol\r': 0,
        };
        cubemain.rows.push(recipe);
    };

    Object.entries(prefixesFound).forEach(([keyp, valuep]) => {
    Object.entries(suffixesFound).forEach(([keys, values]) => {
        const prefixEntry = SCHARM_PREFIXES[keyp];
        const suffixEntry = SCHARM_SUFFIXES[keys];
        const recipe = {
            description: `MyMOD PotionCraft Small Charm + ${prefixEntry.inputLabel} + ${suffixEntry.inputLabel} -> ${prefixEntry.label} Charm of ${suffixEntry.label}`,
            enabled: 1,
            version: 100,
            numinputs: 3,
            'input 1': 'cm1',
            'input 2': prefixEntry.input,
            'input 3': suffixEntry.input,
            ilvl: 100,
            output: `"cm1,mag,pre=${valuep},suf=${values}`,
            'output b': prefixEntry.input,
            'output c': suffixEntry.output,
            '*eol\r': 0,
        };
        cubemain.rows.push(recipe);
    });
    });
}

// 暗金破甲护符制作配方
if (config.specific || true) {
    const GCHARM_UNIQUE = [
        { input1Label: 'Small', input1: 'cm1', input2Label: 'Amethyst', input2: 'gsv', output: "Annihilus" },
        { input1Label: 'Large', input1: 'cm2', input2Label: 'Amethyst', input2: 'gsv', output: "Hellfire Torch" },
        { input1Label: 'Grand', input1: 'cm3', input2Label: 'Amethyst', input2: 'gsv', output: "Gheed's Fortune" },
        { input1Label: 'Grand', input1: 'cm3', input2Label: 'Diamond', input2: 'gsw', output: 'Bone Break' },
        { input1Label: 'Grand', input1: 'cm3', input2Label: 'Emerald', input2: 'gsg', output: 'Rotting Fissure' },
        { input1Label: 'Grand', input1: 'cm3', input2Label: 'Ruby', input2: 'gsr', output: 'Flame Rift' },
        { input1Label: 'Grand', input1: 'cm3', input2Label: 'Sapphire', input2: 'gsb', output: 'Cold Rupture' },
        { input1Label: 'Grand', input1: 'cm3', input2Label: 'Topaz', input2: 'gsy', output: 'Crack of the Heavens' },
        { input1Label: 'Grand', input1: 'cm3', input2Label: 'Skull', input2: 'sku', output: 'Black Cleft' },
    ];

    // 大护身符 + 标准宝石 -> 破甲护身符
    for (let index = 0; index < GCHARM_UNIQUE.length; index++) {
        const entry = GCHARM_UNIQUE[index];
        const recipe = {
            description: `MyMOD PotionCraft ${entry.input1Label} Charm + ${entry.input2Label} -> ${entry.output}`,
            enabled: 1,
            version: 100,
            numinputs: 2,
            'input 1': entry.input1,
            'input 2': entry.input2,
            ilvl: 100,
            output: entry.output,
            '*eol\r': 0,
        };
        cubemain.rows.push(recipe);
    };
}

D2RMM.writeTsv(cubemainFilename, cubemain);



