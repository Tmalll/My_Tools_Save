const throwingCodes = new Set(['jave', 'tkni', 'taxe', 'ajav']);

// 1. 处理 weapons.txt
const weaponsFiles = ['global\\excel\\weapons.txt', 'global\\excel\\base\\weapons.txt'];
weaponsFiles.forEach(filename => {
    let weapons = D2RMM.readTsv(filename);
    let modified = false;

    weapons.rows.forEach(row => {
        const isThrowing = throwingCodes.has(row.type);

        // 逻辑：如果开了“全武器”，则改所有行；否则如果只开了“仅投掷”，则只改投掷行
        if (config.all_weap_to_Max_6_socks) {
            row.hasinv = 1;
            row.gemsockets = 6;
            modified = true;
        } else if (config.Only_socket_Throwing && isThrowing) {
            row.hasinv = 1;
            row.gemsockets = 6;
            modified = true;
        }
    });

    if (modified) D2RMM.writeTsv(filename, weapons);
});

// 2. 处理 itemtypes.txt
const itemtypesFiles = ['global\\excel\\itemtypes.txt', 'global\\excel\\base\\itemtypes.txt'];
itemtypesFiles.forEach(filename => {
    let itemtypes = D2RMM.readTsv(filename);
    let modified = false;

    itemtypes.rows.forEach(row => {
        const isThrowingType = throwingCodes.has(row.Code);
        const isWeaponPage = row.StorePage === 'weap';

        // 逻辑：全武器模式覆盖范围更广；仅投掷模式精准修改
        if (config.all_weap_to_Max_6_socks) {
            if (isWeaponPage || isThrowingType) {
                row.MaxSockets1 = 6;
                row.MaxSockets2 = 6;
                row.MaxSockets3 = 6;
                modified = true;
            }
        } else if (config.Only_socket_Throwing && isThrowingType) {
            row.MaxSockets1 = 6;
            row.MaxSockets2 = 6;
            row.MaxSockets3 = 6;
            modified = true;
        }
    });

    if (modified) D2RMM.writeTsv(filename, itemtypes);
});