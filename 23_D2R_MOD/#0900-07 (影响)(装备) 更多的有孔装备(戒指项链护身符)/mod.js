// 1. 定义品质逻辑注册表
const CHARM_QUALITY_MAP = {
    'Magic':        { Magic: '1',   Rare: '',    Normal: '0' }, 
    'Rare':         { Magic: '',    Rare: '1',   Normal: '0' }, 
    'Normal_Only':  { Magic: '',    Rare: '',    Normal: '1' }, 
    'Like_Jewel' :  { Magic: '1',   Rare: '1',   Normal: '0' }, 
    'All':          { Magic: '1',   Rare: '1',   Normal: '1' }  
};

// 2. 定义统一的杂项配置注册表
const MISC_MASTER_CACHE = {
    'ring': { configKey: 'socket_to_Ring_and_Amule', sockets: 1, behavior: 'ring_Behavior' },
    'amul': { configKey: 'socket_to_Ring_and_Amule', sockets: 1, behavior: 'amul_Behavior' },
    'lcha': { configKey: 'socket_to_charm', sockets: 3, behavior: 'lcha_Behavior', isCharm: true },
    'mcha': { configKey: 'socket_to_charm', sockets: 2, behavior: 'mcha_Behavior', isCharm: true },
    'scha': { configKey: 'socket_to_charm', sockets: 1, behavior: 'scha_Behavior', isCharm: true }
};

// 3. 性能预计算
const activeMiscConfigs = new Set(
    Object.values(MISC_MASTER_CACHE)
        .map(spec => spec.configKey)
        .filter(key => config[key])
);

// 品质设置
const selectedQuality = CHARM_QUALITY_MAP[config.charm_color];

if (activeMiscConfigs.size > 0) {
    // ************************ 处理 misc.txt ************************ //
    const miscFiles = ['global\\excel\\misc.txt', 'global\\excel\\base\\misc.txt'];
    miscFiles.forEach(filename => {
        const misc = D2RMM.readTsv(filename);
        if (!misc || !misc.rows) return;
        let modified = false;

        misc.rows.forEach(row => {
            const spec = MISC_MASTER_CACHE[row.type];
            if (spec && activeMiscConfigs.has(spec.configKey)) {
                row.hasinv = '1';
                row.gemsockets = String(spec.sockets);
                row.gemapplytype = String(config[spec.behavior]);
                row.spawnable = '1';
                modified = true;
            }
        });
        if (modified) D2RMM.writeTsv(filename, misc);
    });

    // ************************ 处理 itemtypes.txt ************************ //
    const itemtypesFiles = ['global\\excel\\itemtypes.txt', 'global\\excel\\base\\itemtypes.txt'];
    itemtypesFiles.forEach(filename => {
        const itemtypes = D2RMM.readTsv(filename);
        if (!itemtypes || !itemtypes.rows) return;
        let modified = false;
        itemtypes.rows.forEach(row => {
            const code = row.Code;
            let spec = MISC_MASTER_CACHE[code];
            const isCharType = code === 'char';
            
            if (!spec && isCharType && config.socket_to_charm) {
                spec = { sockets: 3, isCharm: true }; 
            }

            if (spec && (activeMiscConfigs.has(spec.configKey) || isCharType)) {
                row.MaxSockets1 = String(spec.sockets);
                row.MaxSockets2 = String(spec.sockets);
                row.MaxSockets3 = String(spec.sockets);

                if (selectedQuality && (spec.isCharm || isCharType)) {
                    row.Magic = selectedQuality.Magic;
                    row.Rare = selectedQuality.Rare;
                    row.Normal = selectedQuality.Normal;
                }
                modified = true;
            }
        });
        if (modified) D2RMM.writeTsv(filename, itemtypes);
    });
}

// ************************ 新的打孔和反镶嵌配方 ************************ //
if (config.New_Jewelry_Recipes) {
    const cubeFiles = ['global\\excel\\cubemain.txt', 'global\\excel\\base\\cubemain.txt'];

    cubeFiles.forEach(cubeFilename => {
        const cube = D2RMM.readTsv(cubeFilename);
        if (!cube || !cube.rows) return;
        
        // 核心修复：更健壮地获取 Header，防止 D2RMM 环境下 columns 丢失导致的 forEach 报错
        const header = cube.columns || (cube.rows.length > 0 ? Object.keys(cube.rows[0]) : []);
        
        const createRecipe = (data) => {
            const newRow = {};
            if (header.length > 0) {
                header.forEach(col => {
                    newRow[col] = data[col] !== undefined ? data[col] : '';
                });
            } else {
                // 彻底兜底：如果连列名都拿不到，直接按输入对象赋值
                Object.assign(newRow, data);
            }
            newRow.enabled = '1';
            newRow.version = '100';
            newRow['*eol\r'] = '0'; 
            return newRow;
        };

        const socketTargets = [
            { code: 'ring', s: 1, desc: 'Ring' },
            { code: 'amul', s: 1, desc: 'Amulet' },
            { code: 'scha', s: 1, desc: 'SC' },
            { code: 'mcha', s: 2, desc: 'MC' },
            { code: 'lcha', s: 3, desc: 'LC' }
        ];

        socketTargets.forEach(target => {
            cube.rows.push(createRecipe({
                description: `MyMOD Add Socket to ${target.desc}`,
                numinputs: '2',
                'input 1': `${target.code},nos`, 
                'input 2': 'wms', 
                output: 'usetype,mod',
                'mod 1': 'sock',
                'mod 1 min': String(target.s),
                'mod 1 max': String(target.s)
            }));
        });

        const unSocketTypes = ['ring', 'amul', 'char'];
        unSocketTypes.forEach(type => {
            cube.rows.push(createRecipe({
                description: `MyMOD Unsocket ${type}`,
                numinputs: '3',
                'input 1': type,
                'input 2': 'r15',
                'input 3': 'tsc',
                output: 'useitem,rem'
            }));
        });

        D2RMM.writeTsv(cubeFilename, cube);
    });
}