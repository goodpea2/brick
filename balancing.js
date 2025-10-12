// balancing.js

export const GAME_CONSTANTS = {
    MAX_BRICK_HP: 200,
};

export const GRID_CONSTANTS = {
    BRICK_COLS: 13,
    BRICK_ROWS: 13,
    SAFE_ZONE_GRID: 2, // in grid units
    get TOTAL_COLS() { return this.BRICK_COLS + this.SAFE_ZONE_GRID * 2; },
    get TOTAL_ROWS() { return this.BRICK_ROWS + this.SAFE_ZONE_GRID * 2; },
};

export const DEFAULT_LEVEL_SETTINGS = {
    seed: null,
    levelPattern: 'formulaic',
    startingBalls: 5,
    ballSpeed: 0.5,
    goalBricks: 3,
    goalBrickCountIncrement: 0.35,
    extraBallBricks: 3,
    explosiveBrickChance: 0.05,
    builderBrickChance: 0.03,
    healerBrickChance: 0.03,
    brickCount: 15,
    brickCountIncrement: 8,
    maxBrickCount: 100,
    fewBrickLayoutChance: 0.15,
    startingBrickHp: 100,
    brickHpIncrement: 80,
    brickHpIncrementMultiplier: 1.05,
    startingCoin: 5,
    coinIncrement: 5,
    maxCoin: 300,
    bonusLevelInterval: 5,
    minCoinBonusMultiplier: 7,
    maxCoinBonusMultiplier: 10,
};

export const SHOP_PARAMS = {
    buyBall: { baseCost: 10, increment: 5 },
    costIncrementRate: 1.5,
    ballHp: { baseCost: 50, value: 20, baseValue: 100 },
    aimLength: { baseCost: 30, value: 1, baseValue: 2 },
    powerExplosionDamage: { baseCost: 50, value: 10, baseValue: 30 },
    piercingBonusDamage: { baseCost: 50, value: 2, baseValue: 0 },
    splitDamage: { baseCost: 80, value: 2, baseValue: 6 },
    brickCoinChance: { baseCost: 50, value: 3, baseValue: 10 },
};

export const INITIAL_UPGRADE_STATE = {
    ballHp: { level: 1 },
    aimLength: { level: 1 },
    powerExplosionDamage: { level: 1 },
    piercingBonusDamage: { level: 1 },
    splitDamage: { level: 1 },
    brickCoinChance: { level: 1 },
};