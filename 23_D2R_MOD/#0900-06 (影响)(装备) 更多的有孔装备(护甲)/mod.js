// 1. 定义统一的护甲配置注册表
const ARMOR_MASTER_CACHE = {
    'helm': { configKey: 'Helms_Socket_to_Max_4',  sockets: 4 }, // 普通头盔
    'circ': { configKey: 'Helms_Socket_to_Max_4',  sockets: 4 }, // 头环
    'phlm': { configKey: 'Helms_Socket_to_Max_4',  sockets: 4 }, // 野蛮人头
    'pelt': { configKey: 'Helms_Socket_to_Max_4',  sockets: 4 }, // 德鲁伊头
    'tors': { configKey: 'Tors_Socket_to_Max_6',   sockets: 6 }, // 护甲
    'shie': { configKey: 'Shield_Socket_to_Max_6', sockets: 6 }, // 普通盾牌
    'ashd': { configKey: 'Shield_Socket_to_Max_6', sockets: 6 }, // 圣骑士专用盾
    'head': { configKey: 'Shield_Socket_to_Max_6', sockets: 4 }, // 死灵专属盾
    'grim': { configKey: 'Shield_Socket_to_Max_6', sockets: 4 }, // 术士魔典
    'glov': { configKey: 'Gloves_Socket_To_4',     sockets: 4, behavior: 'Gloves_Behavior' }, // 手套
    'boot': { configKey: 'Boots_Socket_To_4',      sockets: 4, behavior: 'Boots_Behavior'  }, // 鞋子
    'belt': { configKey: 'Belts_Socket_To_2',      sockets: 2, behavior: 'Belts_Behavior'  }  // 腰带
};

// 预先获取所有激活的开关 Key，减少循环内的 config[key] 访问频率
const activeConfigs = new Set(
  Object.values(ARMOR_MASTER_CACHE)
    .map(spec => spec.configKey)
    .filter(key => config[key])
);

// 如果没有任何相关开关开启，直接结束脚本，不浪费 I/O 性能
if (activeConfigs.size > 0) {

    // ************************ 2. 处理 armor.txt ************************ //
    const armorFiles = ['global\\excel\\armor.txt', 'global\\excel\\base\\armor.txt'];
    armorFiles.forEach(filename => {
        const armor = D2RMM.readTsv(filename);
        let modified = false;

        armor.rows.forEach(row => {
            const spec = ARMOR_MASTER_CACHE[row.type];
            // 只有当该类型在缓存中，且其对应的 configKey 在已开启列表中时才修改
            if (spec && activeConfigs.has(spec.configKey)) {
                row.hasinv = 1;
                row.gemsockets = spec.sockets;
                if (spec.behavior) {
                    row.gemapplytype = config[spec.behavior];
                }
                modified = true;
            }
        });
        if (modified) D2RMM.writeTsv(filename, armor);
    });

    // ************************ 3. 处理 itemtypes.txt ************************ //
    const itemtypesFiles = ['global\\excel\\itemtypes.txt', 'global\\excel\\base\\itemtypes.txt'];
    itemtypesFiles.forEach(filename => {
        const itemtypes = D2RMM.readTsv(filename);
        let modified = false;

        itemtypes.rows.forEach(row => {
            const spec = ARMOR_MASTER_CACHE[row.Code];
            if (spec && activeConfigs.has(spec.configKey)) {
                // 批量设置最大插槽，数值以注册表定义为准
                const s = spec.sockets;
                row.MaxSockets1 = s;
                row.MaxSockets2 = s;
                row.MaxSockets3 = s;
                modified = true;
            }
        });
        if (modified) D2RMM.writeTsv(filename, itemtypes);
    });
}