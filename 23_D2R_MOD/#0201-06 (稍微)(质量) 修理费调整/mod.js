// 维修降价
const npcFilename = 'global\\excel\\npc.txt';
const npc = D2RMM.readTsv(npcFilename);

// “rep-mult”默认值为128。128 1024给出12.5%。这就是repairMultiplier值的来源。
npc.rows.forEach((row) => {
    row['rep mult'] = Math.floor(((config.repMult * 12.5) * 1024) / 100);
});

D2RMM.writeTsv(npcFilename, npc);
