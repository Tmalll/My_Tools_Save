const bosses = ['Andariel (H)', 'Andarielq (H)', 'Duriel (H) - Base', 'Durielq (H) - Base', 'Mephisto (H)', 'Mephistoq (H)', 'Diablo (H)', 'Diabloq (H)', 'Baal (H)', 'Baalq (H)'];
const minorbosses = ['Blood Raven (H)', 'Radament (H)', 'Summoner (H)', 'Izual (H)', 'Haphesto (H)', 'Nihlathak (H)'];

const treasureclassexFilenames = ['global\\excel\\treasureclassex.txt', 'global\\excel\\base\\treasureclassex.txt'];
treasureclassexFilenames.forEach((treasureclassexFilename) => {
  const treasureclassex = D2RMM.readTsv(treasureclassexFilename);
  if (!treasureclassex || treasureclassex.rows.length === 0) return;
  const eolKey = Object.keys(treasureclassex.rows[0]).find(key => key.startsWith('*eol'));

  let index = 0;
  treasureclassex.rows.forEach((row) => {
    let treasureClass = row['Treasure Class'];

    if (config.terrorZoneDroprateMultiplier !== 1 || config.equalizeElementalRatios) {
      if (treasureClass === 'Sunder Charms') {
        if (config.terrorZoneDroprateMultiplier !== 1)
        {
          const noDrop = parseInt(row.NoDrop) || 0
          row.NoDrop = Math.ceil(noDrop / config.terrorZoneDroprateMultiplier);
        }

        if (config.equalizeElementalRatios) {
          let totalProb = 0;
          let probCount = 0;
          for (let i = 1; i <= 10; i++) {
            if (row['Item' + i] !== '') {
              totalProb += parseInt(row['Prob' + i]);
              probCount++;
            }
          }
          const averageProb = Math.ceil(totalProb / probCount);
          for (let i = 1; i <= 10; i++) {
            if (row['Item' + i] !== '') {
              row['Prob' + i] = averageProb;
            }
          }
        }
      }
    }

    if (config.addToBossLootTables && config.bossDropWeight > 0) {
      if (treasureClass === 'Sunder Charms') {
        let sunderCharmsMod = {
          'Treasure Class': "Sunder Charms (Mod)",
          Picks: 1,
          NoDrop: 0,
          [eolKey]: 0,
        };

        for (let i = 1; i <= 10; i++) {
          if (row['Item' + i] !== '') {
            sunderCharmsMod['Item' + i] = row['Item' + i];
            sunderCharmsMod['Prob' + i] = row['Prob' + i];
          }
        }

        treasureclassex.rows.splice(index + 1, 0, sunderCharmsMod); // insert right below the original Sunder Charms row
      }

      if (bosses.includes(treasureClass)) {
        row['NoDrop'] *= 50;

        let totalWeight = 0;
        for (let i = 1; i <= 10; i++) {
          if (row['Item' + i] == '') {
            row['Item' + i] = 'Sunder Charms (Mod)';
            row['Prob' + i] = Math.max(Math.round((config.bossDropWeight / 100) * totalWeight), 1);
            break;
          }
          else {
            row['Prob' + i] *= 50;
            totalWeight += +row['Prob' + i];
          }
        }
      }

      if (minorbosses.includes(treasureClass)) {
        row['NoDrop'] *= 50;

        let totalWeight = 0;
        for (let i = 1; i <= 10; i++) {
          if (row['Item' + i] == '') {
            row['Item' + i] = 'Sunder Charms (Mod)';
            row['Prob' + i] = Math.max(Math.round((config.bossDropWeight / 400) * totalWeight), 1);
            break;
          }
          else {
            row['Prob' + i] *= 50;
            totalWeight += +row['Prob' + i];
          }
        }
      }
    }


    index++;
  });
  D2RMM.writeTsv(treasureclassexFilename, treasureclassex);
});

if (config.addToGlobalLootTables) {
  const uniqueitemsFilename = 'global\\excel\\uniqueitems.txt';
  const uniqueitemsBaseFilename = 'global\\excel\\base\\uniqueitems.txt';
  const uniqueitems = D2RMM.readTsv(uniqueitemsFilename);
  const uniqueitemsBase = D2RMM.readTsv(uniqueitemsBaseFilename);

  // For backwards compatibility with pre-Reign versions
  if (!uniqueitemsBase || uniqueitemsBase.rows.length === 0) {
    uniqueitems.rows.forEach((row) => {
      let index = row.index;

      const sunderCharms = ['Cold Rupture', 'Flame Rift', 'Crack of the Heavens', 'Rotting Fissure', 'Bone Break', 'Black Cleft'];
      if (sunderCharms.includes(index)) {
        row.enabled = 1;
      }
    });
    D2RMM.writeTsv(uniqueitemsFilename, uniqueitems);
  }
  else {
    uniqueitemsBase.rows.forEach((row) => {
      let index = row.index;

      const sunderCharms = ['Cold Rupture', 'Flame Rift', 'Crack of the Heavens', 'Rotting Fissure', 'Bone Break', 'Black Cleft'];
      if (sunderCharms.includes(index)) {
        row.spawnable = 1;
      }
    });
    D2RMM.writeTsv(uniqueitemsBaseFilename, uniqueitemsBase);

    uniqueitems.rows.forEach((row) => {
      let index = row.index;

      const precraftedSunderCharms = ['PreCrafted Cold Rupture', 'PreCrafted Flame Rift', 'PreCrafted Crack of the Heavens', 'PreCrafted Rotting Fissure', 'PreCrafted Bone Break', 'PreCrafted Black Cleft'];
      if (precraftedSunderCharms.includes(index)) {
        row.DropConditionCalc = ''; // By default, Reign expansion charms are filtered by a condition instead of spawnable=0, so we need to remove that.
      }
    });
    D2RMM.writeTsv(uniqueitemsFilename, uniqueitems);
  }
}