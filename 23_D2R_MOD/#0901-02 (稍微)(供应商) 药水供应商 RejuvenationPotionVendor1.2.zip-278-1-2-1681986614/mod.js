const miscFilename = 'global\\excel\\misc.txt';
const misc = D2RMM.readTsv(miscFilename);

const originalSmallPotion = misc.rows.find((row) => row.name === 'Rejuvenation Potion');
const originalFullPotion = misc.rows.find((row) => row.name === 'Full Rejuvenation Potion');

// Filter out the original potions
misc.rows = misc.rows.filter((row) => row.name !== 'Rejuvenation Potion')
misc.rows = misc.rows.filter((row) => row.name !== 'Full Rejuvenation Potion')

const changesCommon = {
    spawnable: 1,
    PermStoreItem: 1,
    multibuy: 1,
}
const changesSmallPotion = {
    cost: config.sellPriceSmall,
}

const changesFullPotion = {
    cost: config.sellPriceFull,
}

const changesCommonPotionVendors = {
    AkaraMin: 1, AkaraMax: 1, LysanderMin: 1, LysanderMax: 1, DrognanMin: 1, DrognanMax: 1, OrmusMin: 1, OrmusMax: 1,
    MalahMin: 1, MalahMax: 1, JamellaMin: 1, JamellaMax: 1,
}
const changesCommonAllVendors = {
    CharsiMin: 1, CharsiMax: 1, GheedMin: 1, GheedMax: 1, AkaraMin: 1, AkaraMax: 1, FaraMin: 1, FaraMax: 1,
    LysanderMin: 1, LysanderMax: 1, DrognanMin: 1, DrognanMax: 1, HratliMin: 1, HratliMax: 1, AlkorMin: 1, AlkorMax: 1,
    OrmusMin: 1, OrmusMax: 1, ElzixMin: 1, ElzixMax: 1, AshearaMin: 1, AshearaMax: 1, CainMin: 1, CainMax: 1,
    HalbuMin: 1, HalbuMax: 1, MalahMin: 1, MalahMax: 1, LarzukMin: 1, LarzukMax: 1, AnyaMin: 1, AnyaMax: 1,
    JamellaMin: 1, JamellaMax: 1,
}

smallPotion = {...originalSmallPotion, ...changesCommon, ...changesSmallPotion}
fullPotion = {...originalFullPotion, ...changesCommon, ...changesFullPotion}

if (config?.allVendors) {
    smallPotion = {...smallPotion, ...changesCommonAllVendors}
    fullPotion = {...fullPotion, ...changesCommonAllVendors}
} else {
    smallPotion = {...smallPotion, ...changesCommonPotionVendors}
    fullPotion = {...fullPotion, ...changesCommonPotionVendors}
}


misc.rows.push(smallPotion);
misc.rows.push(fullPotion);

D2RMM.writeTsv(miscFilename, misc);




