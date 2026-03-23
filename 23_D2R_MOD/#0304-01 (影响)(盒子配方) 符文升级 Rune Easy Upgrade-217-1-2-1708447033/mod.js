const cubemainFilename = 'global\\excel\\cubemain.txt';
const cubemain = D2RMM.readTsv(cubemainFilename);

const recipeTypes = {
  oneRune: [1, false], // [runeCount, hasGem]
  oneRuneOneGem: [1, true],
  twoRunes: [2, false],
  twoRunesOneGem: [2, true],
  threeRunes: [3, false],
  threeRunesOneGem: [3, true],
}

function Mod(tier, mod) {
  cubemain.rows.forEach((row) => {
    let input = row['input 1'];
    let output = row.output;

    let tierStr = tier.toString().padStart(2, '0');
    let nextTierStr = (tier + 1).toString().padStart(2, '0');

    if (input.startsWith('"r' + tierStr) && output == 'r' + nextTierStr) {
      row.numinputs = mod[1] ? mod[0] + 1 : mod[0];
      row['input 1'] = mod[0] > 1
        ? '"r' + tierStr + ',qty=' + mod[0] + '"'
        : 'r' + tierStr;

      if (!mod[1])
        row['input 2'] = '';

      return;
    }
  });
}

// Low tiers
for (let tier = 1; tier <= 9; tier++)
  Mod(tier, recipeTypes[config.lowRuneCost]);

// Mid tiers
for (let tier = 10; tier <= 20; tier++)
  Mod(tier, recipeTypes[config.midRuneCost]);

// High tiers
for (let tier = 21; tier <= 32; tier++)
  Mod(tier, recipeTypes[config.highRuneCost]);

D2RMM.writeTsv(cubemainFilename, cubemain);