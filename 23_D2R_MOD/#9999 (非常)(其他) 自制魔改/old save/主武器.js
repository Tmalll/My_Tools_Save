// === 主武器 ===
const specialMods = [
  {
    keyword: "Hit Power Weapon",
    mods: {
      "mod 1": "att-skill",
      "mod 1 param": "44",
      "mod 1 min": "30",
      "mod 1 max": "3",
      "mod 2": "dmg/lvl",
      "mod 2 param": "40",
    },
  },
  {
    keyword: "Blood Weapon",
    mods: {
      "mod 1": "hit-skill",
      "mod 1 param": "51",
      "mod 1 min": "30",
      "mod 1 max": "1",
      "mod 2": "dmg%/lvl",
      "mod 2 param": "40",
    },
  },
];

specialMods.forEach((special) => {
  recipeFile.rows.forEach((recipe) => {
    if (recipe["description"] && recipe["description"].includes(special.keyword)) {
      for (const [key, val] of Object.entries(special.mods)) {
        recipe[key] = val;
      }
    }
  });
});