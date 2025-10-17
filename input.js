// input.js - User input and event listeners

import * as dom from './dom.js';
import { state, applyAllUpgrades } from './state.js';
import * as ui from './ui.js';
import { sounds } from './sfx.js';
import { XP_SETTINGS } from './balancing.js';

export function initializeInput(gameController, runCode) {
    dom.pauseResumeBtn.addEventListener('click', () => { 
        sounds.buttonClick(); 
        if (!state.p5Instance) return; 
        if (state.isRunning) { 
            state.p5Instance.noLoop(); 
            state.isRunning = false; 
            dom.pauseResumeBtn.textContent = 'Resume'; 
        } else { 
            state.p5Instance.loop(); 
            state.isRunning = true; 
            dom.pauseResumeBtn.textContent = 'Pause'; 
        } 
    });

    dom.speedToggleBtn.addEventListener('click', () => { 
        sounds.buttonClick(); 
        if (!state.p5Instance || dom.speedToggleBtn.disabled) return; 
        const spedUp = gameController.toggleSpeed(); 
        if (spedUp) { 
            dom.speedToggleBtn.textContent = 'Speed Down'; 
            dom.speedToggleBtn.classList.add('speed-active'); 
        } else { 
            dom.speedToggleBtn.textContent = 'Speed Up'; 
            dom.speedToggleBtn.classList.remove('speed-active'); 
        } 
    });

    dom.prevLevelBtn.addEventListener('click', () => { sounds.buttonClick(); gameController.prevLevel(); });
    dom.nextLevelBtn.addEventListener('click', () => { sounds.buttonClick(); gameController.nextLevel(); });

    dom.clearBtn.addEventListener('click', () => { 
        sounds.buttonClick(); 
        const settings = ui.getLevelSettings(); 
        gameController.resetGame(settings); 
        state.isSpedUp = false; 
        dom.speedToggleBtn.textContent = 'Speed Up'; 
        dom.speedToggleBtn.classList.remove('speed-active'); 
    });

    dom.levelSettingsButton.addEventListener('click', () => { 
        sounds.popupOpen(); 
        if (state.p5Instance) state.p5Instance.isModalOpen = true; 
        dom.settingsModal.classList.remove('hidden'); 
    });
    
    dom.closeSettingsBtn.addEventListener('click', () => { 
        sounds.popupClose(); 
        if (state.p5Instance) state.p5Instance.isModalOpen = false; 
        dom.settingsModal.classList.add('hidden'); 
    });

    dom.coinBankEl.addEventListener('click', () => { 
        sounds.popupOpen(); 
        if (!state.p5Instance) return; 
        state.p5Instance.isModalOpen = true; 
        ui.updateShopUI(gameController); 
        dom.shopModal.classList.remove('hidden'); 
    });

    dom.closeShopBtn.addEventListener('click', () => { 
        sounds.popupClose(); 
        if (state.p5Instance) state.p5Instance.isModalOpen = false; 
        dom.shopModal.classList.add('hidden'); 
    });

    dom.levelUpCloseButton.addEventListener('click', () => { 
        sounds.popupClose(); 
        dom.levelUpModal.classList.add('hidden'); 
        if(state.p5Instance) { 
            state.p5Instance.isModalOpen = false; 
            if (state.isRunning) state.p5Instance.loop(); 
        } 
    });

    dom.shopBalancingButton.addEventListener('click', () => { 
        sounds.buttonClick(); 
        dom.shopParamInputs.ballFirstCost.value = state.shopParams.buyBall.baseCost; 
        dom.shopParamInputs.ballCostIncrement.value = state.shopParams.buyBall.increment; 
        dom.shopParamInputs.costIncrementRate.value = state.shopParams.costIncrementRate; 
        for(const key in state.shopParams) { 
            if (key === 'buyBall' || key === 'costIncrementRate') continue; 
            dom.shopParamInputs[`${key}BaseCost`].value = state.shopParams[key].baseCost; 
            dom.shopParamInputs[`${key}BaseValue`].value = state.shopParams[key].baseValue; 
            dom.shopParamInputs[`${key}Value`].value = state.shopParams[key].value; 
        } 
        dom.shopBalancingModal.classList.remove('hidden'); 
    });

    dom.closeShopBalancingBtn.addEventListener('click', () => { sounds.popupClose(); dom.shopBalancingModal.classList.add('hidden'); });
    
    dom.applyShopSettingsButton.addEventListener('click', () => { 
        sounds.popupClose(); 
        state.shopParams.buyBall.baseCost = parseInt(dom.shopParamInputs.ballFirstCost.value, 10); 
        state.shopParams.buyBall.increment = parseInt(dom.shopParamInputs.ballCostIncrement.value, 10); 
        state.shopParams.costIncrementRate = parseFloat(dom.shopParamInputs.costIncrementRate.value); 
        for(const key in state.shopParams) { 
            if (key === 'buyBall' || key === 'costIncrementRate') continue; 
            state.shopParams[key].baseCost = parseFloat(dom.shopParamInputs[`${key}BaseCost`].value); 
            state.shopParams[key].baseValue = parseFloat(dom.shopParamInputs[`${key}BaseValue`].value); 
            state.shopParams[key].value = parseFloat(dom.shopParamInputs[`${key}Value`].value); 
        } 
        applyAllUpgrades(); 
        dom.shopBalancingModal.classList.add('hidden'); 
        ui.updateShopUI(gameController); 
    });

    window.addEventListener('click', (e) => { 
        if (e.target === dom.settingsModal) { sounds.popupClose(); if (state.p5Instance) state.p5Instance.isModalOpen = false; dom.settingsModal.classList.add('hidden'); } 
        if (e.target === dom.shopModal) { sounds.popupClose(); if (state.p5Instance) state.p5Instance.isModalOpen = false; dom.shopModal.classList.add('hidden'); } 
        if (e.target === dom.shopBalancingModal) { sounds.popupClose(); dom.shopBalancingModal.classList.add('hidden'); } 
    });

    dom.ballSpeedInput.addEventListener('input', () => dom.ballSpeedValue.textContent = parseFloat(dom.ballSpeedInput.value).toFixed(1));
    dom.volumeSlider.addEventListener('input', () => { const vol = parseFloat(dom.volumeSlider.value); sounds.setMasterVolume(vol); dom.volumeValue.textContent = vol.toFixed(2); });
    dom.explosiveBrickChanceInput.addEventListener('input', () => dom.explosiveBrickChanceValue.textContent = parseFloat(dom.explosiveBrickChanceInput.value).toFixed(2));
    dom.fewBrickLayoutChanceInput.addEventListener('input', () => dom.fewBrickLayoutChanceValue.textContent = parseFloat(dom.fewBrickLayoutChanceInput.value).toFixed(2));
    
    dom.generateLevelBtn.addEventListener('click', () => { 
        sounds.popupClose(); 
        if (state.p5Instance) { 
            gameController.resetGame(ui.getLevelSettings()); 
            state.p5Instance.isModalOpen = false; 
        } 
        dom.settingsModal.classList.add('hidden'); 
        state.isSpedUp = false; 
        dom.speedToggleBtn.textContent = 'Speed Up'; 
        dom.speedToggleBtn.classList.remove('speed-active'); 
    });

    dom.buyBallButton.addEventListener('click', () => { 
        if (gameController && gameController.getCoins() >= state.currentBallCost) { 
            sounds.ballGained(); 
            gameController.setCoins(gameController.getCoins() - state.currentBallCost); 
            gameController.addBall(); 
            ui.updateShopUI(gameController); 
        } 
    });

    dom.cheatCoinBtn.addEventListener('click', () => { sounds.buttonClick(); if (gameController) gameController.setCoins(gameController.getCoins() + 1000); });
    
    dom.cheatXpBtn.addEventListener('click', () => {
        sounds.buttonClick();
        if (gameController) {
            state.currentXp += 5000;
            while (state.currentXp >= state.xpForNextLevel) {
                state.currentXp -= state.xpForNextLevel;
                state.mainLevel++;
                state.xpForNextLevel = XP_SETTINGS.baseXpRequirement + (state.mainLevel - 1) * XP_SETTINGS.xpRequirementMultiplier;
                sounds.levelUp();
                ui.showLevelUpModal(state.mainLevel);
            }
            ui.updateProgressionUI(state.mainLevel, state.currentXp, state.xpForNextLevel, 0);
        }
    });

    document.querySelectorAll('.ball-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (btn.disabled) return;
            sounds.selectBall();
            if (document.querySelector('.ball-select-btn.active')) {
                document.querySelector('.ball-select-btn.active').classList.remove('active');
            }
            btn.classList.add('active');
            state.selectedBallType = btn.dataset.ballType;
            gameController.changeBallType(state.selectedBallType);
            ui.updateBallSelectorArrow();
        });
    });
}