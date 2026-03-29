// 1. 定义打孔注册表
// 格式: [ "武器Code/类型", "最小孔数", "最大孔数", "关联的config开关" ]
const MODIFY_SOCKETS_REGISTRY = [
    // 投掷武器
    ["jave", "1", "6", "Only_socket_Throwing"],
    ["tkni", "1", "6", "Only_socket_Throwing"],
    ["taxe", "1", "6", "Only_socket_Throwing"],
    ["ajav", "1", "6", "Only_socket_Throwing"],

    // 弓弩
    ["bow",  "1", "6", "Only_socket_Bow_and_Crossbow"],
    ["xbow", "1", "6", "Only_socket_Bow_and_Crossbow"],
    ["abow", "1", "6", "Only_socket_Bow_and_Crossbow"]
];

// 2. 性能优化：预先筛选出当前开启的配置，生成快速查询表
const activeConfigs = {};
MODIFY_SOCKETS_REGISTRY.forEach(([code, min, max, configKey]) => {
    if (config[configKey]) {
        activeConfigs[code] = { min, max };
    }
});

// ************************ 处理 weapons.txt ************************ //
const weaponsFiles = ['global\\excel\\weapons.txt', 'global\\excel\\base\\weapons.txt'];
weaponsFiles.forEach(filename => {
    const weapons = D2RMM.readTsv(filename);
    if (!weapons || !weapons.rows) return;
    let modified = false;

    weapons.rows.forEach(row => {
        // 排除空行
        if (!row.type) return;

        const spec = activeConfigs[row.type];
        
        // 逻辑：全开模式覆盖所有；否则按注册表匹配
        if (config.all_weap_to_Max_6_socks) {
            row.hasinv = '1';
            row.gemsockets = '6';
            modified = true;
        } else if (spec) {
            row.hasinv = '1';
            row.gemsockets = spec.max; // 武器表通常只存最大孔数
            modified = true;
        }
    });

    if (modified) D2RMM.writeTsv(filename, weapons);
});

// ************************ 处理 itemtypes.txt ************************ //
const itemtypesFiles = ['global\\excel\\itemtypes.txt', 'global\\excel\\base\\itemtypes.txt'];
itemtypesFiles.forEach(filename => {
    const itemtypes = D2RMM.readTsv(filename);
    if (!itemtypes || !itemtypes.rows) return;
    let modified = false;

    itemtypes.rows.forEach(row => {
        const code = row.Code;
        if (!code) return;

        const spec = activeConfigs[code];
        const isWeaponPage = row.StorePage === 'weap';

        if (config.all_weap_to_Max_6_socks) {
            // 全开模式：修改所有武器页面相关的类型
            if (isWeaponPage || spec) {
                row.MaxSockets1 = '6';
                row.MaxSockets2 = '6';
                row.MaxSockets3 = '6';
                modified = true;
            }
        } else if (spec) {
            // 注册表模式：精准修改匹配到的类型
            row.MaxSockets1 = spec.max;
            row.MaxSockets2 = spec.max;
            row.MaxSockets3 = spec.max;
            modified = true;
        }
    });

    if (modified) D2RMM.writeTsv(filename, itemtypes);
});