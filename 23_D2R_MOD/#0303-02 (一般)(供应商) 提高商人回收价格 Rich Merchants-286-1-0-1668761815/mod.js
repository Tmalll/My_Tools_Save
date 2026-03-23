const npcFilename = 'global\\excel\\npc.txt';
const npcData = D2RMM.readTsv(npcFilename);

npcData.rows.forEach((row) => {
    if(config.useStaticPrice){
        for (const key in row) {
            if(key.includes('max buy')){
                row[key] = config.maxPrice;
            }
        }
    } else {
        const base = Math.floor(row['max buy']);
        row['max buy (N)'] = base + 25000;
        for (const key in row) {
            if(key.includes('max buy') && key.includes('H')){
                row[key] = base + 50000;
            }
        }
    }
});
D2RMM.writeTsv(npcFilename, npcData);