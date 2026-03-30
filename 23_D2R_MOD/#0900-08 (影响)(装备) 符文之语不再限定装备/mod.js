const runesFiles = ['global\\excel\\runes.txt', 'global\\excel\\base\\runes.txt'];

runesFiles.forEach(runesFilename => {
    const runes = D2RMM.readTsv(runesFilename);
    if (!runes || !runes.rows) return;

    // 符文之语不限定装备类型, 所有符文之语通用.
    if (config.unlock_all) {
        // 这里我增加了个开关.
        runes.rows.forEach((row) => {
            if (row.complete === '1') {
                // 解锁天梯符文之语
                row.firstLadderSeason = '';
                row.lastLadderSeason = '';
                row['*Patch Release'] = ''; // 旧版?

                // 清空原有类型设置.
                row.itype1 = 'weap'; // 所有武器
                row.itype2 = 'armo'; // 所有护甲和盾牌
                row.itype3 = 'char'; // 总护符类别
                row.itype4 = 'misl'; // 杂物 > 箭筒
                row.itype5 = ''; 
                row.itype6 = '';
            }
        });
    } 
    // 带过滤器的手动解锁模块.
    else if (config.manual_unlock) {
        // 不要动原MOD, 在这下面添加个带过滤器的模块, 如果上面的开启了, 则忽略这个模块.

        // 所有武器可用 weap
        const weap_can_be_use = [];

        // 所有护甲可用 armo, 包括: 衣服tors, 头盔helm, 盾牌shld, 手套glov, 鞋子boot, 腰带belt, 
        const armo_can_be_use = [
            "Vigilance"
        ];

        // 单护甲衣服可用 tors
        const tors_can_be_use = [];

        // 所有头盔可用的符文之语 helm
        const helm_can_be_use = [];

        // 所有盾牌可用 shld
        const shld_can_be_use = [];

        // 手套可用的符文之语 glov (更多有孔装备MOD中设置为-武器)
        const glov_can_be_use = [ 
            // 2孔武器
            "Leaf", "Steel", "Strength", "White", "Wind", "Zephyr", 
            // 3孔武器
            "Black", "Chaos", "Crescent" "Moon", "Edge", "Fury", 
            "Hysteria", "King's Grace", "Lawbringer", "Malice", "Melody", 
            "Mosaic", "Pattern", "Plague", "Ritual", "Venom", "Void", 
            // 4孔武器
            "Brand", "Faith", "Famine", "Fortitude", "Hand of Justice", "Harmony", 
            "Heart of the Oak", "Holy Thunder", "Ice", "Infinity", "Insight", "Kingslayer", 
            "Memory", "Oath", "Passion", "Phoenix", "Pride", "Rift", "Spirit", "Voice of Reason", "Wrath" 
        ];

        // 鞋子可用的符文之语 boot (更多有孔装备MOD中设置为-盾牌)
        const boot_can_be_use = [
            // 2孔盾牌
            "Rhyme", "Splendor", // "Vigilance",
            // 3孔盾牌
            "Ancients' Pledge", "Dragon", "Dream", "Sanctuary",
            // 4孔盾牌
            "Exile", "Phoenix", "Spirit",
            // 2孔头盔
            "Lore", "Nadir",
            // 3孔头盔
            "Bulwark", "Coven", "Cure", "Delirium", "Dream", "Flickering Flame", "Ground", "Hearth", "Metamorphosis", "Radiance", "Temper", "Wisdom"
        ];

        // 腰带可用的符文之语 belt (更多有孔装备MOD中设置为-衣服)
        const belt_can_be_use = [
            // 2孔武器
            "Leaf", "Steel", "Strength", "White", "Wind", "Zephyr",
            // 2孔头盔
            "Nadir", "Lore", 
            // 2孔护甲
            "Stealth", "Smoke", "Prudence",
            // 2孔盾牌
            "Rhyme", "Splendor", // "Vigilance"
        ];

        // 杂物可用的 misl, 留给以后的箭筒MOD, 包括大中小护符char, 
        const misl_can_be_use = [];

        // 大中小护身符可用的符文之语 char
        const char_can_be_use = [
            // 2孔头
            "Lore", "Nadir",
            // 2孔护甲
            "Prudence", "Smoke", "Stealth",
            // 2孔盾牌
            "Rhyme", "Splendor", "Vigilance"
        ];

        // 建立映射关系方便循环处理
        const rules = [
            { list: weap_can_be_use, code: 'weap' },
            { list: armo_can_be_use, code: 'armo' },
            { list: tors_can_be_use, code: 'tors' },
            { list: helm_can_be_use, code: 'helm' },
            { list: shld_can_be_use, code: 'shld' },
            { list: glov_can_be_use, code: 'glov' },
            { list: boot_can_be_use, code: 'boot' },
            { list: belt_can_be_use, code: 'belt' },
            { list: misl_can_be_use, code: 'misl' },
            { list: char_can_be_use, code: 'char' }
        ];

        runes.rows.forEach(row => {
            const runeName = row['*Rune Name'];
            if (!runeName) return;

            rules.forEach(rule => {
                // 检查当前符文之语是否在当前列表内
                if (rule.list.includes(runeName)) {
                    // 顺序寻找 itype1 到 itype6 的空位
                    for (let i = 1; i <= 6; i++) {
                        const itypeKey = `itype${i}`;
                        
                        // 如果这个位置已经有了相同的代码，说明不需要再写了，直接跳出
                        if (row[itypeKey] === rule.code) break;

                        // 如果这个位置是空的，则写入
                        if (row[itypeKey] === '' || row[itypeKey] == null) {
                            row[itypeKey] = rule.code;
                            break; // 写入成功后跳出当前符文的 i 循环，处理下一个规则
                        }
                        // 如果有其他数据，则循环到下一个 i
                    }
                }
            });
        });
    }

    D2RMM.writeTsv(runesFilename, runes);
});