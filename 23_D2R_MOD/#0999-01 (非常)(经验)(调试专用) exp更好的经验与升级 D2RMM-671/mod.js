// 设置角色最大等级
const expFile = 'global\\excel\\experience.txt';
const exp = D2RMM.readTsv(expFile);
const classColumns = [
    'Amazon', 'Sorceress', 'Necromancer', 'Paladin',
    'Barbarian', 'Druid', 'Assassin'
];
const currentMaxLevel = Math.max(...exp.rows.map(r => !isNaN(r.Level) ? Number(r.Level) : -1));
let lastRow = exp.rows.filter(r => !isNaN(r.Level)).slice(-1)[0];
let growthRate = config.expGrowthRate || 1.08;  // Default to 8% growth per level

if ( config.maxLevel > 99 ) {

    for (let lvl = currentMaxLevel + 1; lvl <= config.maxLevel; lvl++) {
        const newRow = { Level: lvl.toString() };

        classColumns.forEach(col => {
            const prevXP = Number(lastRow[col]);
            const nextXP = Math.round(prevXP * growthRate);
            newRow[col] = nextXP;
        });
        exp.rows.push(newRow);
        lastRow = newRow;
    }
}

exp.rows.forEach((row, index) => {    
    // 修改MaxLvl这一行所有职业最大等级.并且ExpRatio=10(游戏默认)
    if (row.Level === 'MaxLvl') {
        classColumns.forEach((col) => {
            row[col] = config.maxLevel;
        });
        row['ExpRatio\r'] = 10;
        return;
    }

    // 调整每级所需经验
    if (!isNaN(row.Level)) {
        classColumns.forEach(col => {
            if (!isNaN(row[col])) {
                const level = row['Level'];
                // 90级+
                if (level !== 'MaxLvl' && level !== '0' && level >= 91 ) {
                    row[col] = Math.round(Number(row[col]) * config.expUp90up + 1 );
                }
                // 61~90级
                if (level !== 'MaxLvl' && level !== '0' && level >= 61 && level <= 90 ) {
                    row[col] = Math.round(Number(row[col]) * config.expUp61_90 + 1 );
                }
                // 31~60级
                if (level !== 'MaxLvl' && level !== '0' && level >= 31 && level <= 60 ) {
                    row[col] = Math.round(Number(row[col]) * config.expUp31_60 + 1 );
                }
                // 小于30级
                if (level !== 'MaxLvl' && level !== '0' && level >= 1 && level <= 30 ) {
                    row[col] = Math.round(Number(row[col]) * config.expUp1_30 + 1 );
                }
                // 一怪就满级
                if (config.one_monster_full_Level) {
                    if (level !== 'MaxLvl' && level !== '0' && level <= config.maxLevel ) {
                        row[col] = Math.round(Number(row[col]) * 0 + 1 );
                    }
                }
            }
        });
    }
});

// 新增：当最大等级小于99时，删除经验表中等级小于最大等级的行
if (config.maxLevel < 99) {
    exp.rows = exp.rows.filter(row => {
        if (!isNaN(row.Level)) {
            return Number(row.Level) <= config.maxLevel;
        }
        return true;
    });
}

D2RMM.writeTsv(expFile, exp);


// 调整经验获取比率
const experienceFilename = 'global\\excel\\experience.txt';
const experience = D2RMM.readTsv(experienceFilename);

experience.rows.forEach((row) => {
    // 统一经验获取比率.
    if (config.Unified_experience_acquisition_ratio) {
        row['ExpRatio\r'] = 1024;
    }
    // 设置经验获取倍率
    const exp = row['ExpRatio\r'];
    let expValue = Math.round(config.expIncreaseNum * exp);
        row['ExpRatio\r'] = expValue;
    
});

D2RMM.writeTsv(experienceFilename, experience);

