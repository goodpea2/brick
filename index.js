// check the Readme.md file for context, every time you add or change something, update the readme as well
// --- MODULE IMPORTS ---
import { DEFAULT_LEVEL_SETTINGS, SHOP_PARAMS, INITIAL_UPGRADE_STATE, GAME_CONSTANTS, GRID_CONSTANTS } from './balancing.js';
import { Ball, MiniBall, createBallVisuals } from './ball.js';
import { Brick } from './brick.js';
import { generateLevel } from './levelgen.js';
import { sounds } from './sfx.js';
import { Particle, Shockwave, FloatingText, PowerupVFX, StripeFlash, createSplat, createBrickHitVFX, createBallDeathVFX } from './vfx.js';


// --- DOM ELEMENT REFERENCES ---
const pauseResumeBtn = document.getElementById('pauseResumeBtn');
const speedToggleBtn = document.getElementById('speedToggleBtn');
const prevLevelBtn = document.getElementById('prevLevelBtn');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const clearBtn = document.getElementById('clear');
const ballSelector = document.getElementById('ballSelector');
const ballSelectorArrow = document.getElementById('ballSelectorArrow');
const levelSettingsButton = document.getElementById('levelSettingsButton');
const settingsModal = document.getElementById('levelSettingsModal');
const closeSettingsBtn = settingsModal.querySelector('.close-button');
const generateLevelBtn = document.getElementById('generateLevelButton');
const shopModal = document.getElementById('shopModal');
const closeShopBtn = shopModal.querySelector('.close-button');
const buyBallButton = document.getElementById('buyBallButton');
const cheatCoinBtn = document.getElementById('cheatCoinBtn');
const shopCoinCount = document.getElementById('shopCoinCount');
const upgradesGrid = document.getElementById('upgradesGrid');
const levelStatEl = document.getElementById('level-stat');
const scoreStatEl = document.getElementById('score-stat');
const ballsStatEl = document.getElementById('balls-stat');
const seedStatEl = document.getElementById('seed-stat');
const coinStatEl = document.getElementById('coin-stat');
const coinBankEl = document.querySelector('.coin-bank');
const seedInput = document.getElementById('seedInput');
const levelPatternSelect = document.getElementById('levelPattern');
const startingBallsInput = document.getElementById('startingBalls');
const ballSpeedInput = document.getElementById('ballSpeed');
const ballSpeedValue = document.getElementById('ballSpeedValue');
const goalBricksInput = document.getElementById('goalBricks');
const goalBrickCountIncrementInput = document.getElementById('goalBrickCountIncrement');
const extraBallBricksInput = document.getElementById('extraBallBricks');
const explosiveBrickChanceInput = document.getElementById('explosiveBrickChance');
const explosiveBrickChanceValue = document.getElementById('explosiveBrickChanceValue');
const brickCountInput = document.getElementById('brickCount');
const brickCountIncrementInput = document.getElementById('brickCountIncrement');
const maxBrickCountInput = document.getElementById('maxBrickCount');
const fewBrickLayoutChanceInput = document.getElementById('fewBrickLayoutChance');
const fewBrickLayoutChanceValue = document.getElementById('fewBrickLayoutChanceValue');
const startingBrickHpInput = document.getElementById('startingBrickHp');
const brickHpIncrementInput = document.getElementById('brickHpIncrement');
const brickHpIncrementMultiplierInput = document.getElementById('brickHpIncrementMultiplier');
const startingCoinInput = document.getElementById('startingCoin');
const coinIncrementInput = document.getElementById('coinIncrement');
const maxCoinInput = document.getElementById('maxCoin');
const bonusLevelIntervalInput = document.getElementById('bonusLevelInterval');
const minCoinBonusMultiplierInput = document.getElementById('minCoinBonusMultiplier');
const maxCoinBonusMultiplierInput = document.getElementById('maxCoinBonusMultiplier');
const builderBrickChanceInput = document.getElementById('builderBrickChance');
const healerBrickChanceInput = document.getElementById('healerBrickChance');
const shopBalancingButton = document.getElementById('shopBalancingButton');
const shopBalancingModal = document.getElementById('shopBalancingModal');
const closeShopBalancingBtn = shopBalancingModal.querySelector('.close-button');
const applyShopSettingsButton = document.getElementById('applyShopSettingsButton');
const shopParamInputs = {
    ballFirstCost: document.getElementById('ballFirstCost'),
    ballCostIncrement: document.getElementById('ballCostIncrement'),
    costIncrementRate: document.getElementById('costIncrementRate'),
    ballHpBaseCost: document.getElementById('ballHpBaseCost'),
    aimLengthBaseCost: document.getElementById('aimLengthBaseCost'),
    powerExplosionDamageBaseCost: document.getElementById('powerExplosionDamageBaseCost'),
    piercingBonusDamageBaseCost: document.getElementById('piercingBonusDamageBaseCost'),
    splitDamageBaseCost: document.getElementById('splitDamageBaseCost'),
    brickCoinChanceBaseCost: document.getElementById('brickCoinChanceBaseCost'),
    ballHpBaseValue: document.getElementById('ballHpBaseValue'),
    aimLengthBaseValue: document.getElementById('aimLengthBaseValue'),
    powerExplosionDamageBaseValue: document.getElementById('powerExplosionDamageBaseValue'),
    piercingBonusDamageBaseValue: document.getElementById('piercingBonusDamageBaseValue'),
    splitDamageBaseValue: document.getElementById('splitDamageBaseValue'),
    brickCoinChanceBaseValue: document.getElementById('brickCoinChanceBaseValue'),
    ballHpValue: document.getElementById('ballHpValue'),
    aimLengthValue: document.getElementById('aimLengthValue'),
    powerExplosionDamageValue: document.getElementById('powerExplosionDamageValue'),
    piercingBonusDamageValue: document.getElementById('piercingBonusDamageValue'),
    splitDamageValue: document.getElementById('splitDamageValue'),
    brickCoinChanceValue: document.getElementById('brickCoinChanceValue'),
};

// --- STATE MANAGEMENT ---
let p5Instance;
let isRunning = true;
let isSpedUp = false;
let originalBallSpeed = 0.5;
let selectedBallType = 'explosive';
let currentBallCost = 10;
let ballPurchaseCount = 0;
let shopParams = { ...SHOP_PARAMS };
let upgradeState = JSON.parse(JSON.stringify(INITIAL_UPGRADE_STATE));
let upgradeableStats = {};

function getLevelSettings() {
    const seedValue = seedInput.value;
    return {
        seed: seedValue.trim() !== '' ? parseInt(seedValue, 10) : null,
        levelPattern: levelPatternSelect.value,
        startingBalls: parseInt(startingBallsInput.value, 10),
        ballSpeed: parseFloat(ballSpeedInput.value),
        goalBricks: parseInt(goalBricksInput.value, 10),
        goalBrickCountIncrement: parseFloat(goalBrickCountIncrementInput.value),
        extraBallBricks: parseInt(extraBallBricksInput.value, 10),
        explosiveBrickChance: parseFloat(explosiveBrickChanceInput.value),
        builderBrickChance: parseFloat(builderBrickChanceInput.value),
        healerBrickChance: parseFloat(healerBrickChanceInput.value),
        brickCount: parseInt(brickCountInput.value, 10),
        brickCountIncrement: parseInt(brickCountIncrementInput.value, 10),
        maxBrickCount: parseInt(maxBrickCountInput.value, 10),
        fewBrickLayoutChance: parseFloat(fewBrickLayoutChanceInput.value),
        startingBrickHp: parseInt(startingBrickHpInput.value, 10),
        brickHpIncrement: parseInt(brickHpIncrementInput.value, 10),
        brickHpIncrementMultiplier: parseFloat(brickHpIncrementMultiplierInput.value),
        startingCoin: parseInt(startingCoinInput.value, 10),
        coinIncrement: parseInt(coinIncrementInput.value, 10),
        maxCoin: parseInt(maxCoinInput.value, 10),
        bonusLevelInterval: parseInt(bonusLevelIntervalInput.value, 10),
        minCoinBonusMultiplier: parseInt(minCoinBonusMultiplierInput.value, 10),
        maxCoinBonusMultiplier: parseInt(maxCoinBonusMultiplierInput.value, 10),
    };
}

// --- P5.JS GAME CODE ---
const sketch = (p) => {
    // Game state variables
    let ball;
    let bricks = [[]]; // Now a 2D matrix
    let miniBalls = [];
    let score = 0, ballsLeft = 5, level = 1, coins = 0, giantBallCount = 0;
    let combo = 0, maxComboThisTurn = 0;
    let isGiantBallTurn = false;
    let gameState = 'aiming'; // aiming, playing, levelClearing, levelComplete, gameOver
    let currentSeed;
    
    p.isModalOpen = false;

    // VFX & SFX
    let particles = [], shockwaves = [], floatingTexts = [], powerupVFXs = [], stripeFlashes = [];
    let shakeDuration = 0, shakeAmount = 0;
    let splatBuffer;
    let levelCompleteSoundPlayed = false, gameOverSoundPlayed = false;

    // Game board settings
    let board = {};

    // Aiming variables
    let isAiming = false;
    let endAimPos;
    
    p.setup = () => {
        const container = document.getElementById('canvas-container');
        const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
        canvas.elt.style.width = '100%';
        canvas.elt.style.height = '100%';
        
        splatBuffer = p.createGraphics(container.clientWidth, container.clientHeight);
        
        sounds.init(new (window.AudioContext || window.webkitAudioContext)());
        p.windowResized(); // Call once to set initial board position
        const ballVisuals = createBallVisuals(p);
        Object.keys(ballVisuals).forEach(type => {
            const btnVisual = document.querySelector(`.ball-select-btn[data-ball-type="${type}"] .ball-visual`);
            if (btnVisual) btnVisual.style.backgroundImage = `url(${ballVisuals[type]})`;
        });
        
        p.resetGame(getLevelSettings());
    };

    p.draw = () => {
        updateHeaderUI(level, score, ballsLeft, giantBallCount, currentSeed, coins, gameState);
        p.background(40, 45, 55); // Use border color for whole canvas

        p.fill(20, 20, 30);
        p.noStroke();
        p.rect(board.x, board.y, board.width, board.height); // Draw game area background
        
        p.push();
        p.clip(() => { p.rect(board.x, board.y, board.width, board.height); });
        p.image(splatBuffer, 0, 0);
        p.pop();
        
        if (gameState === 'aiming' && !ball) {
            const canUseRegular = ballsLeft > 0;
            const canUseGiant = giantBallCount > 0;
            
            if (selectedBallType === 'giant' && canUseGiant) {
                ball = new Ball(p, board.x + board.width / 2, board.y + board.height - board.border, 'giant', board.gridUnitSize, upgradeableStats);
            } else if (canUseRegular) {
                 if (selectedBallType === 'giant') { // Can't use giant, fallback
                    selectedBallType = 'explosive';
                    document.querySelector('.ball-select-btn.active')?.classList.remove('active');
                    const firstRegularBtn = document.querySelector('.ball-select-btn[data-ball-type="explosive"]');
                    firstRegularBtn.classList.add('active');
                    updateBallSelectorArrow();
                }
                ball = new Ball(p, board.x + board.width / 2, board.y + board.height - board.border, selectedBallType, board.gridUnitSize, upgradeableStats);
            }
        }

        p.push(); // For camera shake
        if (shakeDuration > 0) {
            const offsetX = p.random(-shakeAmount, shakeAmount);
            const offsetY = p.random(-shakeAmount, shakeAmount);
            p.translate(offsetX, offsetY);
            shakeDuration--;
            if (shakeDuration <= 0) shakeAmount = 0;
        }


        if (gameState === 'aiming' && isAiming && ball) {
            previewTrajectory(ball.pos, p.constructor.Vector.sub(endAimPos, ball.pos).normalize().mult(10));
            const cancelRadius = ball.radius * 2.5;
            if (p.dist(endAimPos.x, endAimPos.y, ball.pos.x, ball.pos.y) < cancelRadius) {
                p.fill(255, 0, 0, 100); p.noStroke(); p.ellipse(ball.pos.x, ball.pos.y, cancelRadius * 2);
                p.fill(255); p.textAlign(p.CENTER, p.CENTER); p.textSize(12); p.text('Cancel', ball.pos.x, ball.pos.y);
            }
        }
        
        if ((gameState === 'playing' || gameState === 'levelClearing') && ball) {
            const events = ball.update(board, (b) => circleRectCollision(b));
            if (events.length > 0) processEvents(events);
        }
        miniBalls.forEach(mb => {
            const wallEvent = mb.update(board, ball);
            if (wallEvent) processEvents([wallEvent]);
            const brickEvents = circleRectCollision(mb);
            if (brickEvents.length > 0) processEvents(brickEvents);
        });

        // --- RENDER ORDER ---
        // 1. Bricks
        for (let c = 0; c < board.cols; c++) {
            for (let r = 0; r < board.rows; r++) {
                if (bricks[c][r]) bricks[c][r].draw(board);
            }
        }

        // 2. Balls
        if (ball) ball.draw();
        miniBalls.forEach(mb => mb.draw());

        // 3. Brick Overlays
        for (let c = 0; c < board.cols; c++) {
            for (let r = 0; r < board.rows; r++) {
                if (bricks[c][r]) bricks[c][r].drawOverlays(board);
            }
        }
      
        // 4. VFX
        [particles, shockwaves, floatingTexts, powerupVFXs, stripeFlashes].forEach(vfxArray => {
            for (let i = vfxArray.length - 1; i >= 0; i--) { 
                vfxArray[i].update(); 
                vfxArray[i].draw(); 
                if (vfxArray[i].isFinished()) vfxArray.splice(i, 1); 
            }
        });
        
        handleGameStates();
        drawInGameUI();
        p.pop(); // End camera shake
    };
    
    // --- EXPOSED CONTROL FUNCTIONS ---
    p.resetGame = (settings) => {
        score = 0; level = 1; coins = 0; giantBallCount = 0; combo = 0; maxComboThisTurn = 0;
        isGiantBallTurn = false; ballPurchaseCount = 0; ballsLeft = settings.startingBalls;
        p.setBallSpeedMultiplier(settings.ballSpeed);
        splatBuffer.clear();
        p.runLevelGeneration(settings);
    };
    p.nextLevel = () => { level++; p.runLevelGeneration(getLevelSettings()); };
    p.prevLevel = () => { if (level > 1) { level--; p.runLevelGeneration(getLevelSettings()); } };
    p.runLevelGeneration = (settings) => {
        const result = generateLevel(p, settings, level, board);
        bricks = result.bricks;
        currentSeed = result.seed;
        miniBalls = [];
        ball = null; // Will be created in draw()
        gameState = 'aiming';
        levelCompleteSoundPlayed = false; gameOverSoundPlayed = false;
        combo = 0; maxComboThisTurn = 0; isGiantBallTurn = false;
    }
    p.setBallSpeedMultiplier = (multiplier) => {
        originalBallSpeed = multiplier; 
        const baseSpeed = (board.gridUnitSize * 0.5) * originalBallSpeed * (isSpedUp ? 3.0 : 1.0);
        if (ball && ball.isMoving) ball.vel.setMag(baseSpeed); 
        miniBalls.forEach(mb => mb.vel.setMag(baseSpeed)); 
    };
    p.getBallSpeedMultiplier = () => originalBallSpeed;
    p.addBall = () => { ballsLeft++; ballPurchaseCount++; };
    p.getCoins = () => coins;
    p.setCoins = (newCoins) => { coins = newCoins; };
    p.changeBallType = (newType) => { if (gameState === 'aiming' && ball) { const oldPos = ball.pos.copy(); ball = new Ball(p, oldPos.x, oldPos.y, newType, board.gridUnitSize, upgradeableStats); } };
    p.toggleSpeed = () => { 
        isSpedUp = !isSpedUp; 
        const speedMultiplier = isSpedUp ? 3.0 : 1.0; 
        const baseSpeed = (board.gridUnitSize * 0.5) * originalBallSpeed * speedMultiplier;
        if (ball && ball.isMoving) ball.vel.setMag(baseSpeed); 
        miniBalls.forEach(mb => mb.vel.setMag(baseSpeed)); return isSpedUp; 
    };
    
    // --- EVENT & LOGIC PROCESSING ---
    function processEvents(initialEvents) {
        let eventQueue = [...initialEvents];
        while (eventQueue.length > 0) {
            const event = eventQueue.shift();
            if (!event) continue;
            switch (event.type) {
                case 'damage_taken':
                    if (event.source === 'wall') {
                        sounds.wallHit();
                        if (!isGiantBallTurn && combo > 0) { sounds.comboReset(); combo = 0; }
                    } else if (event.source === 'miniball_wall') {
                        sounds.wallHit();
                    }
                    if (event.isDead) {
                        particles.push(...createBallDeathVFX(p, ball.pos.x, ball.pos.y));
                        miniBalls = [];
                        if (isGiantBallTurn) {
                            giantBallCount--;
                        } else {
                            ballsLeft--;
                        }
                        ball = null;
                        sounds.ballDeath();
                        handleEndTurnEffects();
                        if (gameState === 'levelClearing') { gameState = 'levelComplete'; return; }
                        if (isSpedUp) { isSpedUp = false; speedToggleBtn.textContent = 'Speed Up'; speedToggleBtn.classList.remove('speed-active'); }
                        currentBallCost = shopParams.buyBall.baseCost + ballPurchaseCount * shopParams.buyBall.increment;
                        if (ballsLeft <= 0 && giantBallCount <= 0 && coins < currentBallCost) {
                            gameState = 'gameOver';
                        } else {
                            isGiantBallTurn = false; gameState = 'aiming';
                        }
                    }
                    break;
                case 'brick_hit':
                    score += event.points;
                    if(event.coins > 0) {
                        coins += event.coins; sounds.coin(); floatingTexts.push(new FloatingText(p, event.center.x, event.center.y, `+${event.coins}`, p.color(255, 223, 0)));
                        const canvasRect = p5Instance.canvas.getBoundingClientRect(); animateCoinParticles(canvasRect.left + event.center.x, canvasRect.top + event.center.y, event.coins);
                    }
                    particles.push(...createBrickHitVFX(p, event.center.x, event.center.y, event.color));
                    sounds.brickHit(p, event.health, combo);
                    triggerShake(2, 5);
                    handleCombo();
                    if(event.isBroken) {
                        sounds.brickBreak();
                        if (event.source !== 'chain-reaction' && event.source !== 'replaced') handleCombo('break', event.center);
                    }
                    if (event.childEvents && event.childEvents.length > 0) eventQueue.push(...event.childEvents);
                    break;
                 case 'explode_mine':
                    eventQueue.push(...explode(event.pos, board.gridUnitSize * 2, 10, 'mine'));
                    break;
            }
        }
        processBrokenBricks();
    }

    function triggerShake(amount, duration) { shakeAmount = Math.max(shakeAmount, amount); shakeDuration = Math.max(shakeDuration, duration); }
    
    function explode(pos, radius, damage, source = 'ball') {
        const vfxRadius = radius * 0.8;
        shockwaves.push(new Shockwave(p, pos.x, pos.y, vfxRadius, p.color(255, 100, 0), 15));
        const explosionColor = p.color(255, 100, 0);
        for (let i = 0; i < 50; i++) particles.push(new Particle(p, pos.x, pos.y, explosionColor, p.random(5, 15), { lifespan: 60, size: p.random(3, 6) }));
        sounds.explosion(); triggerShake(4, 12);
        let hitEvents = [];

        const minC = Math.max(0, Math.floor((pos.x - radius - board.genX) / board.gridUnitSize));
        const maxC = Math.min(board.cols - 1, Math.floor((pos.x + radius - board.genX) / board.gridUnitSize));
        const minR = Math.max(0, Math.floor((pos.y - radius - board.genY) / board.gridUnitSize));
        const maxR = Math.min(board.rows - 1, Math.floor((pos.y + radius - board.genY) / board.gridUnitSize));

        for (let c = minC; c <= maxC; c++) {
            for (let r = minR; r <= maxR; r++) {
                const brick = bricks[c][r];
                if (brick) {
                    const brickPos = brick.getPixelPos(board);
                    const brickCenter = p.createVector(brickPos.x + brick.size / 2, brickPos.y + brick.size / 2);
                    if (p.dist(pos.x, pos.y, brickCenter.x, brickCenter.y) < radius) {
                        const hitResult = brick.hit(damage, source, board);
                        if (hitResult) {
                            hitEvents.push({ type: 'brick_hit', points: hitResult.damageDealt, coins: hitResult.coinsDropped, isBroken: hitResult.isBroken, center: hitResult.center, color: hitResult.color, health: brick.health, childEvents: hitResult.events, source });
                        }
                    }
                }
            }
        }
        return hitEvents;
    }

    function clearStripe(brick, direction) {
        sounds.stripeClear();
        stripeFlashes.push(new StripeFlash(p, brick, direction, board));
        const brickPos = brick.getPixelPos(board);
        const brickCenter = p.createVector(brickPos.x + brick.size / 2, brickPos.y + brick.size / 2);
        const particleColor = p.color(255, 200, 150);
        for (let i = 0; i < 150; i++) {
            if (direction === 'horizontal') {
                const vel = p.createVector((i % 2 === 0 ? 1 : -1) * p.random(25, 35), p.random(-2, 2));
                particles.push(new Particle(p, brickCenter.x, brickCenter.y + p.random(-brick.size / 2, brick.size / 2), particleColor, 1, { vel: vel, size: p.random(6, 10), lifespan: 60 }));
            } else {
                const vel = p.createVector(p.random(-2, 2), (i % 2 === 0 ? 1 : -1) * p.random(25, 35));
                particles.push(new Particle(p, brickCenter.x + p.random(-brick.size / 2, brick.size / 2), brickCenter.y, particleColor, 1, { vel: vel, size: p.random(6, 10), lifespan: 60 }));
            }
        }
        
        let hitEvents = [];
        const gridC = brick.c + 6;
        const gridR = brick.r + 6;

        if (direction === 'horizontal') {
            for (let c = 0; c < board.cols; c++) {
                const b = bricks[c][gridR];
                if (b) {
                    const hitResult = b.hit(30, 'chain-reaction', board);
                    if (hitResult) hitEvents.push({ type: 'brick_hit', points: hitResult.damageDealt, coins: hitResult.coinsDropped, isBroken: hitResult.isBroken, center: hitResult.center, color: hitResult.color, health: b.health, childEvents: hitResult.events, source: 'chain-reaction' });
                }
            }
        } else { // Vertical
            for (let r = 0; r < board.rows; r++) {
                 const b = bricks[gridC][r];
                 if (b) {
                    const hitResult = b.hit(30, 'chain-reaction', board);
                    if (hitResult) hitEvents.push({ type: 'brick_hit', points: hitResult.damageDealt, coins: hitResult.coinsDropped, isBroken: hitResult.isBroken, center: hitResult.center, color: hitResult.color, health: b.health, childEvents: hitResult.events, source: 'chain-reaction' });
                 }
            }
        }
        return hitEvents;
    }

    function handleCombo(type, pos) { 
        if (isGiantBallTurn) return; 
        combo++; 
        maxComboThisTurn = p.max(maxComboThisTurn, combo); 
        if (type === 'break' && pos) {
            const comboColor = p.lerpColor(p.color(255,255,0), p.color(255,0,0), p.min(1, combo/50));
            floatingTexts.push(new FloatingText(p, pos.x, pos.y, `${combo}`, comboColor, { size: 10 + p.min(8, combo / 5), lifespan: 50, isBold: true }));
        }
    }

    function processBrokenBricks() {
        let chainReaction = true;
        let newEvents = [];
        while (chainReaction) {
            chainReaction = false;
            for (let c = 0; c < board.cols; c++) {
                for (let r = 0; r < board.rows; r++) {
                    const brick = bricks[c][r];
                    if (brick && brick.isBroken()) {
                        const brickPos = brick.getPixelPos(board);
                        createSplat(p, splatBuffer, brickPos.x + brick.size / 2, brickPos.y + brick.size / 2, brick.getColor(), board.gridUnitSize);
                        const centerVec = p.createVector(brickPos.x + brick.size / 2, brickPos.y + brick.size / 2);
                        switch (brick.type) {
                            case 'extraBall': ballsLeft++; sounds.coin(); floatingTexts.push(new FloatingText(p, centerVec.x, centerVec.y, "+1 Ball", p.color(0, 255, 127))); break;
                            case 'explosive': newEvents.push(...explode(centerVec, board.gridUnitSize * 3, upgradeableStats.powerExplosionDamage, 'chain-reaction')); break;
                            case 'horizontalStripe': newEvents.push(...clearStripe(brick, 'horizontal')); break;
                            case 'verticalStripe': newEvents.push(...clearStripe(brick, 'vertical')); break;
                        }
                        bricks[c][r] = null;
                        chainReaction = true;
                    }
                }
            }
        }
        if (newEvents.length > 0) processEvents(newEvents);
        
        let goalBricksLeft = 0;
        for (let c = 0; c < board.cols; c++) {
            for (let r = 0; r < board.rows; r++) {
                const brick = bricks[c][r];
                if (brick && brick.type === 'goal') {
                    goalBricksLeft++;
                }
            }
        }

        if (gameState === 'playing' && goalBricksLeft === 0) {
            gameState = 'levelClearing';
        }
    }

    function circleRectCollision(b) {
        let hitEvents = [];
        const minC = Math.max(0, Math.floor((b.pos.x - b.radius - board.genX) / board.gridUnitSize));
        const maxC = Math.min(board.cols - 1, Math.ceil((b.pos.x + b.radius - board.genX) / board.gridUnitSize));
        const minR = Math.max(0, Math.floor((b.pos.y - b.radius - board.genY) / board.gridUnitSize));
        const maxR = Math.min(board.rows - 1, Math.ceil((b.pos.y + b.radius - board.genY) / board.gridUnitSize));
        
        for (let c = minC; c <= maxC; c++) {
            for (let r = minR; r <= maxR; r++) {
                const brick = bricks[c][r];
                if (!brick) continue;
                
                const brickPos = brick.getPixelPos(board);

                if (b.type === 'giant') { 
                    const dist = p.dist(b.pos.x, b.pos.y, brickPos.x + brick.size/2, brickPos.y + brick.size/2); 
                    if(dist < b.radius + brick.size/2 && !b.piercedBricks.has(brick)) { 
                        const hitResult = brick.hit(1000, 'ball', board);
                        if (hitResult) {
                             hitEvents.push({ type: 'brick_hit', points: hitResult.damageDealt, coins: hitResult.coinsDropped, isBroken: hitResult.isBroken, center: hitResult.center, color: hitResult.color, health: brick.health, childEvents: hitResult.events, source: 'ball' });
                        }
                        b.piercedBricks.add(brick); 
                    } 
                    continue; 
                }
                let testX=b.pos.x, testY=b.pos.y; 
                if (b.pos.x < brickPos.x) testX=brickPos.x; 
                else if (b.pos.x > brickPos.x+brick.size) testX=brickPos.x+brick.size; 
                if (b.pos.y < brickPos.y) testY=brickPos.y; 
                else if (b.pos.y > brickPos.y+brick.size) testY=brickPos.y+brick.size;
                
                const dX=b.pos.x-testX, dY=b.pos.y-testY; 
                if (p.sqrt(dX*dX + dY*dY) <= b.radius) {
                    if (b.type === 'piercing' && b.isPiercing) {
                        if (b.piercedBricks.has(brick)) continue;
                        b.piercedBricks.add(brick);
                        b.piercingContactsLeft--;
                        if (b.piercingContactsLeft <= 0) b.isPiercing = false;
                        continue; 
                    }

                    let damage = (b instanceof MiniBall) ? upgradeableStats.splitMiniBallDamage : 10;
                    if (b.type === 'piercing' && b.stats && b.stats.piercingBonusDamage) {
                        damage += b.stats.piercingBonusDamage;
                    }
                    const hitResult = brick.hit(damage, 'ball', board);
                    if (hitResult) {
                         hitEvents.push({ type: 'brick_hit', points: hitResult.damageDealt, coins: hitResult.coinsDropped, isBroken: hitResult.isBroken, center: hitResult.center, color: hitResult.color, health: brick.health, childEvents: hitResult.events, source: 'ball' });
                    }
                    
                    const n=p.createVector(dX, dY).normalize(); 
                    b.pos.add(n.copy().mult(b.radius-p.dist(b.pos.x,b.pos.y,testX,testY))); 
                    b.vel.sub(n.copy().mult(2 * b.vel.dot(n)));
                    if (b.type === 'piercing') {
                        const event = b.takeDamage(2, 'brick');
                        if (event) hitEvents.push(event);
                    }
                    return hitEvents; // only hit one brick per step
                }
            }
        }
        return hitEvents;
    }
    
    // --- UI & EVENT HANDLING ---
    function handleGameStates() { 
        if (gameState==='levelComplete'||gameState==='gameOver') { 
            if (isSpedUp) {
                isSpedUp = false;
                speedToggleBtn.textContent = 'Speed Up';
                speedToggleBtn.classList.remove('speed-active');
            }
            p.fill(0,0,0,150); p.rect(board.x,board.y,board.width,board.height); p.fill(255); p.textSize(32); p.textAlign(p.CENTER,p.CENTER); 
            if (gameState==='levelComplete') { p.text('Level Complete!', board.x+board.width/2, board.y+board.height/2); if(!levelCompleteSoundPlayed){sounds.levelComplete();levelCompleteSoundPlayed=true;}} 
            else { p.text('Game Over', board.x+board.width/2, board.y+board.height/2); if(!gameOverSoundPlayed){sounds.gameOver();gameOverSoundPlayed=true;}} 
            p.textSize(16); p.text('Click to Continue', board.x+board.width/2, board.y+board.height/2+40); 
        } 
    }
    p.mousePressed = () => {
        if (p.isModalOpen) return;
        
        if ((gameState === 'playing' || gameState === 'levelClearing') && ball) {
            const clickInBoard = p.mouseX > board.x && p.mouseX < board.x + board.width && p.mouseY > board.y && p.mouseY < board.y + board.height;
            if (!clickInBoard) return;
            
            const powerUpResult = ball.usePowerUp();
            if(powerUpResult) {
                if(powerUpResult.sound) sounds[powerUpResult.sound]();
                if(powerUpResult.vfx) powerUpResult.vfx.forEach(vfx => { if(vfx.type === 'powerup') powerupVFXs.push(new PowerupVFX(p, vfx.pos.x, vfx.pos.y)); });
                if(powerUpResult.effect) {
                    const effect = powerUpResult.effect;
                    if(effect.type === 'explode') {
                        const explosionEvents = explode(effect.pos, effect.radius, upgradeableStats.powerExplosionDamage);
                        processEvents(explosionEvents);
                    }
                    if(effect.type === 'spawn_miniballs') miniBalls.push(...effect.miniballs);
                    if(effect.type === 'spawn_bricks') handleBrickSpawnPowerup(effect);
                }
            }
            return;
        }
        if (gameState === 'levelClearing') return;
        if (gameState === 'aiming' && ball) { 
            const clickInBoard = p.mouseY > board.y && p.mouseY < board.y + board.height && p.mouseX > board.x && p.mouseX < board.x + board.width;
            if (clickInBoard) { 
                isAiming = true; 
                endAimPos = p.createVector(p.mouseX, p.mouseY); 
                let distTop = p.abs(p.mouseY - board.y), distBottom = p.abs(p.mouseY - (board.y + board.height)), distLeft = p.abs(p.mouseX - board.x), distRight = p.abs(p.mouseX - (board.x + board.width)); 
                let minDist = p.min(distTop, distBottom, distLeft, distRight); 
                let shootX, shootY; 
                if (minDist === distTop) { shootX = p.mouseX; shootY = board.y + board.border/2 + ball.radius; } 
                else if (minDist === distBottom) { shootX = p.mouseX; shootY = board.y + board.height - board.border/2 - ball.radius; } 
                else if (minDist === distLeft) { shootX = board.x + board.border/2 + ball.radius; shootY = p.mouseY; } 
                else { shootX = board.x + board.width - board.border/2 - ball.radius; shootY = p.mouseY; } 
                ball.pos.set(shootX, shootY); 
            }
        } else if (gameState === 'levelComplete') { p.nextLevel(); }
        else if (gameState === 'gameOver') { p.resetGame(getLevelSettings()); }
    };
    p.mouseDragged = () => { if (isAiming && ball) endAimPos.set(p.mouseX, p.mouseY); };
    p.mouseReleased = () => { 
        if (isAiming && ball) { 
            const cancelRadius = ball.radius * 2.5; 
            if (p.dist(endAimPos.x, endAimPos.y, ball.pos.x, ball.pos.y) < cancelRadius) { isAiming = false; return; }
            let v = p.constructor.Vector.sub(endAimPos, ball.pos).limit(board.gridUnitSize).mult(0.5); 
            if (v.mag() > 1) {
                if (ball.type === 'giant') {
                    isGiantBallTurn = true;
                }
                gameState = ball.launch(v, originalBallSpeed, isSpedUp, board.gridUnitSize); 
            }
            isAiming = false; 
        } 
    };

    // --- Touch Controls ---
    p.touchStarted = (event) => {
        // If the touch event target is not the canvas, let the browser handle it for UI elements.
        if (event.target !== p.canvas) {
            return;
        }
        if (p.touches.length > 0) {
            p.mousePressed();
        }
        // Prevent default browser behavior (like scrolling) only for direct canvas interactions.
        return false; 
    };
    
    p.touchMoved = (event) => {
        // If the touch event target is not the canvas, do nothing.
        if (event.target !== p.canvas) {
            return;
        }
        if (p.touches.length > 0) {
            p.mouseDragged();
        }
        // Prevent scrolling while aiming is active.
        if (isAiming) {
            return false;
        }
    };
    
    p.touchEnded = (event) => {
        // If the touch event target is not the canvas, let the browser handle it.
        if (event.target !== p.canvas) {
            return;
        }
        p.mouseReleased();
        // Prevent any lingering side-effects like zoom on some browsers after a game action.
        return false;
    };
    
    function previewTrajectory(sP, sV) { 
        let pos = sP.copy(), vel = sV.copy(); p.stroke(255, 255, 0, 100); p.strokeWeight(6); p.noFill(); p.beginShape(); 
        for (let i = 0; i < upgradeableStats.aimLength * 3; i++) { 
            p.vertex(pos.x, pos.y); pos.add(vel); 
            const right = board.x + board.width - board.border/2, bottom = board.y + board.height - board.border/2, left = board.x + board.border/2, top = board.y + board.border/2; 
            if (pos.x - ball.radius < left || pos.x + ball.radius > right) vel.x *= -1; 
            if (pos.y - ball.radius < top || pos.y + ball.radius > bottom) vel.y *= -1; 
        } 
        p.endShape(); 
    }
    p.windowResized = () => { 
        const container = document.getElementById('canvas-container'); 
        p.resizeCanvas(container.clientWidth, container.clientHeight); 
        splatBuffer.resizeCanvas(container.clientWidth, container.clientHeight); 
        
        const MaxSize = 580;
        const maxGridUnitSize = MaxSize / GRID_CONSTANTS.TOTAL_COLS;
        board.gridUnitSize = p.min(p.width / GRID_CONSTANTS.TOTAL_COLS, p.height / GRID_CONSTANTS.TOTAL_ROWS, maxGridUnitSize);
        board.width = GRID_CONSTANTS.TOTAL_COLS * board.gridUnitSize;
        board.height = GRID_CONSTANTS.TOTAL_ROWS * board.gridUnitSize;
        board.x = (p.width - board.width) / 2;
        board.y = (p.height - board.height) / 2;
        board.border = board.gridUnitSize / 2;
        board.genX = board.x + GRID_CONSTANTS.SAFE_ZONE_GRID * board.gridUnitSize;
        board.genY = board.y + GRID_CONSTANTS.SAFE_ZONE_GRID * board.gridUnitSize;
        board.cols = GRID_CONSTANTS.BRICK_COLS;
        board.rows = GRID_CONSTANTS.BRICK_ROWS;

        if(p5Instance) p5Instance.setBallSpeedMultiplier(originalBallSpeed);
    };
    
    function drawInGameUI() {
        if (!ball || (!ball.isMoving && !isGiantBallTurn)) return;

        const isLandscape = p.width > p.height;
        const currentHpValue = ball.hp / 10;
        const totalSegments = Math.ceil(ball.maxHp / 10);

        if (isLandscape) {
            // --- LANDSCAPE UI (LEFT SIDE, VERTICAL) ---
            let uiX = p.min(p.width * 0.1, 60);
            let uiY = p.height / 2;
            const segWidth = 24, segHeight = 8, segGap = 3;
            const iconSize = 24, iconGap = 6;
            
            const availableHeight = p.min(p.height * 0.8, 500);
            const segsPerCol = Math.floor(availableHeight / (segHeight + segGap));
            const numCols = Math.ceil(totalSegments / segsPerCol);
            const barWidth = numCols * (segWidth + segGap);
            const barHeight = (Math.min(segsPerCol, totalSegments) * (segHeight + segGap)) - segGap;

            let totalUiHeight = barHeight;
            if (ball.powerUpMaxUses > 0) {
                totalUiHeight += (ball.powerUpMaxUses * (iconSize + iconGap)) + 10; // +10 for padding
            }
            
            let currentDrawY = uiY - totalUiHeight / 2;

            // 1. Draw Power-ups
            if (ball.powerUpMaxUses > 0) {
                for (let i = 0; i < ball.powerUpMaxUses; i++) {
                    const x = uiX - iconSize / 2;
                    const y = currentDrawY;
                    p.strokeWeight(1.5); p.stroke(0); if(i < ball.powerUpUses) p.fill(255, 193, 7); else p.fill(108, 117, 125); p.beginShape(); p.vertex(x + iconSize * 0.4, y); p.vertex(x + iconSize * 0.4, y + iconSize * 0.5); p.vertex(x + iconSize * 0.2, y + iconSize * 0.5); p.vertex(x + iconSize * 0.6, y + iconSize); p.vertex(x + iconSize * 0.6, y + iconSize * 0.6); p.vertex(x + iconSize * 0.8, y + iconSize * 0.6); p.endShape(p.CLOSE);
                    currentDrawY += iconSize + iconGap;
                }
                currentDrawY += 10; // padding after powerups
            }

            // 2. Draw Health Bar
            for (let i = 0; i < totalSegments; i++) {
                const col = Math.floor(i / segsPerCol);
                const row = i % segsPerCol;
                const x = uiX - barWidth/2 + col * (segWidth + segGap);
                const y = currentDrawY + row * (segHeight + segGap);
                p.noStroke(); p.fill(47, 47, 47); p.rect(x, y, segWidth, segHeight, 2);
                let fillWidth = 0;
                if (i < Math.floor(currentHpValue)) { fillWidth = segWidth; } 
                else if (i === Math.floor(currentHpValue)) { fillWidth = (currentHpValue % 1) * segWidth; }
                if (fillWidth > 0) { if(ball.flashTime > 0 && ball.flashTime % 10 > 5) { p.fill(244, 67, 54); } else { p.fill(76, 175, 80); } p.rect(x, y, fillWidth, segHeight, 2); }
            }
        } else {
            // --- PORTRAIT UI (BOTTOM, HORIZONTAL) ---
            let uiX = p.width / 2; let uiY = p.height - 90;
            const segWidth = 8, segHeight = 16, segGap = 2; const iconSize = 20, iconGap = 5;
            const availableWidth = p.min(p.width * 0.9, 400); const segsPerRow = Math.floor(availableWidth / (segWidth + segGap));
            const numRows = Math.ceil(totalSegments / segsPerRow);
            const barHeight = numRows * (segHeight + segGap);
            let currentY = uiY - barHeight;
            if (ball.powerUpMaxUses > 0) {
                const puBarWidth = ball.powerUpMaxUses * (iconSize + iconGap);
                for(let i=0; i < ball.powerUpMaxUses; i++) { const x = uiX - puBarWidth/2 + i * (iconSize + iconGap); const y = currentY - (iconSize+5); p.strokeWeight(1.5); p.stroke(0); if(i < ball.powerUpUses) p.fill(255, 193, 7); else p.fill(108, 117, 125); p.beginShape(); p.vertex(x + iconSize * 0.4, y); p.vertex(x + iconSize * 0.4, y + iconSize * 0.5); p.vertex(x + iconSize * 0.2, y + iconSize * 0.5); p.vertex(x + iconSize * 0.6, y + iconSize); p.vertex(x + iconSize * 0.6, y + iconSize * 0.6); p.vertex(x + iconSize * 0.8, y + iconSize * 0.6); p.endShape(p.CLOSE); }
            }
            for (let i = 0; i < totalSegments; i++) { const row = Math.floor(i / segsPerRow); const col = i % segsPerRow; const thisRowSegs = (row === numRows - 1) ? totalSegments % segsPerRow || segsPerRow : segsPerRow; const rowWidth = thisRowSegs * (segWidth + segGap) - segGap; const x = uiX - rowWidth/2 + col * (segWidth + segGap); const y = currentY + row * (segHeight + segGap); p.noStroke(); p.fill(47, 47, 47); p.rect(x, y, segWidth, segHeight, 1); let fillHeight = 0; if(i < Math.floor(currentHpValue)) { fillHeight = segHeight; } else if (i === Math.floor(currentHpValue)) { fillHeight = (currentHpValue % 1) * segHeight; } if (fillHeight > 0) { if(ball.flashTime > 0 && ball.flashTime % 10 > 5) { p.fill(244, 67, 54); } else { p.fill(76, 175, 80); } p.rect(x, y + segHeight - fillHeight, segWidth, fillHeight, 1); } }
        }
    }

    function handleEndTurnEffects() {
        if (maxComboThisTurn > 0) {
            floatingTexts.push(new FloatingText(p, p.width / 2, 80, `${maxComboThisTurn} COMBO`, p.color(255, 165, 0), { size: 32, lifespan: 120, vel: p.createVector(0, 0), scaleRate: 0.005, isBold: true }));
            const minesToSpawn = Math.floor(Math.min(maxComboThisTurn, 15) / 3);
            const stripesToSpawn = Math.floor(Math.min(maxComboThisTurn, 60) / 15);
            const giantsToSpawn = Math.floor(maxComboThisTurn / 50);
            
            if (giantsToSpawn > 0) {
                giantBallCount += giantsToSpawn;
                floatingTexts.push(new FloatingText(p, p.width / 2, 115, `+${giantsToSpawn} Giant Ball`, p.color(186, 85, 211), { size: 18, lifespan: 120, vel: p.createVector(0, 0), isBold: true }));
            }

            let eligibleMineBricks = [];
            for(let c=0; c<board.cols; c++) for(let r=0; r<board.rows; r++) if(bricks[c][r] && bricks[c][r].type === 'normal' && !bricks[c][r].overlay) eligibleMineBricks.push(bricks[c][r]);
            p.shuffle(eligibleMineBricks, true);
            for(let i=0; i<Math.min(minesToSpawn, eligibleMineBricks.length); i++) {
                eligibleMineBricks[i].overlay = 'mine';
            }

            let emptyCoords = [];
            for(let c=0; c<board.cols; c++) for(let r=0; r<board.rows; r++) if(!bricks[c][r]) emptyCoords.push({c,r});
            p.shuffle(emptyCoords, true);
            for(let i=0; i<Math.min(stripesToSpawn, emptyCoords.length); i++) {
                const spot = emptyCoords[i];
                const type = p.random() > 0.5 ? 'horizontalStripe' : 'verticalStripe';
                bricks[spot.c][spot.r] = new Brick(p, spot.c - 6, spot.r - 6, type, 10, board.gridUnitSize);
            }
        }
        combo = 0; maxComboThisTurn = 0;

        const findBrickAt = (c, r) => { if (c >= 0 && c < board.cols && r >= 0 && r < board.rows) return bricks[c][r]; return null; };
        
        // --- Healer Logic ---
        const healers = [];
        for(let c=0; c<board.cols; c++) for(let r=0; r<board.rows; r++) if(bricks[c][r] && bricks[c][r].overlay === 'healer') healers.push(bricks[c][r]);

        const healActions = new Map(); // Map<Brick, { count: number, sources: Brick[] }>
        healers.forEach(healer => {
            const c = healer.c + 6, r = healer.r + 6;
            for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) { if (dc === 0 && dr === 0) continue; const neighbor = findBrickAt(c + dc, r + dr); if (neighbor && neighbor.type === 'normal' && !neighbor.overlay) { const action = healActions.get(neighbor) || { count: 0, sources: [] }; action.count++; action.sources.push(healer); healActions.set(neighbor, action); } }
        });
        if (healActions.size > 0) sounds.heal();
        healActions.forEach((action, brick) => {
            brick.health = p.min(brick.maxHealth, brick.health + 10 * action.count);
            const targetPos = brick.getPixelPos(board).add(brick.size / 2, brick.size / 2);
            action.sources.forEach(source => {
                const sourcePos = source.getPixelPos(board).add(source.size / 2, source.size / 2);
                shockwaves.push(new Shockwave(p, sourcePos.x, sourcePos.y, brick.size * 1.5, p.color(144, 238, 144), 4));
                particles.push(new Particle(p, sourcePos.x, sourcePos.y, p.color(144, 238, 144, 150), 2, {target: targetPos, size: 3, lifespan: 100}));
            });
        });

        // --- Builder Logic ---
        const builders = [];
        for(let c=0; c<board.cols; c++) for(let r=0; r<board.rows; r++) if(bricks[c][r] && bricks[c][r].overlay === 'builder') builders.push(bricks[c][r]);
        
        const buildBuffs = new Map(); // Map<Brick, { count: number, sources: Brick[] }>
        const buildSpawns = new Map(); // Map<string, { count: number, sources: Brick[] }>
        builders.forEach(builder => {
            const startC = builder.c + 6, startR = builder.r + 6;
            [{c:0, r:-1}, {c:0, r:1}, {c:-1, r:0}, {c:1, r:0}].forEach(dir => {
                let currentC = startC + dir.c, currentR = startR + dir.r, lastBrick = null;
                while(currentC >= 0 && currentC < board.cols && currentR >= 0 && currentR < board.rows) { const brickAtPos = findBrickAt(currentC, currentR); if (!brickAtPos) { const key = `${currentC},${currentR}`; const spawn = buildSpawns.get(key) || { count: 0, sources: []}; spawn.count++; spawn.sources.push(builder); buildSpawns.set(key, spawn); return; } lastBrick = brickAtPos; currentC += dir.c; currentR += dir.r; }
                if (lastBrick && lastBrick.type === 'normal' && !lastBrick.overlay) { const buff = buildBuffs.get(lastBrick) || { count: 0, sources: []}; buff.count++; buff.sources.push(builder); buildBuffs.set(lastBrick, buff); }
            });
        });

        if (buildSpawns.size > 0 || buildBuffs.size > 0) sounds.brickSpawn();

        buildSpawns.forEach((spawn, key) => {
            const [c, r] = key.split(',').map(Number);
            if (!findBrickAt(c, r)) {
                const newBrick = new Brick(p, c - 6, r - 6, 'normal', 10 * spawn.count, board.gridUnitSize);
                bricks[c][r] = newBrick;
                const targetPos = newBrick.getPixelPos(board).add(newBrick.size / 2, newBrick.size / 2);
                spawn.sources.forEach(source => { const sourcePos = source.getPixelPos(board).add(source.size/2, source.size/2); for(let i=0; i<5; i++) particles.push(new Particle(p, sourcePos.x, sourcePos.y, p.color(135, 206, 250), 3, { target: targetPos })); });
            }
        });
        
        buildBuffs.forEach((buff, brick) => {
            const healthToAdd = 10 * buff.count;
            brick.maxHealth += healthToAdd;
            brick.health = brick.maxHealth;
            const targetPos = brick.getPixelPos(board).add(brick.size/2, brick.size/2);
            buff.sources.forEach(source => { const sourcePos = source.getPixelPos(board).add(source.size/2, source.size/2); for(let i=0; i<5; i++) particles.push(new Particle(p, sourcePos.x, sourcePos.y, p.color(135, 206, 250, 150), 2, { target: targetPos, size: 3, lifespan: 100 })); });
        });
    }

    function handleBrickSpawnPowerup(effect) {
        const { center, coinChance } = effect;
        const tiles = 3; 
        const radius = tiles * board.gridUnitSize;
        const gridPositions = new Set();
        for (let i = 0; i < 72; i++) {
            const angle = p.TWO_PI / 72 * i;
            const x = center.x + radius * p.cos(angle);
            const y = center.y + radius * p.sin(angle);
            
            const gridC = Math.round((x - board.genX) / board.gridUnitSize);
            const gridR = Math.round((y - board.genY) / board.gridUnitSize);
            
            if (gridC >= 0 && gridC < board.cols && gridR >= 0 && gridR < board.rows) {
                gridPositions.add(`${gridC},${gridR}`);
            }
        }

        const bricksToKillAndReplace = [];
        const emptySpotsToFill = [];

        gridPositions.forEach(posStr => {
            const [gridC, gridR] = posStr.split(',').map(Number);
            let existingBrick = bricks[gridC][gridR];

            if (existingBrick) {
                if (existingBrick.type === 'normal') {
                    bricksToKillAndReplace.push({ brick: existingBrick, pos: { c: gridC, r: gridR } });
                }
            } else {
                emptySpotsToFill.push({ c: gridC, r: gridR });
            }
        });

        bricksToKillAndReplace.forEach(item => {
            const hitResult = item.brick.hit(10000, 'replaced', board);
            if (hitResult) processEvents([{ type: 'brick_hit', points: hitResult.damageDealt, coins: hitResult.coinsDropped, isBroken: hitResult.isBroken, center: hitResult.center, color: hitResult.color, health: item.brick.health, childEvents: hitResult.events, source: 'replaced' }]);
        });

        processBrokenBricks();

        const spotsForNewBricks = emptySpotsToFill.concat(bricksToKillAndReplace.map(item => item.pos));
        spotsForNewBricks.forEach(pos => {
            const newBrick = new Brick(p, pos.c - 6, pos.r - 6, 'normal', 10, board.gridUnitSize);
            if (p.random() < coinChance) { 
                newBrick.coins = newBrick.maxCoins = 5; 
                newBrick.coinIndicatorPositions = []; 
                for (let i=0; i<p.min(newBrick.maxCoins, 20); i++) {
                     newBrick.coinIndicatorPositions.push(p.createVector(p.random(newBrick.size * 0.1, newBrick.size * 0.9), p.random(newBrick.size * 0.1, newBrick.size * 0.9))); 
                }
            }
            bricks[pos.c][pos.r] = newBrick;
        });
    }

};

// --- UI AND APP LOGIC ---
function runCode() {
    if (p5Instance) p5Instance.remove();
    const container = document.getElementById('canvas-container');
    container.innerHTML = '';
    p5Instance = new p5(sketch, container);
    isRunning = true;
    pauseResumeBtn.textContent = 'Pause';
}

function updateBallSelectorArrow() {
    const activeBtn = document.querySelector('.ball-select-btn.active');
    if (!activeBtn || !ballSelectorArrow) return;

    const isLandscape = window.innerWidth > window.innerHeight;
    if (isLandscape) {
        const topPos = activeBtn.offsetTop + activeBtn.offsetHeight / 2;
        ballSelectorArrow.style.top = `${topPos}px`;
        ballSelectorArrow.style.left = ''; // Clear horizontal positioning
    } else {
        const leftPos = activeBtn.offsetLeft + activeBtn.offsetWidth / 2 - ballSelectorArrow.offsetWidth / 2;
        ballSelectorArrow.style.left = `${leftPos}px`;
        ballSelectorArrow.style.top = ''; // Clear vertical positioning
    }
}

function updateBallSelectorUI(balls, giantBalls, gameState) {
    const hasRegularBalls = balls > 0;
    const hasGiantBalls = giantBalls > 0;

    if (gameState === 'aiming' && (hasRegularBalls || hasGiantBalls)) {
        ballSelector.classList.remove('hidden');
        updateBallSelectorArrow();
    } else {
        ballSelector.classList.add('hidden');
    }

    document.querySelectorAll('.ball-select-btn:not([data-ball-type="giant"])').forEach(btn => {
        btn.disabled = !hasRegularBalls;
    });

    const giantBtn = document.querySelector('.ball-select-btn[data-ball-type="giant"]');
    if (giantBtn) {
        const badge = giantBtn.querySelector('.ball-count-badge');
        if (hasGiantBalls) {
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

function updateHeaderUI(level, score, balls, giantBalls, seed, coins, gameState) {
    levelStatEl.textContent = level;
    scoreStatEl.textContent = score;
    ballsStatEl.textContent = balls;
    seedStatEl.textContent = seed;
    coinStatEl.textContent = coins;
    updateBallSelectorUI(balls, giantBalls, gameState);
}

function animateCoinParticles(startX, startY, count) {
    const targetRect = coinBankEl.getBoundingClientRect();
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

function updateShopUI() {
    if (!p5Instance) return;
    const coins = p5Instance.getCoins();
    shopCoinCount.textContent = coins;
    currentBallCost = shopParams.buyBall.baseCost + ballPurchaseCount * shopParams.buyBall.increment;
    buyBallButton.textContent = `${currentBallCost} 🪙`;
    buyBallButton.disabled = coins < currentBallCost;
    const upgradeData = { ballHp: { name: "Ball Max HP" }, aimLength: { name: "Aim Length" }, powerExplosionDamage: { name: "Explosive Ball's Explosion Damage" }, piercingBonusDamage: { name: "Piercing Ball's Bonus Ability Damage" }, splitDamage: { name: "Split Ball's Mini Damage" }, brickCoinChance: { name: "Brick Ball's Coin Brick Percentage", isPercent: true }, };
    upgradesGrid.innerHTML = '';
    for (const key in upgradeState) {
        const { level } = upgradeState[key];
        const { baseCost, value, baseValue } = shopParams[key];
        const cost = Math.floor(baseCost * Math.pow(shopParams.costIncrementRate, level - 1));
        const currentVal = baseValue + (level - 1) * value;
        const isPercent = upgradeData[key].isPercent;
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `<div><div class="upgrade-card-header">${upgradeData[key].name}</div><div class="upgrade-card-level">LVL ${level}</div><div class="upgrade-card-stat">${currentVal}${isPercent ? '%' : ''} <span class="next-value">(+${value}${isPercent ? '%' : ''})</span></div></div><button class="upgrade-cost-button" data-upgrade-key="${key}" ${coins < cost ? 'disabled' : ''}>${cost} 🪙</button>`;
        upgradesGrid.appendChild(card);
    }
    document.querySelectorAll('.upgrade-cost-button[data-upgrade-key]').forEach(button => {
        button.onclick = () => handleUpgrade(button.dataset.upgradeKey);
    });
}

function applyAllUpgrades() {
    upgradeableStats.ballMaxHp = shopParams.ballHp.baseValue + (upgradeState.ballHp.level - 1) * shopParams.ballHp.value;
    upgradeableStats.aimLength = shopParams.aimLength.baseValue + (upgradeState.aimLength.level - 1) * shopParams.aimLength.value;
    upgradeableStats.powerExplosionDamage = shopParams.powerExplosionDamage.baseValue + (upgradeState.powerExplosionDamage.level - 1) * shopParams.powerExplosionDamage.value;
    upgradeableStats.piercingContactCount = 5; // Fixed value since upgrade is removed
    upgradeableStats.piercingBonusDamage = shopParams.piercingBonusDamage.baseValue + (upgradeState.piercingBonusDamage.level - 1) * shopParams.piercingBonusDamage.value;
    upgradeableStats.splitMiniBallDamage = shopParams.splitDamage.baseValue + (upgradeState.splitDamage.level - 1) * shopParams.splitDamage.value;
    upgradeableStats.brickSummonCoinChance = (shopParams.brickCoinChance.baseValue + (upgradeState.brickCoinChance.level - 1) * shopParams.brickCoinChance.value) / 100;
}

function handleUpgrade(upgradeKey) {
    if (!p5Instance) return;
    const coins = p5Instance.getCoins();
    const upgrade = upgradeState[upgradeKey];
    const cost = Math.floor(shopParams[upgradeKey].baseCost * Math.pow(shopParams.costIncrementRate, upgrade.level - 1));
    if (coins >= cost) { p5Instance.setCoins(coins - cost); upgrade.level++; applyAllUpgrades(); updateShopUI(); }
}

function initialize() {
    pauseResumeBtn.addEventListener('click', () => { if (!p5Instance) return; if (isRunning) { p5Instance.noLoop(); isRunning = false; pauseResumeBtn.textContent = 'Resume'; } else { p5Instance.loop(); isRunning = true; pauseResumeBtn.textContent = 'Pause'; } });
    speedToggleBtn.addEventListener('click', () => { if (!p5Instance || speedToggleBtn.disabled) return; const spedUp = p5Instance.toggleSpeed(); if (spedUp) { speedToggleBtn.textContent = 'Speed Down'; speedToggleBtn.classList.add('speed-active'); } else { speedToggleBtn.textContent = 'Speed Up'; speedToggleBtn.classList.remove('speed-active'); } });
    prevLevelBtn.addEventListener('click', () => { if (p5Instance) p5Instance.prevLevel(); });
    nextLevelBtn.addEventListener('click', () => { if (p5Instance) p5Instance.nextLevel(); });
    clearBtn.addEventListener('click', () => { const settings = getLevelSettings(); if (p5Instance) p5Instance.resetGame(settings); isSpedUp = false; speedToggleBtn.textContent = 'Speed Up'; speedToggleBtn.classList.remove('speed-active'); });
    levelSettingsButton.addEventListener('click', () => { if (p5Instance) p5Instance.isModalOpen = true; settingsModal.classList.remove('hidden'); });
    closeSettingsBtn.addEventListener('click', () => { if (p5Instance) p5Instance.isModalOpen = false; settingsModal.classList.add('hidden'); });
    coinBankEl.addEventListener('click', () => { if (!p5Instance) return; p5Instance.isModalOpen = true; updateShopUI(); shopModal.classList.remove('hidden'); });
    closeShopBtn.addEventListener('click', () => { if (p5Instance) p5Instance.isModalOpen = false; shopModal.classList.add('hidden'); });
    shopBalancingButton.addEventListener('click', () => { shopParamInputs.ballFirstCost.value = shopParams.buyBall.baseCost; shopParamInputs.ballCostIncrement.value = shopParams.buyBall.increment; shopParamInputs.costIncrementRate.value = shopParams.costIncrementRate; for(const key in shopParams) { if (key === 'buyBall' || key === 'costIncrementRate') continue; shopParamInputs[`${key}BaseCost`].value = shopParams[key].baseCost; shopParamInputs[`${key}BaseValue`].value = shopParams[key].baseValue; shopParamInputs[`${key}Value`].value = shopParams[key].value; } shopBalancingModal.classList.remove('hidden'); });
    closeShopBalancingBtn.addEventListener('click', () => shopBalancingModal.classList.add('hidden'));
    applyShopSettingsButton.addEventListener('click', () => { shopParams.buyBall.baseCost = parseInt(shopParamInputs.ballFirstCost.value, 10); shopParams.buyBall.increment = parseInt(shopParamInputs.ballCostIncrement.value, 10); shopParams.costIncrementRate = parseFloat(shopParamInputs.costIncrementRate.value); for(const key in shopParams) { if (key === 'buyBall' || key === 'costIncrementRate') continue; shopParams[key].baseCost = parseFloat(shopParamInputs[`${key}BaseCost`].value); shopParams[key].baseValue = parseFloat(shopParamInputs[`${key}BaseValue`].value); shopParams[key].value = parseFloat(shopParamInputs[`${key}Value`].value); } applyAllUpgrades(); shopBalancingModal.classList.add('hidden'); updateShopUI(); });
    window.addEventListener('click', (e) => { if (e.target === settingsModal) { if (p5Instance) p5Instance.isModalOpen = false; settingsModal.classList.add('hidden'); } if (e.target === shopModal) { if (p5Instance) p5Instance.isModalOpen = false; shopModal.classList.add('hidden'); } if (e.target === shopBalancingModal) { shopBalancingModal.classList.add('hidden'); } });
    ballSpeedInput.addEventListener('input', () => ballSpeedValue.textContent = parseFloat(ballSpeedInput.value).toFixed(1));
    explosiveBrickChanceInput.addEventListener('input', () => explosiveBrickChanceValue.textContent = parseFloat(explosiveBrickChanceInput.value).toFixed(2));
    fewBrickLayoutChanceInput.addEventListener('input', () => fewBrickLayoutChanceValue.textContent = parseFloat(fewBrickLayoutChanceInput.value).toFixed(2));
    generateLevelBtn.addEventListener('click', () => { if (p5Instance) { p5Instance.resetGame(getLevelSettings()); p5Instance.isModalOpen = false; } settingsModal.classList.add('hidden'); isSpedUp = false; speedToggleBtn.textContent = 'Speed Up'; speedToggleBtn.classList.remove('speed-active'); });
    buyBallButton.addEventListener('click', () => { if (p5Instance && p5Instance.getCoins() >= currentBallCost) { p5Instance.setCoins(p5Instance.getCoins() - currentBallCost); p5Instance.addBall(); updateShopUI(); } });
    cheatCoinBtn.addEventListener('click', () => { if (p5Instance) { p5Instance.setCoins(p5Instance.getCoins() + 1000); updateShopUI(); } });
    document.querySelectorAll('.ball-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent clicks from passing through to the canvas
            if (btn.disabled) return;
            if (document.querySelector('.ball-select-btn.active')) {
                document.querySelector('.ball-select-btn.active').classList.remove('active');
            }
            btn.classList.add('active');
            selectedBallType = btn.dataset.ballType;
            if (p5Instance) p5Instance.changeBallType(selectedBallType);
            updateBallSelectorArrow();
        });
    });
    
    applyAllUpgrades();
    runCode();
}

document.addEventListener('DOMContentLoaded', initialize);