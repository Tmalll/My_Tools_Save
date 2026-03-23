// 批量合成宝石和符文.12个符文合成6个下一级符文. 12个宝石合成4个下一级宝石.
const cubeFilename = 'global\\excel\\cubemain.txt';
const cube = D2RMM.readTsv(cubeFilename);

for (let i = 1; i <= 32; i++) {
  const currentRune = 'r' + i.toString().padStart(2, '0');
  const nextRune = 'r' + (i + 1).toString().padStart(2, '0');

  cube.rows.push({
    description: `Batch (6 ${currentRune}) > (3 ${nextRune})`,
    enabled: '1',
    version: '100',
    numinputs: '6',
    'input 1': `${currentRune},qty=6`,
    output: nextRune,
    'output b': nextRune,
    'output c': nextRune,
  });
}

const gemTiers = [
  { name: "Chipped",
    gems: { topaz: "gcy", skull: "skc", sapphire: "gcb", ruby: "gcr",
            emerald: "gcg", diamond: "gcw", amethyst: "gcv" }
  },
  { name: "Flawed",
    gems: { topaz: "gfy", skull: "skf", sapphire: "gfb", ruby: "gfr",
            emerald: "gfg", diamond: "gfw", amethyst: "gfv" }
  },
  { name: "Normal",
    gems: { topaz: "gsy", skull: "sku", sapphire: "gsb", ruby: "gsr",
            emerald: "gsg", diamond: "gsw", amethyst: "gsv" }
  },
  { name: "Flawless",
    gems: { topaz: "gly", skull: "skl", sapphire: "glb", ruby: "glr",
            emerald: "glg", diamond: "glw", amethyst: "gzv" }
  },
  { name: "Perfect", // 不再往上升级
    gems: { topaz: "gpy", skull: "skz", sapphire: "gpb", ruby: "gpr",
            emerald: "gpg", diamond: "gpw", amethyst: "gpv" }
  }
];

for (let i = 0; i < gemTiers.length - 1; i++) {
  const currentTier = gemTiers[i];
  const nextTier = gemTiers[i + 1];

  for (const [gemName, currentCode] of Object.entries(currentTier.gems)) {
    const nextCode = nextTier.gems[gemName];
    cube.rows.push({
      description: `Batch (9 ${currentTier.name} ${gemName}) > (3 ${nextTier.name})`,
      enabled: '1',
      version: '100',
      numinputs: '9',
      'input 1': `${currentCode},qty=9`,
      output: nextCode,
      'output b': nextCode,
      'output c': nextCode,
    });
  }
}
D2RMM.writeTsv(cubeFilename, cube);


