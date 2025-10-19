// sketch.js - The core p5.js game logic

import { UNLOCK_LEVELS, GRID_CONSTANTS, XP_SETTINGS, AIMING_SETTINGS, INITIAL_UPGRADE_STATE } from './balancing.js';
import { Ball, MiniBall, HomingProjectile, createBallVisuals } from './ball.js';
import { Brick } from './brick.js';
import { generateLevel } from './levelgen.js';
import { sounds } from './sfx.js';
import { Particle, Shockwave, FloatingText, PowerupVFX, StripeFlash, createSplat, createBrickHitVFX, createBallDeathVFX, XpOrb } from './vfx.js';
import * as ui from './ui.js';
import { processComboRewards } from './combo.js';
import { processBrickOverlays } from './brickOverlay.js';
import { applyAllUpgrades } from './state.js';

export const sketch = (p, state) => {
    // Game state variables
    let ballsInPlay = [];
    let sharedBallStats = {}; // Holds HP, uses, etc., for all active balls in a turn
    let bricks = [[]]; // Now a 2D matrix
    let miniBalls = [];
    let projectiles = [];
    let ghostBalls = [];
    let ballsLeft = 5, level = 1, coins = 0, giantBallCount = 0;
    let combo = 0, maxComboThisTurn = 0;
    let isGiantBallTurn = false;
    let gameState = 'aiming'; // aiming, playing, levelClearing, levelComplete, gameOver
    let currentSeed;
    let levelHpPool = 0, levelCoinPool = 0, levelHpPoolSpent = 0;
    
    // XP & Progression
    let xpOrbs = [];
    let orbsCollectedThisTurn = 0;
    let xpCollectPitchResetTimer = 0;
    
    // Per-level stats for the result screen
    let levelStats = {};

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
    let ghostBallCooldown = 0;
    
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
        
        p.resetGame(ui.getLevelSettings());
    };

    p.draw = () => {
        const timeMultiplier = state.isSpedUp ? 2 : 1;
        
        for (let i = 0; i < timeMultiplier; i++) {
            gameLoop(i === timeMultiplier - 1, timeMultiplier);
        }
    };
    
    function gameLoop(shouldRender, timeMultiplier) {
        // --- END TURN LOGIC ---
        if ((gameState === 'playing' || gameState === 'levelClearing') && ballsInPlay.length === 0 && miniBalls.length === 0 && projectiles.length === 0) {
            handleEndTurnEffects();
            if (gameState === 'levelClearing') {
                gameState = 'levelComplete';
            } else {
                gameState = 'aiming';
            }
        }

        // --- UPDATE LOGIC ---
        let debugStats = null;
        if (state.isDebugView) {
            let currentHp = 0, currentCoins = 0, totalMaxHp = 0, totalMaxCoins = 0;
            const uniqueBricks = new Set();
            for(let c=0; c<board.cols; c++) for(let r=0; r<board.rows; r++) if(bricks[c][r]) uniqueBricks.add(bricks[c][r]);
            uniqueBricks.forEach(b => { 
                currentHp += b.health; 
                currentCoins += b.coins;
                totalMaxHp += b.maxHealth;
                totalMaxCoins += b.maxCoins;
            });
            debugStats = { currentHp, hpPool: levelHpPool, currentCoins, coinPool: levelCoinPool, totalMaxHp, totalMaxCoins, hpPoolSpent: levelHpPoolSpent };
        }
        ui.updateHeaderUI(level, state.mainLevel, ballsLeft, giantBallCount, currentSeed, coins, gameState, debugStats);
        
        ui.updateProgressionUI(state.mainLevel, state.currentXp, state.xpForNextLevel, state.pendingXp);
        
        if (xpCollectPitchResetTimer > 0) {
            xpCollectPitchResetTimer -= timeMultiplier;
        } else if (orbsCollectedThisTurn > 0) {
            orbsCollectedThisTurn = 0;
        }

        if (gameState === 'aiming' && ballsInPlay.length === 0) {
            let canUseRegular = ballsLeft > 0;
            const canUseGiant = giantBallCount > 0 && state.mainLevel >= UNLOCK_LEVELS.GIANT_BONUS;
            
            // Auto-select giant ball if out of regular balls
            if (!canUseRegular && canUseGiant && state.selectedBallType !== 'giant') {
                state.selectedBallType = 'giant';
                document.querySelector('.ball-select-btn.active')?.classList.remove('active');
                const giantBtn = document.querySelector('.ball-select-btn[data-ball-type="giant"]');
                if (giantBtn) giantBtn.classList.add('active');
                ui.updateBallSelectorArrow();
            }


            if (!canUseRegular && !canUseGiant) {
                // No balls left, try to auto-buy
                state.currentBallCost = state.shopParams.buyBall.baseCost + state.ballPurchaseCount * state.shopParams.buyBall.increment;
                if (state.mainLevel >= UNLOCK_LEVELS.SHOP_BUY_BALL && coins >= state.currentBallCost) {
                    // Auto-buy successful
                    coins -= state.currentBallCost;
                    ballsLeft++;
                    state.ballPurchaseCount++;
                    canUseRegular = true; // Update for ball creation below
                    sounds.ballGained();
                    floatingTexts.push(new FloatingText(p, board.x + board.width / 2, board.y + board.height / 2, "Auto-bought a ball!", p.color(255, 223, 0), { size: 20, isBold: true, lifespan: 120 }));
                } else {
                    // Can't buy, game over
                    gameState = 'gameOver';
                }
            }
            
            if (gameState !== 'gameOver') {
                canUseRegular = ballsLeft > 0;
                const canUseGiantAfterCheck = giantBallCount > 0 && state.mainLevel >= UNLOCK_LEVELS.GIANT_BONUS;

                if (state.selectedBallType === 'giant' && !canUseGiantAfterCheck) {
                    state.selectedBallType = 'classic';
                    document.querySelector('.ball-select-btn.active')?.classList.remove('active');
                    const firstRegularBtn = document.querySelector('.ball-select-btn[data-ball-type="classic"]');
                    firstRegularBtn.classList.add('active');
                    ui.updateBallSelectorArrow();
                }

                if (canUseRegular || canUseGiantAfterCheck) {
                    const ballType = (state.selectedBallType === 'giant' && canUseGiantAfterCheck) ? 'giant' : state.selectedBallType;
                    const newBall = new Ball(p, board.x + board.width / 2, board.y + board.height - board.border, ballType, board.gridUnitSize, state.upgradeableStats);
                    ballsInPlay.push(newBall);
                    sharedBallStats = {
                        hp: newBall.hp,
                        maxHp: newBall.maxHp,
                        uses: newBall.powerUpUses,
                        maxUses: newBall.powerUpMaxUses,
                        flashTime: 0
                    };
                }
            }
        }
        
        if ((gameState === 'playing' || gameState === 'levelClearing') && ballsInPlay.length > 0) {
            for (let i = ballsInPlay.length - 1; i >= 0; i--) {
                const ball = ballsInPlay[i];
                const events = ball.update(board, (b) => circleRectCollision(b));
                if (events.length > 0) processEvents(events);
                if (ball.isDead) {
                    ballsInPlay.splice(i, 1);
                }
            }
        }

        for (let i = ghostBalls.length - 1; i >= 0; i--) {
            const gb = ghostBalls[i];
            gb.update(board, (b) => circleRectCollision(b));
            if (gb.isDead) {
                ghostBalls.splice(i, 1);
            }
        }

        for (let i = miniBalls.length - 1; i >= 0; i--) {
            const mb = miniBalls[i];
            const events = mb.update(board, ballsInPlay[0], (b) => circleRectCollision(b));
            if (events.length > 0) processEvents(events);
            if (mb.isDead) {
                for(let k=0; k<10; k++) { particles.push(new Particle(p, mb.pos.x, mb.pos.y, p.color(127, 255, 212), 2, {lifespan: 40})); }
                miniBalls.splice(i, 1);
            }
        }

        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            if (!proj) { // Defensive check to prevent crash
                projectiles.splice(i, 1);
                continue;
            }
            const projEvent = proj.update(board, bricks);
            if (projEvent) {
                if (projEvent.type === 'homing_explode') {
                    const explosionEvents = explode(projEvent.pos, projEvent.radius, projEvent.damage, 'chain-reaction');
                    processEvents(explosionEvents);
                } else {
                    processEvents([projEvent]);
                }
            }
            if (proj.isDead) {
                projectiles.splice(i, 1);
            }
        }

        if (shakeDuration > 0) {
            shakeDuration -= timeMultiplier;
            if (shakeDuration <= 0) shakeAmount = 0;
        }
         if (sharedBallStats.flashTime > 0) sharedBallStats.flashTime--;

        // --- XP Orb Logic ---
        const attractors = [...ballsInPlay, ...miniBalls];

        for (let i = xpOrbs.length - 1; i >= 0; i--) {
            const orb = xpOrbs[i];
            orb.update(attractors, timeMultiplier);

            if (orb.isFinished()) {
                xpOrbs.splice(i, 1);
                continue;
            }
            
            for (const attractor of attractors) {
                const distToAttractor = p.dist(orb.pos.x, orb.pos.y, attractor.pos.x, attractor.pos.y);
                const collectionRadius = attractor.radius;

                if (orb.cooldown <= 0 && orb.state !== 'collecting' && distToAttractor < collectionRadius) {
                    orb.collect();
                    const xpFromOrb = XP_SETTINGS.xpPerOrb * (1 + state.upgradeableStats.bonusXp);
                    state.pendingXp += xpFromOrb;
                    if (levelStats.xpCollected !== undefined) levelStats.xpCollected += xpFromOrb;
                    orbsCollectedThisTurn++;
                    xpCollectPitchResetTimer = 30;
                    sounds.orbCollect(orbsCollectedThisTurn);
                    const playerLevelBadgeEl = document.getElementById('player-level-badge');
                    if (playerLevelBadgeEl) {
                        playerLevelBadgeEl.classList.add('flash');
                        setTimeout(() => playerLevelBadgeEl.classList.remove('flash'), 150);
                    }
                    break; 
                }
            }
        }
        
        // VFX updates
        [particles, shockwaves, floatingTexts, powerupVFXs, stripeFlashes].forEach(vfxArray => {
            for (let i = vfxArray.length - 1; i >= 0; i--) {
                const vfx = vfxArray[i];
                if (!vfx) {
                    vfxArray.splice(i, 1);
                    continue;
                }
                vfx.update(); 
                if (vfx.isFinished()) vfxArray.splice(i, 1); 
            }
        });
        
        // --- RENDER LOGIC ---
        if (!shouldRender) return;

        p.background(40, 45, 55);
        p.fill(20, 20, 30);
        p.noStroke();
        p.rect(board.x, board.y, board.width, board.height);
        p.push();
        p.clip(() => { p.rect(board.x, board.y, board.width, board.height); });
        p.image(splatBuffer, 0, 0);
        p.pop();
        p.push();
        if (shakeDuration > 0) {
            const offsetX = p.random(-shakeAmount, shakeAmount);
            const offsetY = p.random(-shakeAmount, shakeAmount);
            p.translate(offsetX, offsetY);
        }

        if (gameState === 'aiming' && isAiming && ballsInPlay.length > 0) {
            const ball = ballsInPlay[0];
            previewTrajectory(ball.pos, p.constructor.Vector.sub(endAimPos, ball.pos));
            const cancelRadius = ball.radius * AIMING_SETTINGS.AIM_CANCEL_RADIUS_MULTIPLIER;
            if (p.dist(endAimPos.x, endAimPos.y, ball.pos.x, ball.pos.y) < cancelRadius) {
                p.fill(255, 0, 0, 100); p.noStroke(); p.ellipse(ball.pos.x, ball.pos.y, cancelRadius * 2);
                p.fill(255); p.textAlign(p.CENTER, p.CENTER); p.textSize(12); p.text('Cancel', ball.pos.x, ball.pos.y);
            }

            ghostBallCooldown--;
            if (ghostBallCooldown <= 0) {
                ghostBallCooldown = AIMING_SETTINGS.GHOST_BALL_COOLDOWN;
                const aimDir = p.constructor.Vector.sub(endAimPos, ball.pos);
                if (aimDir.magSq() > 1 && p.dist(endAimPos.x, endAimPos.y, ball.pos.x, ball.pos.y) >= cancelRadius) {
                    const lifetime = state.upgradeableStats.aimLength;
                    const newGhostBall = new Ball(p, ball.pos.x, ball.pos.y, state.selectedBallType, board.gridUnitSize, state.upgradeableStats, { isGhost: true, lifetimeInSeconds: lifetime });
                    
                    const normalBallSpeed = (board.gridUnitSize * 0.5) * state.originalBallSpeed;
                    const ghostBallSpeed = normalBallSpeed * AIMING_SETTINGS.GHOST_BALL_SPEED_MULTIPLIER;

                    let ghostVel = aimDir.normalize().mult(ghostBallSpeed);
                    newGhostBall.vel = ghostVel;
                    newGhostBall.isMoving = true;
                    ghostBalls.push(newGhostBall);
                }
            }
        }
        
        // RENDER ORDER
        const drawnBricks = new Set();
        for (let c = 0; c < board.cols; c++) {
            for (let r = 0; r < board.rows; r++) {
                const brick = bricks[c][r];
                if (brick && !drawnBricks.has(brick)) {
                    brick.draw(board);
                    drawnBricks.add(brick);
                }
            }
        }
        ballsInPlay.forEach(b => { b.flashTime = sharedBallStats.flashTime; b.draw(); });
        ghostBalls.forEach(gb => gb.draw());
        miniBalls.forEach(mb => mb.draw());
        projectiles.forEach(proj => proj.draw());
        xpOrbs.forEach(orb => orb.draw());
        
        const drawnOverlays = new Set();
        for (let c = 0; c < board.cols; c++) {
            for (let r = 0; r < board.rows; r++) {
                const brick = bricks[c][r];
                if (brick && !drawnOverlays.has(brick)) {
                    brick.drawOverlays(board);
                    drawnOverlays.add(brick);
                }
            }
        }

        [particles, shockwaves, floatingTexts, powerupVFXs, stripeFlashes].forEach(vfxArray => vfxArray.forEach(v => v.draw()));
        
        drawInGameUI();
        p.pop(); // End camera shake

        handleGameStates();
    }
    
    // --- EXPOSED CONTROL FUNCTIONS ---
    p.resetGame = (settings) => {
        p.setBallSpeedMultiplier(settings.ballSpeed);
        level = 1; 
        coins = 0; 
        giantBallCount = 0; 
        combo = 0; 
        maxComboThisTurn = 0;
        isGiantBallTurn = false; 
        state.ballPurchaseCount = 0;
        state.upgradeState = JSON.parse(JSON.stringify(INITIAL_UPGRADE_STATE));
        applyAllUpgrades();

        let baseBalls = 3;
        if (state.mainLevel >= UNLOCK_LEVELS.EXTRA_BALL_2) baseBalls++;
        ballsLeft = baseBalls;
        
        splatBuffer.clear();
        p.runLevelGeneration(settings);
    };
    p.nextLevel = () => { level++; p.runLevelGeneration(ui.getLevelSettings()); };
    p.prevLevel = () => { if (level > 1) { level--; p.runLevelGeneration(ui.getLevelSettings()); } };
    p.runLevelGeneration = (settings) => {
        const result = generateLevel(p, settings, level, board);
        bricks = result.bricks;
        currentSeed = result.seed;
        levelHpPool = result.hpPool;
        levelHpPoolSpent = result.hpPoolSpent;
        levelCoinPool = result.coinPool;
        ballsInPlay = [];
        miniBalls = [];
        projectiles = [];
        ghostBalls = [];
        xpOrbs = [];
        gameState = 'aiming';
        levelCompleteSoundPlayed = false; gameOverSoundPlayed = false;
        combo = 0; maxComboThisTurn = 0; isGiantBallTurn = false;
        orbsCollectedThisTurn = 0;
        xpCollectPitchResetTimer = 0;
        
        levelStats = {
            ballsUsed: 0,
            totalDamage: 0,
            maxDamageInTurn: 0,
            damageThisTurn: 0,
            coinsCollected: 0,
            xpCollected: 0,
        };
    }
    p.spawnXpOrbs = (count, pos) => {
        for (let i = 0; i < count; i++) {
            xpOrbs.push(new XpOrb(p, pos.x, pos.y));
        }
    };
    p.setBallSpeedMultiplier = (multiplier) => {
        state.originalBallSpeed = multiplier; 
        if (!board.gridUnitSize) return;
        const baseSpeed = (board.gridUnitSize * 0.5) * state.originalBallSpeed * (state.isSpedUp ? 2.0 : 1.0);
        ballsInPlay.forEach(b => { if (b.isMoving) b.vel.setMag(baseSpeed); });
        miniBalls.forEach(mb => mb.vel.setMag(baseSpeed)); 
    };
    p.getBallSpeedMultiplier = () => state.originalBallSpeed;
    p.addBall = () => { ballsLeft++; state.ballPurchaseCount++; };
    p.getCoins = () => coins;
    p.setCoins = (newCoins) => { coins = newCoins; };
    p.changeBallType = (newType) => {
        if (gameState === 'aiming' && ballsInPlay.length > 0) {
            const oldPos = ballsInPlay[0].pos.copy();
            const newBall = new Ball(p, oldPos.x, oldPos.y, newType, board.gridUnitSize, state.upgradeableStats);
            ballsInPlay[0] = newBall;
            
            // Re-initialize shared stats for the new ball type
            sharedBallStats = {
                hp: newBall.hp,
                maxHp: newBall.maxHp,
                uses: newBall.powerUpUses,
                maxUses: newBall.powerUpMaxUses,
                flashTime: 0
            };
        }
    };
    p.toggleSpeed = () => { 
        state.isSpedUp = !state.isSpedUp; 
        p.setBallSpeedMultiplier(state.originalBallSpeed);
        return state.isSpedUp; 
    };
    p.getGameState = () => gameState;
    p.addGiantBall = () => { giantBallCount++; };
    p.forceEndTurn = () => {
        if (gameState === 'playing' || gameState === 'levelClearing') {
            ballsInPlay = [];
            miniBalls = [];
            projectiles = [];
        }
    };
    
    // --- EVENT & LOGIC PROCESSING ---
    function processEvents(initialEvents) {
        let eventQueue = [...initialEvents];
        while (eventQueue.length > 0) {
            const event = eventQueue.shift();
            if (!event) continue;
            switch (event.type) {
                case 'damage_taken':
                    if (event.source !== 'echo') {
                        sharedBallStats.hp = Math.max(0, sharedBallStats.hp - event.damageAmount);
                        sharedBallStats.flashTime = 8;
                    }
                    if (event.source === 'wall') {
                        sounds.wallHit();
                        if (!isGiantBallTurn && combo > 0) { sounds.comboReset(); combo = 0; }
                    } else if (event.source === 'miniball_wall') {
                        sounds.wallHit();
                    }
                    
                    if (sharedBallStats.hp <= 0 && ballsInPlay.length > 0 && !ballsInPlay[0].isDying) {
                        for (const ball of ballsInPlay) {
                            ball.isDying = true;
                        }
                        
                        if (ballsInPlay[0].type === 'split') {
                            miniBalls.forEach(mb => mb.mainBallIsDead = true);
                        }
                        
                        isGiantBallTurn = false;

                        if (state.isSpedUp) {
                            state.isSpedUp = false;
                            document.getElementById('speedToggleBtn').textContent = 'Speed Up';
                            document.getElementById('speedToggleBtn').classList.remove('speed-active');
                        }
                    }
                    break;
                case 'brick_hit':
                    levelStats.totalDamage += event.damageDealt;
                    levelStats.damageThisTurn += event.damageDealt;
                    if(event.coinsDropped > 0) {
                        coins += event.coinsDropped; 
                        levelStats.coinsCollected += event.coinsDropped;
                        sounds.coin(); 
                        floatingTexts.push(new FloatingText(p, event.center.x, event.center.y, `+${event.coinsDropped}`, p.color(255, 223, 0)));
                        const canvasRect = p.canvas.getBoundingClientRect(); ui.animateCoinParticles(canvasRect.left + event.center.x, canvasRect.top + event.center.y, event.coinsDropped);
                    }
                    particles.push(...createBrickHitVFX(p, event.center.x, event.center.y, event.color));
                    sounds.brickHit(p, event.totalLayers);
                    triggerShake(2, 5);
                    if (event.source instanceof Object) {
                        handleCombo();
                        // Dying ball state exception
                        if ((event.source.type === 'piercing' || event.source.type === 'giant') && event.source.isDying) {
                            event.source.isDead = true;
                            particles.push(...createBallDeathVFX(p, event.source.pos.x, event.source.pos.y));
                            sounds.ballDeath();
                        }
                    }
                    if(event.isBroken) {
                        sounds.brickBreak();
                        particles.push(...createBrickHitVFX(p, event.center.x, event.center.y, event.color));
                        if (event.source !== 'chain-reaction' && event.source !== 'replaced') handleCombo('break', event.center);
                    }
                    if (event.events && event.events.length > 0) eventQueue.push(...event.events);
                    break;
                 case 'explode_mine':
                    eventQueue.push(...explode(event.pos, board.gridUnitSize * 2, 10, 'mine'));
                    break;
                 case 'dying_ball_death':
                    particles.push(...createBallDeathVFX(p, event.pos.x, event.pos.y));
                    sounds.ballDeath();
                    break;
            }
        }
        processBrokenBricks(initialEvents.find(e => e.type === 'brick_hit'));
    }

    function triggerShake(amount, duration) { shakeAmount = Math.max(shakeAmount, amount); shakeDuration = Math.max(shakeDuration, duration); }
    
    function explode(pos, radius, damage, source = 'ball') {
        const vfxRadius = radius * 0.8;
        shockwaves.push(new Shockwave(p, pos.x, pos.y, vfxRadius, p.color(255, 100, 0), 15));
        const explosionColor = p.color(255, 100, 0);
        for (let i = 0; i < 50; i++) particles.push(new Particle(p, pos.x, pos.y, explosionColor, p.random(5, 15), { lifespan: 60, size: p.random(3, 6) }));
        sounds.explosion();
        triggerShake(4, 12);
        
        const hitBricks = new Set();
        let hitEvents = [];

        const minC = Math.max(0, Math.floor((pos.x - radius - board.genX) / board.gridUnitSize));
        const maxC = Math.min(board.cols - 1, Math.floor((pos.x + radius - board.genX) / board.gridUnitSize));
        const minR = Math.max(0, Math.floor((pos.y - radius - board.genY) / board.gridUnitSize));
        const maxR = Math.min(board.rows - 1, Math.floor((pos.y + radius - board.genY) / board.gridUnitSize));

        for (let c = minC; c <= maxC; c++) {
            for (let r = minR; r <= maxR; r++) {
                const brick = bricks[c][r];
                if (brick && !hitBricks.has(brick)) {
                    const brickPos = brick.getPixelPos(board);
                    const brickWidth = brick.size * brick.widthInCells;
                    const brickHeight = brick.size * brick.heightInCells;

                    // Accurate Circle-Rectangle collision test
                    let testX = pos.x;
                    let testY = pos.y;
                    if (pos.x < brickPos.x) testX = brickPos.x;
                    else if (pos.x > brickPos.x + brickWidth) testX = brickPos.x + brickWidth;
                    if (pos.y < brickPos.y) testY = brickPos.y;
                    else if (pos.y > brickPos.y + brickHeight) testY = brickPos.y + brickHeight;

                    const distX = pos.x - testX;
                    const distY = pos.y - testY;
                    const distanceSq = (distX * distX) + (distY * distY);

                    if (distanceSq <= radius * radius) {
                        hitBricks.add(brick); // Add to set to prevent hitting the same brick multiple times
                        const hitResult = brick.hit(damage, source, board);
                        if (hitResult) {
                            hitEvents.push({ type: 'brick_hit', ...hitResult, source });
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
                    if (hitResult) hitEvents.push({ type: 'brick_hit', ...hitResult, source: 'chain-reaction' });
                }
            }
        } else { // Vertical
            for (let r = 0; r < board.rows; r++) {
                 const b = bricks[gridC][r];
                 if (b) {
                    const hitResult = b.hit(30, 'chain-reaction', board);
                    if (hitResult) hitEvents.push({ type: 'brick_hit', ...hitResult, source: 'chain-reaction' });
                 }
            }
        }
        return hitEvents;
    }

    function handleCombo(type, pos) { 
        if (isGiantBallTurn || state.mainLevel < UNLOCK_LEVELS.COMBO_MINES) return; 
        combo++; 
        maxComboThisTurn = p.max(maxComboThisTurn, combo); 
        if (type === 'break' && pos) {
            const comboColor = p.lerpColor(p.color(255,255,0), p.color(255,0,0), p.min(1, combo/50));
            floatingTexts.push(new FloatingText(p, pos.x, pos.y, `${combo}`, comboColor, { size: 10 + p.min(8, combo / 5), lifespan: 50, isBold: true }));
        }
    }

    function processBrokenBricks(lastBrickHitEvent) {
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
                        const centerVec = p.createVector(
                            brickPos.x + (brick.size * brick.widthInCells) / 2,
                            brickPos.y + (brick.size * brick.heightInCells) / 2
                        );
                        
                        const orbsToSpawn = Math.floor(brick.maxHealth / XP_SETTINGS.xpPerOrb);
                        p.spawnXpOrbs(orbsToSpawn, centerVec);

                        switch (brick.type) {
                            case 'extraBall': ballsLeft++; sounds.ballGained(); floatingTexts.push(new FloatingText(p, centerVec.x, centerVec.y, "+1 Ball", p.color(0, 255, 127))); break;
                            case 'explosive': newEvents.push(...explode(centerVec, board.gridUnitSize * 3, state.upgradeableStats.powerExplosionDamage, 'chain-reaction')); break;
                            case 'horizontalStripe': newEvents.push(...clearStripe(brick, 'horizontal')); break;
                            case 'verticalStripe': newEvents.push(...clearStripe(brick, 'vertical')); break;
                            case 'ballCage':
                                if (ballsInPlay.length > 0 && lastBrickHitEvent && lastBrickHitEvent.sourceBallVel) {
                                    const mainBall = ballsInPlay[0];
                                    const newBall = new Ball(p, centerVec.x, centerVec.y, mainBall.type, board.gridUnitSize, state.upgradeableStats);
                                    newBall.vel = lastBrickHitEvent.sourceBallVel.copy();
                                    newBall.isMoving = true;

                                    // Sync clone's state with the shared state
                                    newBall.powerUpUses = sharedBallStats.uses;
                                    newBall.powerUpMaxUses = sharedBallStats.maxUses;
                                    newBall.hp = sharedBallStats.hp;
                                    newBall.maxHp = sharedBallStats.maxHp;

                                    ballsInPlay.push(newBall);
                                    sounds.split();
                                }
                                break;
                        }
                        // Clear all cells occupied by the (potentially merged) brick
                        for(let i=0; i<brick.widthInCells; i++) {
                            for(let j=0; j<brick.heightInCells; j++) {
                                bricks[c+i][r+j] = null;
                            }
                        }
                        chainReaction = true;
                    }
                }
            }
        }
        if (newEvents.length > 0) processEvents(newEvents);
        
        let goalBricksLeft = 0;
        for (let c = 0; c < board.cols; c++) for (let r = 0; r < board.rows; r++) if (bricks[c][r] && bricks[c][r].type === 'goal') goalBricksLeft++;

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
                const brickWidth = brick.size * brick.widthInCells;
                const brickHeight = brick.size * brick.heightInCells;

                if (b.type === 'giant' && !b.isGhost) { 
                    const dist = p.dist(b.pos.x, b.pos.y, brickPos.x + brickWidth/2, brickPos.y + brickHeight/2); 
                    if(dist < b.radius + Math.max(brickWidth, brickHeight)/2 && !b.piercedBricks.has(brick)) { 
                        if (b.isDying) {
                            b.isDead = true;
                            hitEvents.push({ type: 'dying_ball_death', pos: b.pos.copy() });
                            return hitEvents; // Stop processing hits
                        }
                        const hitResult = brick.hit(1000, b, board);
                        if (hitResult) {
                            hitEvents.push({ type: 'brick_hit', ...hitResult });
                            b.damageDealtForHpLoss += hitResult.damageDealt;
                            if (b.damageDealtForHpLoss >= 100) {
                                const hpToLose = Math.floor(b.damageDealtForHpLoss / 100);
                                const damageEvent = b.takeDamage(hpToLose, 'giant_power');
                                if (damageEvent) hitEvents.push(damageEvent);
                                b.damageDealtForHpLoss %= 100;
                            }
                        }
                        b.piercedBricks.add(brick); 
                    } 
                    continue; 
                }
                
                let testX=b.pos.x, testY=b.pos.y; 
                if (b.pos.x < brickPos.x) testX=brickPos.x; else if (b.pos.x > brickPos.x+brickWidth) testX=brickPos.x+brickWidth; 
                if (b.pos.y < brickPos.y) testY=brickPos.y; else if (b.pos.y > brickPos.y+brickHeight) testY=brickPos.y+brickHeight;
                
                const dX=b.pos.x-testX, dY=b.pos.y-testY; 
                if (p.sqrt(dX*dX + dY*dY) <= b.radius) {
                    if (b.isGhost && b.type === 'giant') continue;

                    if (b.type === 'piercing' && b.isPiercing) {
                        if (b.piercedBricks.has(brick)) continue;
                        b.piercedBricks.add(brick);
                        b.piercingContactsLeft--;
                        if (b.piercingContactsLeft <= 0) b.isPiercing = false;
                        continue; 
                    }
                    
                    const isOnCooldown = b.brickHitCooldowns.has(brick);

                    if (!b.isGhost && !isOnCooldown) {
                        let damage = (b instanceof MiniBall) ? state.upgradeableStats.splitMiniBallDamage : 10;
                        if (b.type === 'piercing' && b.stats && b.stats.piercingBonusDamage) damage += b.stats.piercingBonusDamage;
                        const hitResult = brick.hit(damage, b, board);
                        if (hitResult) hitEvents.push({ type: 'brick_hit', ...hitResult });
                        b.brickHitCooldowns.set(brick, 3);
                    }
                    
                    const brickCenterX = brickPos.x + brickWidth / 2;
                    const brickCenterY = brickPos.y + brickHeight / 2;
                    const w = brickWidth / 2;
                    const h = brickHeight / 2;
                    const dx = b.pos.x - brickCenterX;
                    const dy = b.pos.y - brickCenterY;

                    if (Math.abs(dx) / w > Math.abs(dy) / h) {
                        b.vel.x *= -1;
                        b.pos.x = brickCenterX + (w + b.radius) * Math.sign(dx);
                    } else {
                        b.vel.y *= -1;
                        b.pos.y = brickCenterY + (h + b.radius) * Math.sign(dy);
                    }
    
                    if (!b.isGhost && b.type === 'piercing' && !isOnCooldown) {
                        const event = b.takeDamage(2, 'brick');
                        if (event) hitEvents.push(event);
                    }
                    
                    return hitEvents;
                }
            }
        }
        return hitEvents;
    }
    
    // --- UI & EVENT HANDLING ---
    function handleGameStates() { 
        if (gameState==='levelComplete'||gameState==='gameOver') { 
            if (state.isSpedUp) {
                state.isSpedUp = false;
                document.getElementById('speedToggleBtn').textContent = 'Speed Up';
                document.getElementById('speedToggleBtn').classList.remove('speed-active');
            }

            if (gameState === 'levelComplete') {
                if (!levelCompleteSoundPlayed) {
                    sounds.levelComplete();
                    levelCompleteSoundPlayed = true;
                }
                ui.showResultScreen('Level Complete!', false, levelStats);
            } else { // Game Over
                if (!gameOverSoundPlayed) {
                    sounds.gameOver();
                    gameOverSoundPlayed = true;
                }
                ui.showResultScreen('Game Over', true, levelStats);
            }
        } 
    }

    p.mousePressed = (event) => {
        if (p.isModalOpen || event.target !== p.canvas) return;
        
        if (state.isDebugView) {
            const gridC = Math.floor((p.mouseX - board.genX) / board.gridUnitSize);
            const gridR = Math.floor((p.mouseY - board.genY) / board.gridUnitSize);
            if (gridC >= 0 && gridC < board.cols && gridR >= 0 && gridR < board.rows) {
                const brick = bricks[gridC][gridR];
                if (brick) {
                    const hitResult = brick.hit(10, 'debug_click', board);
                    if (hitResult) {
                        processEvents([{ type: 'brick_hit', ...hitResult }]);
                    }
                    return; // Prevent other mouse logic from running
                }
            }
        }
        
        if ((gameState === 'playing' || gameState === 'levelClearing') && ballsInPlay.length > 0) {
            if (sharedBallStats.uses > 0) {
                sharedBallStats.uses--;
                const powerUpTemplate = ballsInPlay[0].usePowerUp(board, true);
                if (!powerUpTemplate) return;

                if (powerUpTemplate.sound) sounds[powerUpTemplate.sound]();

                for (const ball of ballsInPlay) {
                    ball.powerUpUses = sharedBallStats.uses;

                    if (powerUpTemplate.vfx) {
                        powerupVFXs.push(new PowerupVFX(p, ball.pos.x, ball.pos.y));
                    }

                    const effect = ball.usePowerUp(board, true)?.effect;
                    if (effect) {
                        if (effect.type === 'explode') {
                            const explosionEvents = explode(effect.pos, effect.radius, state.upgradeableStats.powerExplosionDamage);
                            processEvents(explosionEvents);
                        }
                        if (effect.type === 'spawn_miniballs') miniBalls.push(...effect.miniballs);
                        if (effect.type === 'spawn_bricks') handleBrickSpawnPowerup(effect);
                        if (effect.type === 'spawn_projectiles') projectiles.push(...effect.projectiles);
                        if (effect.type === 'spawn_homing_projectile') {
                            let targetBrick = null; let min_dist_sq = Infinity;
                            for (let c = 0; c < board.cols; c++) for (let r = 0; r < board.rows; r++) { const b = bricks[c][r]; if (b && b.type === 'goal') { const bp = b.getPixelPos(board), d_sq = p.pow(ball.pos.x - (bp.x + b.size / 2), 2) + p.pow(ball.pos.y - (bp.y + b.size / 2), 2); if (d_sq < min_dist_sq) { min_dist_sq = d_sq; targetBrick = b; } } }
                            if (!targetBrick) { min_dist_sq = Infinity; for (let c = 0; c < board.cols; c++) for (let r = 0; r < board.rows; r++) { const b = bricks[c][r]; if (b) { const bp = b.getPixelPos(board), d_sq = p.pow(ball.pos.x - (bp.x + b.size / 2), 2) + p.pow(ball.pos.y - (bp.y + b.size / 2), 2); if (d_sq < min_dist_sq) { min_dist_sq = d_sq; targetBrick = b; } } } }
                            if (targetBrick) projectiles.push(new HomingProjectile(p, ball.pos.copy(), ball.vel.copy().setMag(1), 10, targetBrick));
                        }
                    }
                }
            }
            return;
        }
        if (gameState === 'levelClearing') return;
        if (gameState === 'aiming' && ballsInPlay.length > 0) { 
            const ball = ballsInPlay[0];
            const clickInBoard = p.mouseY > board.y && p.mouseY < board.y + board.height && p.mouseX > board.x && p.mouseX < board.x + board.width;
            if (clickInBoard) { 
                isAiming = true; 
                endAimPos = p.createVector(p.mouseX, p.mouseY); 
                let distTop=p.abs(p.mouseY-board.y),distBottom=p.abs(p.mouseY-(board.y+board.height)),distLeft=p.abs(p.mouseX-board.x),distRight=p.abs(p.mouseX-(board.x+board.width)); 
                let minDist=p.min(distTop,distBottom,distLeft,distRight); 
                let shootX,shootY; 
                if(minDist===distTop){shootX=p.mouseX;shootY=board.y+board.border/2+ball.radius;} else if(minDist===distBottom){shootX=p.mouseX;shootY=board.y+board.height-board.border/2-ball.radius;} else if(minDist===distLeft){shootX=board.x+board.border/2+ball.radius;shootY=p.mouseY;} else {shootX=board.x+board.width-board.border/2-ball.radius;shootY=p.mouseY;} 
                ball.pos.set(shootX, shootY); 
            }
        }
    };
    p.mouseDragged = () => { if (isAiming && ballsInPlay.length > 0) endAimPos.set(p.mouseX, p.mouseY); };
    p.mouseReleased = () => { 
        if (isAiming && ballsInPlay.length > 0) { 
            const ball = ballsInPlay[0];
            ghostBalls = [];
            const cancelRadius = ball.radius * AIMING_SETTINGS.AIM_CANCEL_RADIUS_MULTIPLIER; 
            if (p.dist(endAimPos.x, endAimPos.y, ball.pos.x, ball.pos.y) < cancelRadius) { isAiming = false; return; }
            let v = p.constructor.Vector.sub(endAimPos, ball.pos).limit(board.gridUnitSize).mult(0.5); 
            if (v.mag() > 1) {
                levelStats.ballsUsed++;
                if (ball.type === 'giant') {
                    if (giantBallCount > 0) {
                        giantBallCount--;
                        isGiantBallTurn = true;
                    } else {
                        isAiming = false;
                        return; // Safeguard against launching a giant ball we don't have
                    }
                } else {
                    if (ballsLeft > 0) {
                        ballsLeft--;
                    } else {
                        isAiming = false;
                        return; // Safeguard against launching a regular ball we don't have
                    }
                }
                gameState = ball.launch(v, state.originalBallSpeed); 
                sharedBallStats.hp = ball.hp;
            }
            isAiming = false; 
        } 
    };
    p.touchStarted = (event) => { if(event.target!==p.canvas)return; if(p.touches.length>0)p.mousePressed(event); return false; };
    p.touchMoved = (event) => { if(event.target!==p.canvas)return; if(p.touches.length>0)p.mouseDragged(); if(isAiming)return false; };
    p.touchEnded = (event) => { if(event.target!==p.canvas)return; p.mouseReleased(); return false; };
    
    function previewTrajectory(sP, sV) {
        if (ballsInPlay.length === 0 || sV.mag() < 1) return;
        const ball = ballsInPlay[0];
        let pos=sP.copy(), vel=sV.copy();
        p.stroke(0,255,127,150); p.strokeWeight(4);
        const lineLength=ball.radius*2*2, endPos=p.constructor.Vector.add(pos,vel.normalize().mult(lineLength));
        p.line(pos.x,pos.y,endPos.x,endPos.y);
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

        if(state.p5Instance) p.setBallSpeedMultiplier(state.originalBallSpeed);
    };
    
    function drawInGameUI() {
        if (ballsInPlay.length === 0 || (!ballsInPlay[0].isMoving && !isGiantBallTurn)) return;
        const ball = ballsInPlay[0];
        const isLandscape = p.width > p.height;
        const currentHpValue = sharedBallStats.hp / 10;
        const totalSegments = Math.ceil(sharedBallStats.maxHp / 10);

        if (isLandscape) {
            let uiX = p.min(p.width * 0.1, 60);
            let uiY = p.height / 2;
            const segWidth = 24, segHeight = 8, segGap = 3, iconSize = 24, iconGap = 6;
            const availableHeight = p.min(p.height * 0.8, 500);
            const segsPerCol = Math.floor(availableHeight / (segHeight + segGap));
            const numCols = Math.ceil(totalSegments / segsPerCol);
            const barWidth = numCols * (segWidth + segGap);
            const barHeight = (Math.min(segsPerCol, totalSegments) * (segHeight + segGap)) - segGap;

            let totalUiHeight = barHeight;
            if (sharedBallStats.maxUses > 0) {
                totalUiHeight += (sharedBallStats.maxUses * (iconSize + iconGap)) + 10;
            }

            let currentDrawY = uiY - totalUiHeight / 2;

            if (sharedBallStats.maxUses > 0) {
                for (let i = 0; i < sharedBallStats.maxUses; i++) {
                    const x = uiX - iconSize / 2, y = currentDrawY;
                    p.strokeWeight(1.5); p.stroke(0);
                    if (i < sharedBallStats.uses) p.fill(255, 193, 7); else p.fill(108, 117, 125);
                    p.beginShape(); p.vertex(x + iconSize * 0.4, y); p.vertex(x + iconSize * 0.4, y + iconSize * 0.5); p.vertex(x + iconSize * 0.2, y + iconSize * 0.5); p.vertex(x + iconSize * 0.6, y + iconSize); p.vertex(x + iconSize * 0.6, y + iconSize * 0.6); p.vertex(x + iconSize * 0.8, y + iconSize * 0.6); p.endShape(p.CLOSE);
                    currentDrawY += iconSize + iconGap;
                }
                currentDrawY += 10;
            }

            for (let i = 0; i < totalSegments; i++) {
                const col = Math.floor(i / segsPerCol), row = i % segsPerCol;
                const x = uiX - barWidth / 2 + col * (segWidth + segGap), y = currentDrawY + row * (segHeight + segGap);
                p.noStroke(); p.fill(47, 47, 47); p.rect(x, y, segWidth, segHeight, 2);
                let fillWidth = 0;
                if (i < Math.floor(currentHpValue)) fillWidth = segWidth;
                else if (i === Math.floor(currentHpValue)) fillWidth = (currentHpValue % 1) * segWidth;
                if (fillWidth > 0) {
                    if (sharedBallStats.flashTime > 0) p.fill(244, 67, 54); else p.fill(76, 175, 80);
                    p.rect(x, y, fillWidth, segHeight, 2);
                }
            }
        } else { // Portrait
            let uiX = p.width / 2, uiY = p.height - 90;
            const segWidth = 8, segHeight = 16, segGap = 2, iconSize = 20, iconGap = 5;
            const availableWidth = p.min(p.width * 0.9, 400);
            const segsPerRow = Math.floor(availableWidth / (segWidth + segGap));
            const numRows = Math.ceil(totalSegments / segsPerRow);
            const barHeight = numRows * (segHeight + segGap);

            let currentY = uiY - barHeight;

            if (sharedBallStats.maxUses > 0) {
                const puBarWidth = sharedBallStats.maxUses * (iconSize + iconGap);
                for (let i = 0; i < sharedBallStats.maxUses; i++) {
                    const x = uiX - puBarWidth / 2 + i * (iconSize + iconGap), y = currentY - (iconSize + 5);
                    p.strokeWeight(1.5); p.stroke(0);
                    if (i < sharedBallStats.uses) p.fill(255, 193, 7); else p.fill(108, 117, 125);
                    p.beginShape(); p.vertex(x + iconSize * 0.4, y); p.vertex(x + iconSize * 0.4, y + iconSize * 0.5); p.vertex(x + iconSize * 0.2, y + iconSize * 0.5); p.vertex(x + iconSize * 0.6, y + iconSize); p.vertex(x + iconSize * 0.6, y + iconSize * 0.6); p.vertex(x + iconSize * 0.8, y + iconSize * 0.6); p.endShape(p.CLOSE);
                }
            }

            for (let i = 0; i < totalSegments; i++) {
                const row = Math.floor(i / segsPerRow), col = i % segsPerRow;
                const thisRowSegs = (row === numRows - 1) ? totalSegments % segsPerRow || segsPerRow : segsPerRow;
                const rowWidth = thisRowSegs * (segWidth + segGap) - segGap;
                const x = uiX - rowWidth / 2 + col * (segWidth + segGap), y = currentY + row * (segHeight + segGap);
                p.noStroke(); p.fill(47, 47, 47); p.rect(x, y, segWidth, segHeight, 1);
                let fillHeight = 0;
                if (i < Math.floor(currentHpValue)) fillHeight = segHeight;
                else if (i === Math.floor(currentHpValue)) fillHeight = (currentHpValue % 1) * segHeight;
                if (fillHeight > 0) {
                    if (sharedBallStats.flashTime > 0) p.fill(244, 67, 54); else p.fill(76, 175, 80);
                    p.rect(x, y + segHeight - fillHeight, segWidth, fillHeight, 1);
                }
            }
        }
    }

    function handleEndTurnEffects() {
        levelStats.maxDamageInTurn = Math.max(levelStats.maxDamageInTurn, levelStats.damageThisTurn);
        levelStats.damageThisTurn = 0;
        
        giantBallCount += processComboRewards(p, maxComboThisTurn, state.mainLevel, board, bricks, floatingTexts);
        
        combo = 0; maxComboThisTurn = 0;
        orbsCollectedThisTurn = 0;
        xpCollectPitchResetTimer = 0;

        if (state.pendingXp > 0) {
            const totalXpToAdd = state.pendingXp;
            let xpAddedThisTurn = 0;
            
            let xpTicking = setInterval(() => {
                const tickAmount = Math.max(1, Math.floor(totalXpToAdd / 20));
                const amountThisTick = Math.min(tickAmount, totalXpToAdd - xpAddedThisTurn);
                
                state.currentXp += amountThisTick;
                state.pendingXp -= amountThisTick;
                xpAddedThisTurn += amountThisTick;

                while (state.currentXp >= state.xpForNextLevel) {
                    state.currentXp -= state.xpForNextLevel;
                    state.mainLevel++;
                    state.xpForNextLevel = XP_SETTINGS.xpBaseAmount * state.mainLevel * (state.mainLevel + 1) / 2;
                    sounds.levelUp();
                    ui.showLevelUpModal(state.mainLevel);
                }
                
                if (xpAddedThisTurn >= totalXpToAdd) {
                    clearInterval(xpTicking);
                    state.pendingXp = 0;
                }
            }, 50);
        }
        
        processBrickOverlays(p, board, bricks, { shockwaves, particles }, sounds);
    }

    function handleBrickSpawnPowerup(effect) {
        const { center, coinChance } = effect;
        const tiles = 3, radius = tiles * board.gridUnitSize, gridPositions = new Set();
        for (let i = 0; i < 72; i++) {
            const angle = p.TWO_PI / 72 * i;
            const x = center.x + radius * p.cos(angle), y = center.y + radius * p.sin(angle);
            const gridC = Math.round((x - board.genX) / board.gridUnitSize), gridR = Math.round((y - board.genY) / board.gridUnitSize);
            if (gridC >= 0 && gridC < board.cols && gridR >= 0 && gridR < board.rows) gridPositions.add(`${gridC},${gridR}`);
        }
        const bricksToKillAndReplace = [], emptySpotsToFill = [];
        gridPositions.forEach(posStr => {
            const [gridC, gridR] = posStr.split(',').map(Number);
            let existingBrick = bricks[gridC][gridR];
            if (existingBrick) {
                if (existingBrick.type === 'normal') bricksToKillAndReplace.push({ brick: existingBrick, pos: { c: gridC, r: gridR } });
            } else {
                emptySpotsToFill.push({ c: gridC, r: gridR });
            }
        });
        bricksToKillAndReplace.forEach(item => {
            const hitResult = item.brick.hit(10000, 'replaced', board);
            if (hitResult) processEvents([{ type: 'brick_hit', ...hitResult }]);
        });
        processBrokenBricks();
        const spotsForNewBricks = emptySpotsToFill.concat(bricksToKillAndReplace.map(item => item.pos));
        spotsForNewBricks.forEach(pos => {
            const newBrick = new Brick(p, pos.c - 6, pos.r - 6, 'normal', 10, board.gridUnitSize);
            if (p.random() < coinChance) {
                newBrick.coins = newBrick.maxCoins = 5;
                newBrick.coinIndicatorPositions = [];
                for (let i = 0; i < p.min(newBrick.maxCoins, 20); i++) newBrick.coinIndicatorPositions.push(p.createVector(p.random(newBrick.size * 0.1, newBrick.size * 0.9), p.random(newBrick.size * 0.1, newBrick.size * 0.9)));
            }
            bricks[pos.c][pos.r] = newBrick;
        });
    }
};