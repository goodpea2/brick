// balancing.js

export const GAME_CONSTANTS = {
    MAX_BRICK_HP: 200,
    MERGED_BRICK_HP: 600,
    MERGE_COST: 600,
    BUILDER_SPAWN_BASE_COST: 120,
    HEALER_SPAWN_BASE_COST: 80,
    OVERLAY_SPAWN_HP_MULTIPLIER: 2,
};

export const GRID_CONSTANTS = {
    BRICK_COLS: 13,
    BRICK_ROWS: 13,
    SAFE_ZONE_GRID: 2, // in grid units
    get TOTAL_COLS() { return this.BRICK_COLS + this.SAFE_ZONE_GRID * 2; },
    get TOTAL_ROWS() { return this.BRICK_ROWS + this.SAFE_ZONE_GRID * 2; },
};

export const BRICK_VISUALS = {
    layersPerTier: 5,
    hpPerLayer: {
        normal: 10,
        long: 30,
        goal: 10,
        extraBall: 10,
    },
    palettes: {
        normal: [
            [100, 150, 255],
            [110, 100, 210],
            [120, 50, 165],
            [125, 0, 125]
        ],
        long: [
            [100, 150, 255],
            [110, 100, 210],
            [120, 50, 165],
            [125, 0, 125]
        ],
        extraBall: [
            [0, 255, 127],
            [45, 200, 85],
            [55, 150, 50],
            [50, 115, 5]
        ],
        goal: [
            [255, 215, 0],
            [255, 150, 0],
            [225, 115, 0],
            [220, 90, 0]
        ]
    }
};


export const XP_SETTINGS = {
    xpBaseAmount: 50, // Base for level up formula: base * L * (L+1) / 2
    magneticRadiusMultiplier: 5, // Multiplied by ball radius
    magneticStrength: 10,
    xpPerOrb: 10,
    invulnerableTime: 60, // in frames
};

export const AIMING_SETTINGS = {
    GHOST_BALL_COOLDOWN: 10, // frames
    GHOST_BALL_SPEED_MULTIPLIER: 0.75, // relative to normal ball speed
    AIM_CANCEL_RADIUS_MULTIPLIER: 2.5, // multiplied by ball radius
};


export const UNLOCK_LEVELS = {
    EXPLOSIVE_BALL: 2,
    COINS_SHOP: 3,
    COMBO_MINES: 4,
    MORE_EXTRA_BALL_BRICKS: 5,
    SPLIT_BALL: 6,
    EXPLOSIVE_BRICK: 7,
    SHOP_BUY_BALL: 8,
    PIERCING_BALL: 9,
    STRIPE_BONUS: 10,
    EXTRA_BALL_2: 11,
    BRICK_BALL: 12,
    BONUS_XP_UPGRADE: 13,
    GIANT_BONUS: 14,
    BULLET_BALL: 15,
    BALL_CAGE_BRICK: 17,
    HOMING_BALL: 19,
};

export const DEFAULT_LEVEL_SETTINGS = {
    seed: null,
    levelPattern: 'formulaic',
    startingBalls: 5,
    ballSpeed: 0.4,
    goalBricks: 3,
    goalBrickCountIncrement: 0.25,
    goalBrickCap: 8,
    goalBrickMaxHp: 100,
    extraBallBricks: 1,
    explosiveBrickChance: 0.05,
    ballCageBrickChance: 0.05,
    builderBrickChance: 0.03,
    healerBrickChance: 0.03,
    brickCount: 15,
    brickCountIncrement: 8,
    maxBrickCount: 100,
    fewBrickLayoutChance: 0.15,
    fewBrickLayoutChanceMinLevel: 10,
    startingBrickHp: 100,
    brickHpIncrement: 80,
    brickHpIncrementMultiplier: 1.05,
    maxBrickHpIncrement: 500,
    startingCoin: 3,
    coinIncrement: 3,
    maxCoin: 300,
    bonusLevelInterval: 5,
    minCoinBonusMultiplier: 7,
    maxCoinBonusMultiplier: 10,
};

export const SHOP_PARAMS = {
    buyBall: { baseCost: 30, increment: 10 },
    costIncrementRate: 1.5,
    ballHp: { baseCost: 50, value: 20, baseValue: 100 },
    aimLength: { baseCost: 30, value: 0.2, baseValue: 0.4 },
    powerExplosionDamage: { baseCost: 50, value: 10, baseValue: 30 },
    piercingBonusDamage: { baseCost: 50, value: 2, baseValue: 0 },
    splitDamage: { baseCost: 80, value: 2, baseValue: 6 },
    brickCoinChance: { baseCost: 50, value: 6, baseValue: 20 },
    bonusXp: { baseCost: 50, value: 10, baseValue: 0 },
};

export const INITIAL_UPGRADE_STATE = {
    ballHp: { level: 1 },
    aimLength: { level: 1 },
    powerExplosionDamage: { level: 1 },
    piercingBonusDamage: { level: 1 },
    splitDamage: { level: 1 },
    brickCoinChance: { level: 1 },
    bonusXp: { level: 1 },
};

export const UPGRADE_UNLOCK_LEVELS = {
    ballHp: 1,
    aimLength: 1,
    powerExplosionDamage: UNLOCK_LEVELS.EXPLOSIVE_BALL,
    piercingBonusDamage: UNLOCK_LEVELS.PIERCING_BALL,
    splitDamage: UNLOCK_LEVELS.SPLIT_BALL,
    brickCoinChance: UNLOCK_LEVELS.BRICK_BALL,
    bonusXp: UNLOCK_LEVELS.BONUS_XP_UPGRADE,
};