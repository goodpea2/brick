// state.js
import { SHOP_PARAMS, INITIAL_UPGRADE_STATE, XP_SETTINGS } from './balancing.js';

// This file holds the canonical state for the application.
// Other modules can import and modify the properties of this single state object.

export const state = {
    p5Instance: null,
    isRunning: true,
    isSpedUp: false,
    originalBallSpeed: 0.4,
    selectedBallType: 'classic',
    currentBallCost: 10,
    ballPurchaseCount: 0,
    shopParams: { ...SHOP_PARAMS },
    upgradeState: JSON.parse(JSON.stringify(INITIAL_UPGRADE_STATE)),
    upgradeableStats: {},

    // Persistent Progression State
    mainLevel: 1,
    currentXp: 0,
    xpForNextLevel: XP_SETTINGS.baseXpRequirement,
    pendingXp: 0,
};


export function applyAllUpgrades() {
    state.upgradeableStats.ballMaxHp = state.shopParams.ballHp.baseValue + (state.upgradeState.ballHp.level - 1) * state.shopParams.ballHp.value;
    state.upgradeableStats.aimLength = state.shopParams.aimLength.baseValue + (state.upgradeState.aimLength.level - 1) * state.shopParams.aimLength.value;
    state.upgradeableStats.powerExplosionDamage = state.shopParams.powerExplosionDamage.baseValue + (state.upgradeState.powerExplosionDamage.level - 1) * state.shopParams.powerExplosionDamage.value;
    state.upgradeableStats.piercingContactCount = 5;
    state.upgradeableStats.piercingBonusDamage = state.shopParams.piercingBonusDamage.baseValue + (state.upgradeState.piercingBonusDamage.level - 1) * state.shopParams.piercingBonusDamage.value;
    state.upgradeableStats.splitMiniBallDamage = state.shopParams.splitDamage.baseValue + (state.upgradeState.splitDamage.level - 1) * state.shopParams.splitDamage.value;
    state.upgradeableStats.brickSummonCoinChance = (state.shopParams.brickCoinChance.baseValue + (state.upgradeState.brickCoinChance.level - 1) * state.shopParams.brickCoinChance.value) / 100;
    state.upgradeableStats.bonusXp = (state.shopParams.bonusXp.baseValue + (state.upgradeState.bonusXp.level - 1) * state.shopParams.bonusXp.value) / 100;
}
