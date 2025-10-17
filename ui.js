
// ui.js - All DOM manipulation and UI update logic

import * as dom from './dom.js';
import { state, applyAllUpgrades } from './state.js';
import { UNLOCK_LEVELS, UPGRADE_UNLOCK_LEVELS, XP_SETTINGS } from './balancing.js';
import { UNLOCK_DESCRIPTIONS } from './text.js';
import { sounds } from './sfx.js';

export function updateBallSelectorArrow() {
    const activeBtn = document.querySelector('.ball-select-btn.active');
    if (!activeBtn || !dom.ballSelectorArrow) return;

    const isLandscape = window.innerWidth > window.innerHeight;
    if (isLandscape) {
        const topPos = activeBtn.offsetTop + activeBtn.offsetHeight / 2;
        dom.ballSelectorArrow.style.top = `${topPos}px`;
        dom.ballSelectorArrow.style.left = ''; // Clear horizontal positioning
    } else {
        const leftPos = activeBtn.offsetLeft + activeBtn.offsetWidth / 2 - dom.ballSelectorArrow.offsetWidth / 2;
        dom.ballSelectorArrow.style.left = `${leftPos}px`;
        dom.ballSelectorArrow.style.top = ''; // Clear vertical positioning
    }
}

export function updateBallSelectorUI(mainLevel, balls, giantBalls, gameState) {
    if (mainLevel < UNLOCK_LEVELS.EXPLOSIVE_BALL) {
        dom.ballSelector.classList.add('hidden');
        return;
    }
    
    const hasRegularBalls = balls > 0;
    const hasGiantBalls = giantBalls > 0;

    if (gameState === 'aiming' && (hasRegularBalls || hasGiantBalls)) {
        dom.ballSelector.classList.remove('hidden');
        updateBallSelectorArrow();
    } else {
        dom.ballSelector.classList.add('hidden');
    }

    document.querySelectorAll('.ball-select-btn').forEach(btn => {
        const type = btn.dataset.ballType;
        let isUnlocked = true;
        switch(type) {
            case 'explosive': isUnlocked = mainLevel >= UNLOCK_LEVELS.EXPLOSIVE_BALL; break;
            case 'split': isUnlocked = mainLevel >= UNLOCK_LEVELS.SPLIT_BALL; break;
            case 'piercing': isUnlocked = mainLevel >= UNLOCK_LEVELS.PIERCING_BALL; break;
            case 'brick': isUnlocked = mainLevel >= UNLOCK_LEVELS.BRICK_BALL; break;
            case 'bullet': isUnlocked = mainLevel >= UNLOCK_LEVELS.BULLET_BALL; break;
            case 'homing': isUnlocked = mainLevel >= UNLOCK_LEVELS.HOMING_BALL; break;
        }
        btn.classList.toggle('hidden', !isUnlocked);
    });

    document.querySelectorAll('.ball-select-btn:not([data-ball-type="giant"])').forEach(btn => {
        btn.disabled = !hasRegularBalls;
    });

    const giantBtn = document.querySelector('.ball-select-btn[data-ball-type="giant"]');
    if (giantBtn) {
        const badge = giantBtn.querySelector('.ball-count-badge');
        const giantUnlocked = mainLevel >= UNLOCK_LEVELS.GIANT_BONUS;
        if (hasGiantBalls && giantUnlocked) {
            giantBtn.classList.remove('hidden');
            giantBtn.disabled = false;
            badge.textContent = giantBalls;
            badge.classList.remove('hidden');
        } else {
            giantBtn.classList.add('hidden');
            giantBtn.disabled = true;
            badge.classList.add('hidden');
        }
    }
}

export function updateHeaderUI(level, mainLevel, balls, giantBalls, seed, coins, gameState) {
    dom.levelStatEl.textContent = level;
    dom.ballsStatEl.textContent = balls;
    dom.seedStatEl.textContent = seed;
    dom.coinStatEl.textContent = coins;
    dom.coinBankEl.classList.toggle('hidden', mainLevel < UNLOCK_LEVELS.COINS_SHOP);
    updateBallSelectorUI(mainLevel, balls, giantBalls, gameState);
}

export function updateProgressionUI(mainLevel, currentXp, xpForNextLevel, pendingXp) {
    const xpBarFill = document.getElementById('xp-bar-fill');
    const xpBarPendingFill = document.getElementById('xp-bar-pending-fill');
    const xpValueTextEl = document.getElementById('xp-value-text');
    const xpPendingTextEl = document.getElementById('xp-pending-text');
    const p = state.p5Instance;

    if (!xpBarFill || !dom.playerLevelStatEl || !xpValueTextEl || !xpPendingTextEl || !p) return;
    
    dom.playerLevelStatEl.textContent = mainLevel;

    const currentPercent = (currentXp / xpForNextLevel) * 100;
    const pendingPercent = ((currentXp + pendingXp) / xpForNextLevel) * 100;
    xpBarFill.style.width = `${currentPercent}%`;
    xpBarPendingFill.style.width = `${pendingPercent}%`;
    
    xpValueTextEl.textContent = `${Math.floor(currentXp)} / ${xpForNextLevel} XP`;
    if (pendingXp > 0) {
        xpPendingTextEl.textContent = `(+${Math.ceil(pendingXp)} XP)`;
        xpPendingTextEl.classList.remove('hidden');
    } else {
        xpPendingTextEl.textContent = '';
        xpPendingTextEl.classList.add('hidden');
    }
    
    const xpPercentForColor = Math.min(1, currentXp / xpForNextLevel);
    const startColor = p.color(128, 128, 128); // Gray
    const endColor = p.color(0, 229, 255);   // Cyan
    const lerpAmount = Math.min(1, xpPercentForColor / 0.9);
    const currentColor = p.lerpColor(startColor, endColor, lerpAmount);
    
    dom.playerLevelBadgeEl.style.backgroundColor = currentColor.toString();
    const shadowColor = `rgba(${currentColor.levels[0]}, ${currentColor.levels[1]}, ${currentColor.levels[2]}, 0.7)`;
    dom.playerLevelBadgeEl.style.boxShadow = `inset 0 0 3px rgba(0,0,0,0.5), 0 0 5px ${shadowColor}`;
    dom.playerLevelBadgeEl.style.setProperty('--shadow-color', shadowColor);
}

export function animateCoinParticles(startX, startY, count) {
    const targetRect = dom.coinBankEl.getBoundingClientRect();
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;
    for (let i = 0; i < Math.min(count, 20); i++) {
        const particle = document.createElement('div');
        particle.className = 'coin-particle';
        document.body.appendChild(particle);
        const startOffsetX = (Math.random() - 0.5) * 40, startOffsetY = (Math.random() - 0.5) * 40;
        particle.style.left = `${startX + startOffsetX}px`; particle.style.top = `${startY + startOffsetY}px`;
        setTimeout(() => { particle.style.transform = `translate(${endX - startX - startOffsetX}px, ${endY - startY - startOffsetY}px) scale(0.5)`; particle.style.opacity = '0'; }, 50 + i * 20);
        particle.addEventListener('transitionend', () => particle.remove());
    }
}

export function updateShopUI(gameController) {
    if (!gameController) return;
    const coins = gameController.getCoins();
    dom.shopCoinCount.textContent = coins;
    state.currentBallCost = state.shopParams.buyBall.baseCost + state.ballPurchaseCount * state.shopParams.buyBall.increment;
    dom.buyBallButton.textContent = `${state.currentBallCost} 🪙`;
    dom.buyBallButton.disabled = coins < state.currentBallCost;
    
    document.getElementById('buyBallCard').classList.toggle('hidden', state.mainLevel < UNLOCK_LEVELS.SHOP_BUY_BALL);

    const upgradeData = {
        ballHp: { name: "Ball Max HP" },
        aimLength: { name: "Aiming Length", isTime: true },
        powerExplosionDamage: { name: "Explosive Ball's Explosion Damage" },
        piercingBonusDamage: { name: "Piercing Ball's Bonus Ability Damage" },
        splitDamage: { name: "Split Ball's Mini Damage" },
        brickCoinChance: { name: "Brick Ball's Coin Brick Percentage", isPercent: true },
        bonusXp: { name: "Bonus XP", isPercent: true }
    };

    dom.upgradesGrid.innerHTML = '';
    for (const key in state.upgradeState) {
        if (state.mainLevel < UPGRADE_UNLOCK_LEVELS[key]) continue;

        const { level } = state.upgradeState[key];
        const { baseCost, value, baseValue } = state.shopParams[key];
        const cost = Math.floor(baseCost * Math.pow(state.shopParams.costIncrementRate, level - 1));
        const currentValRaw = baseValue + (level - 1) * value;

        let currentValDisplay, nextValDisplay;
        if (upgradeData[key].isPercent) {
            currentValDisplay = `${currentValRaw}%`;
            nextValDisplay = `(+${value}%)`;
        } else if (upgradeData[key].isTime) {
            currentValDisplay = `${currentValRaw.toFixed(2)}s`;
            nextValDisplay = `(+${value.toFixed(2)}s)`;
        } else {
            currentValDisplay = `${currentValRaw}`;
            nextValDisplay = `(+${value})`;
        }
        
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `<div><div class="upgrade-card-header">${upgradeData[key].name}</div><div class="upgrade-card-level">LVL ${level}</div><div class="upgrade-card-stat">${currentValDisplay} <span class="next-value">${nextValDisplay}</span></div></div><button class="upgrade-cost-button" data-upgrade-key="${key}" ${coins < cost ? 'disabled' : ''}>${cost} 🪙</button>`;
        dom.upgradesGrid.appendChild(card);
    }
    document.querySelectorAll('.upgrade-cost-button[data-upgrade-key]').forEach(button => {
        button.onclick = () => handleUpgrade(button.dataset.upgradeKey, gameController);
    });
}

function handleUpgrade(upgradeKey, gameController) {
    if (!gameController) return;
    const coins = gameController.getCoins();
    const upgrade = state.upgradeState[upgradeKey];
    const cost = Math.floor(state.shopParams[upgradeKey].baseCost * Math.pow(state.shopParams.costIncrementRate, upgrade.level - 1));
    if (coins >= cost) { 
        gameController.setCoins(coins - cost); 
        upgrade.level++; 
        sounds.upgrade();
        applyAllUpgrades();
        updateShopUI(gameController); 
    }
}

export function showLevelUpModal(level) {
    if (!state.p5Instance) return;
    state.p5Instance.isModalOpen = true;
    if (state.isRunning) state.p5Instance.noLoop();

    const unlockText = UNLOCK_DESCRIPTIONS[level];

    dom.levelUpLevelEl.textContent = level;
    dom.levelUpUnlockTextEl.textContent = unlockText || "More power awaits you in future levels!";
    dom.levelUpModal.classList.remove('hidden');
}

export function getLevelSettings() {
    let extraBallBricksCount = parseInt(dom.extraBallBricksInput.value, 10);
    if (state.mainLevel >= UNLOCK_LEVELS.MORE_EXTRA_BALL_BRICKS) {
        extraBallBricksCount = Math.max(extraBallBricksCount, 2);
    }

    const userSettings = {
        seed: dom.seedInput.value.trim() !== '' ? parseInt(dom.seedInput.value, 10) : null,
        levelPattern: dom.levelPatternSelect.value,
        startingBalls: parseInt(dom.startingBallsInput.value, 10),
        ballSpeed: parseFloat(dom.ballSpeedInput.value),
        goalBricks: parseInt(dom.goalBricksInput.value, 10),
        goalBrickCountIncrement: parseFloat(dom.goalBrickCountIncrementInput.value),
        extraBallBricks: extraBallBricksCount,
        explosiveBrickChance: parseFloat(dom.explosiveBrickChanceInput.value),
        builderBrickChance: parseFloat(dom.builderBrickChanceInput.value),
        healerBrickChance: parseFloat(dom.healerBrickChanceInput.value),
        brickCount: parseInt(dom.brickCountInput.value, 10),
        brickCountIncrement: parseInt(dom.brickCountIncrementInput.value, 10),
        maxBrickCount: parseInt(dom.maxBrickCountInput.value, 10),
        fewBrickLayoutChance: parseFloat(dom.fewBrickLayoutChanceInput.value),
        startingBrickHp: parseInt(dom.startingBrickHpInput.value, 10),
        brickHpIncrement: parseInt(dom.brickHpIncrementInput.value, 10),
        brickHpIncrementMultiplier: parseFloat(dom.brickHpIncrementMultiplierInput.value),
        startingCoin: parseInt(dom.startingCoinInput.value, 10),
        coinIncrement: parseInt(dom.coinIncrementInput.value, 10),
        maxCoin: parseInt(dom.maxCoinInput.value, 10),
        bonusLevelInterval: parseInt(dom.bonusLevelIntervalInput.value, 10),
        minCoinBonusMultiplier: parseInt(dom.minCoinBonusMultiplierInput.value, 10),
        maxCoinBonusMultiplier: parseInt(dom.maxCoinBonusMultiplierInput.value, 10),
    };
    
    if (state.mainLevel < UNLOCK_LEVELS.COINS_SHOP) {
        userSettings.startingCoin = 0;
        userSettings.coinIncrement = 0;
    }
    if (state.mainLevel < UNLOCK_LEVELS.EXPLOSIVE_BRICK) {
        userSettings.explosiveBrickChance = 0;
    }
    
    return userSettings;
}
