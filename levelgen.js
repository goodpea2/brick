// levelgen.js

import { Brick } from './brick.js';
import { GAME_CONSTANTS } from './balancing.js';

function generateSingleFormulaPoints(p, cols, rows) {
    const formulas = [ 
        () => { const pts=new Set(), a=p.random(rows/6, rows/3), b=p.random(0.2, 0.8), c=p.random(a, rows-a); for(let i=0;i<cols;i++){const r=Math.floor(a*p.sin(b*i)+c); pts.add(`${i},${r}`);} return Array.from(pts,pt=>({c:parseInt(pt.split(',')[0]),r:parseInt(pt.split(',')[1])})); }, 
        () => { const pts=new Set(), h=p.random(cols*0.2,cols*0.8), k=p.random(rows*0.2,rows*0.8), r=p.random(cols/8, cols/3); for(let angle=0;angle<p.TWO_PI;angle+=0.1){const c=Math.floor(h+r*p.cos(angle)), r2=Math.floor(k+r*p.sin(angle)); pts.add(`${c},${r2}`);} return Array.from(pts,pt=>({c:parseInt(pt.split(',')[0]),r:parseInt(pt.split(',')[1])})); }, 
        () => { const pts=new Set(), cx=p.random(cols*0.2,cols*0.8), cy=p.random(rows*0.2,rows*0.8), w=p.random(cols/4,cols/2), h=p.random(rows/8,rows/4), angle=p.random(p.TWO_PI); const cosA=p.cos(angle), sinA=p.sin(angle); for(let i=0;i<w;i++){for(let j=0;j<h;j++){const x=i-w/2, y=j-h/2; const rotX=x*cosA-y*sinA, rotY=x*sinA+y*cosA; const c=Math.floor(cx+rotX), r=Math.floor(cy+rotY); pts.add(`${c},${r}`);}} return Array.from(pts,pt=>({c:parseInt(pt.split(',')[0]),r:parseInt(pt.split(',')[1])})); }, 
        () => { const pts=new Set(), apexR=p.floor(p.random(2,rows/2)), baseR=p.floor(p.random(rows/2+2, rows-2)), apexC=p.floor(p.random(cols/4, cols*3/4)), baseWidth=p.floor(p.random(cols/3, cols*0.9)); const baseC1=p.floor(apexC-baseWidth/2), baseC2=p.floor(apexC+baseWidth/2); for(let r=apexR; r<=baseR; r++){const t=(r-apexR)/(baseR-apexR); const startC=Math.floor(p.lerp(apexC, baseC1, t)), endC=Math.floor(p.lerp(apexC, baseC2, t)); for(let c=startC; c<=endC; c++){pts.add(`${c},${r}`);}} return Array.from(pts,pt=>({c:parseInt(pt.split(',')[0]),r:parseInt(pt.split(',')[1])})); }, 
        () => { const pts=new Set(), cx=p.random(cols*0.2,cols*0.8), cy=p.random(rows*0.2,rows*0.8), r1=p.random(cols/8,cols/4), r2=p.random(r1*0.4, r1*0.8), n=p.floor(p.random(5,9)); for(let i=0;i<n*2;i++){ const r=i%2==0?r1:r2, angle=p.PI/n*i; const c=Math.floor(cx+r*p.cos(angle)), r3=Math.floor(cy+r*p.sin(angle)); const c2=Math.floor(cx+r*p.cos(angle+p.PI/n)), r4=Math.floor(cy+r*p.sin(angle+p.PI/n)); for(let t=0; t<1; t+=0.1){const interpC=Math.floor(p.lerp(c,c2,t)), interpR=Math.floor(p.lerp(r3,r4,t)); pts.add(`${interpC},${interpR}`);}} return Array.from(pts,pt=>({c:parseInt(pt.split(',')[0]),r:parseInt(pt.split(',')[1])}));}, 
    ];
    const formulaFunc = p.random(formulas); 
    const generatedPoints = formulaFunc(); 
    return generatedPoints.filter(pt => pt.c >= 0 && pt.c < cols && pt.r >= 0 && pt.r < rows);
}

function processBrickMerging(p, brickMatrix, hpPool, board) {
    const { cols, rows, gridUnitSize } = board;
    const mergeCost = GAME_CONSTANTS.MERGE_COST;
    const mergeChance = 0.5;
    const processedCoords = new Set(); // e.g., "c,r"

    const isEligible = (c, r) => {
        const brick = brickMatrix[c]?.[r];
        return brick && (brick.type === 'normal' || brick.type === 'extraBall') && brick.health >= GAME_CONSTANTS.MAX_BRICK_HP && !processedCoords.has(`${c},${r}`);
    };

    let potentialMerges = [];

    // Find all possible horizontal merges
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c <= cols - 3; c++) {
            if (isEligible(c, r) && isEligible(c + 1, r) && isEligible(c + 2, r)) {
                potentialMerges.push({ coords: [{c, r}, {c: c + 1, r}, {c: c + 2, r}], orientation: 'h' });
            }
        }
    }

    // Find all possible vertical merges
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r <= rows - 3; r++) {
            if (isEligible(c, r) && isEligible(c, r + 1) && isEligible(c, r + 2)) {
                potentialMerges.push({ coords: [{c, r}, {c, r: r + 1}, {c, r: r + 2}], orientation: 'v' });
            }
        }
    }
    
    p.shuffle(potentialMerges, true); // Randomize the order of all possible merges

    for (const merge of potentialMerges) {
        // Check if any of the coords have already been used in another merge
        const canMerge = merge.coords.every(coord => !processedCoords.has(`${coord.c},${coord.r}`));

        if (canMerge && hpPool >= mergeCost && p.random() < mergeChance) {
            hpPool -= mergeCost;
            
            const sourceBricks = merge.coords.map(coord => brickMatrix[coord.c][coord.r]);
            
            // Aggregate stats from source bricks
            const totalCoins = sourceBricks.reduce((sum, b) => sum + (b ? b.coins : 0), 0);
            const totalMaxCoins = sourceBricks.reduce((sum, b) => sum + (b ? b.maxCoins : 0), 0);
            const overlay = sourceBricks.find(b => b && b.overlay)?.overlay || null;
            
            const firstCoord = merge.coords[0];
            const mergedBrick = new Brick(p, firstCoord.c - 6, firstCoord.r - 6, 'normal', 600, gridUnitSize);
            mergedBrick.widthInCells = merge.orientation === 'h' ? 3 : 1;
            mergedBrick.heightInCells = merge.orientation === 'v' ? 3 : 1;
            
            // Apply aggregated stats
            mergedBrick.coins = totalCoins;
            mergedBrick.maxCoins = totalMaxCoins;
            mergedBrick.overlay = overlay;


            // Place master brick and references, and mark coords as processed
            merge.coords.forEach(coord => {
                brickMatrix[coord.c][coord.r] = mergedBrick;
                processedCoords.add(`${coord.c},${coord.r}`);
            });
        }
    }
    
    return hpPool;
}


export function generateLevel(p, settings, level, board) {
    // --- Step 1: Initialization ---
    // Create an empty grid and set up the random seed for deterministic generation.
    const { cols, rows, gridUnitSize } = board;
    let brickMatrix = Array(cols).fill(null).map(() => Array(rows).fill(null));

    const currentSeed = (settings.seed !== null && !isNaN(settings.seed)) ? settings.seed : p.floor(p.random(1000000));
    p.randomSeed(currentSeed);

    // --- Step 2: Calculate Level-Based Parameters ---
    // Determine the HP pool, coin pool, and target number of bricks based on the current level and settings.
    // This includes logic for bonus coin levels and rare "few brick" layouts.
    
    // Calculate HP Pool iteratively to respect the max increment cap
    let currentBrickHpPool = settings.startingBrickHp;
    const calculatePoolForLevel = (lvl) => {
        if (lvl <= 1) return settings.startingBrickHp;
        // This is the original formula
        return (settings.startingBrickHp + (lvl - 1) * settings.brickHpIncrement) * Math.pow(settings.brickHpIncrementMultiplier, lvl - 1);
    };
    
    for (let i = 2; i <= level; i++) {
        const poolForLevelI = calculatePoolForLevel(i);
        const increase = poolForLevelI - currentBrickHpPool;
        if (increase > settings.maxBrickHpIncrement) {
            currentBrickHpPool += settings.maxBrickHpIncrement;
        } else {
            currentBrickHpPool = poolForLevelI;
        }
    }

    let currentCoinPool = p.min(settings.maxCoin, settings.startingCoin + (level - 1) * settings.coinIncrement);
    if (level > 1 && level % settings.bonusLevelInterval === 0) { 
        const multiplier = p.random(settings.minCoinBonusMultiplier, settings.maxCoinBonusMultiplier); 
        currentCoinPool = Math.floor(currentCoinPool * multiplier); 
    }
    
    let brickCountTarget = Math.floor(p.min(settings.maxBrickCount, settings.brickCount + (level - 1) * settings.brickCountIncrement));
    if (level >= settings.fewBrickLayoutChanceMinLevel && p.random() < settings.fewBrickLayoutChance) {
        brickCountTarget = Math.floor(brickCountTarget * 0.2);
    }

    const allPossibleCoords = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) allPossibleCoords.push({ c, r });
    p.shuffle(allPossibleCoords, true);
    
    const takeNextAvailableCoord = () => { 
        while (allPossibleCoords.length > 0) { 
            const spot = allPossibleCoords.pop(); 
            if (!brickMatrix[spot.c][spot.r]) { 
                return spot; 
            } 
        } 
        return null; 
    };
    
    // --- Step 3: Place Special Bricks ---
    // Prioritize placing Goal bricks, which are required to complete the level.
    const totalGoalBrickValue = Math.floor(settings.goalBricks + (level - 1) * settings.goalBrickCountIncrement);
    const actualBricksToPlace = Math.min(totalGoalBrickValue, settings.goalBrickCap);
    const excessBricks = totalGoalBrickValue - actualBricksToPlace;
    
    const placedGoalBricks = [];
    for (let i = 0; i < actualBricksToPlace; i++) { 
        const spot = takeNextAvailableCoord(); 
        if(spot) {
            const newGoalBrick = new Brick(p, spot.c - 6, spot.r - 6, 'goal', 10, gridUnitSize);
            brickMatrix[spot.c][spot.r] = newGoalBrick;
            placedGoalBricks.push(newGoalBrick);
        }
    }
    
    // Distribute excess goal brick value by filling up one goal brick at a time
    let currentGoalBrickIndex = 0;
    for (let i = 0; i < excessBricks; i++) {
        if (placedGoalBricks.length === 0) break;

        // Find the next eligible brick to buff
        let hasFoundBrick = false;
        const initialIndex = currentGoalBrickIndex;
        while (!hasFoundBrick) {
            if (placedGoalBricks[currentGoalBrickIndex] && placedGoalBricks[currentGoalBrickIndex].health < settings.goalBrickMaxHp) {
                hasFoundBrick = true;
            } else {
                currentGoalBrickIndex = (currentGoalBrickIndex + 1) % placedGoalBricks.length;
                if (currentGoalBrickIndex === initialIndex) { // We've looped through all bricks and they're full
                    i = excessBricks; // Break outer loop
                    break;
                }
            }
        }
        if (i >= excessBricks) break; // Check if the inner loop broke the outer one

        const brickToBuff = placedGoalBricks[currentGoalBrickIndex];
        
        // Add 10 HP
        const hpToAdd = 10;
        brickToBuff.health += hpToAdd;
        brickToBuff.maxHealth += hpToAdd;
    }
    
    // Place +1 Ball bricks. These are guaranteed and do not count towards brickCountTarget.
    for (let i = 0; i < settings.extraBallBricks; i++) {
        const spot = takeNextAvailableCoord();
        if (spot) {
            brickMatrix[spot.c][spot.r] = new Brick(p, spot.c - 6, spot.r - 6, 'extraBall', 10, gridUnitSize);
        }
    }

    // --- Step 4: Place Normal Bricks based on Pattern ---
    // Fill the grid with the target number of normal bricks using the selected layout pattern (e.g., formulaic, solid).
    // Some of these may be designated as special types like 'Explosive' bricks.
    // Each brick is created with a base health of 10 HP.
    let normalBrickCoords = [];
    if (settings.levelPattern === 'formulaic') {
         while (normalBrickCoords.length < brickCountTarget) {
            const formulaPoints = generateSingleFormulaPoints(p, cols, rows);
            p.shuffle(formulaPoints, true); 
            let pointsAddedInLoop = false;
            for (const point of formulaPoints) { 
                if (!brickMatrix[point.c][point.r]) {
                    normalBrickCoords.push(point); 
                    pointsAddedInLoop = true; 
                    if (normalBrickCoords.length >= brickCountTarget) break; 
                } 
            }
            if (!pointsAddedInLoop) break;
         }
    } else {
         let patternCoords = [];
         if (settings.levelPattern === 'solid') for (let r = 0; r < Math.floor(rows / 2); r++) for (let c = 1; c < cols - 1; c++) patternCoords.push({ c, r: r + 2 });
         else if (settings.levelPattern === 'checkerboard') for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if ((r + c) % 2 === 0) patternCoords.push({ c, r });
         else if (settings.levelPattern === 'spiral') { let x = 0, y = 0, dx = 0, dy = -1, n = Math.max(cols, rows); for (let i = 0; i < n * n; i++) { let gridC = Math.floor(cols / 2) + x, gridR = Math.floor(rows / 2) + y; if (gridC >= 0 && gridC < cols && gridR >= 0 && gridR < rows) if (i % 3 === 0) patternCoords.push({ c: gridC, r: gridR }); if (x === y || (x < 0 && x === -y) || (x > 0 && x === 1 - y)) [dx, dy] = [-dy, dx]; x += dx; y += dy; } }
         else { patternCoords = allPossibleCoords; }
         p.shuffle(patternCoords, true);
         for(const coord of patternCoords) { 
             if (!brickMatrix[coord.c][coord.r]) { 
                 normalBrickCoords.push(coord); 
                 if (normalBrickCoords.length >= brickCountTarget) break; 
             } 
         }
    }

    let hpPlacedSoFar = 0;
    normalBrickCoords.forEach(spot => {
        if((hpPlacedSoFar + 10) <= currentBrickHpPool) {
            let type = 'normal';
            if (p.random() < settings.explosiveBrickChance) {
                type = 'explosive';
            }
            const newBrick = new Brick(p, spot.c - 6, spot.r - 6, type, 10, gridUnitSize);
            brickMatrix[spot.c][spot.r] = newBrick;
            hpPlacedSoFar += 10;
        }
    });

    // --- Step 5: Distribute HP Pool ---
    // Distribute the remaining HP from the level's HP pool among the placed normal and '+1 Ball' bricks.
    // This phase also includes a chance to convert high-HP normal bricks into special 'Builder' or 'Healer' overlay hosts.
    let hpToDistribute = currentBrickHpPool - hpPlacedSoFar;
    
    const normalAndExtraBallBricks = [];
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            const b = brickMatrix[c][r];
            if (b && (b.type === 'normal' || b.type === 'extraBall')) {
                normalAndExtraBallBricks.push(b);
            }
        }
    }

    while (hpToDistribute > 0) {
        let eligibleBricksForBuff = normalAndExtraBallBricks;
        let eligibleBricksForOverlay = normalAndExtraBallBricks.filter(b => b.type === 'normal' && !b.overlay);

        if (eligibleBricksForBuff.length === 0) break;
        
        const rand = p.random();
        
        let converted = false;
        if (eligibleBricksForOverlay.length > 0) {
            const brickToOverlay = eligibleBricksForOverlay[p.floor(p.random(eligibleBricksForOverlay.length))];
            
            const builderCost = GAME_CONSTANTS.BUILDER_SPAWN_BASE_COST + brickToOverlay.health * GAME_CONSTANTS.OVERLAY_SPAWN_HP_MULTIPLIER;
            const healerCost = GAME_CONSTANTS.HEALER_SPAWN_BASE_COST + brickToOverlay.health * GAME_CONSTANTS.OVERLAY_SPAWN_HP_MULTIPLIER;

            if (rand < settings.builderBrickChance && hpToDistribute >= builderCost) {
                brickToOverlay.overlay = 'builder';
                hpToDistribute -= builderCost;
                converted = true;
            } else if (rand < settings.builderBrickChance + settings.healerBrickChance && hpToDistribute >= healerCost) {
                brickToOverlay.overlay = 'healer';
                hpToDistribute -= healerCost;
                converted = true;
            }
        }
        
        if (!converted) {
            const brickToBuff = eligibleBricksForBuff[p.floor(p.random(eligibleBricksForBuff.length))];
            
            const hpToAdd = 10;
            const hpCost = brickToBuff.overlay ? hpToAdd * 2 : hpToAdd;
            
            if (hpToDistribute >= hpCost && brickToBuff.health < GAME_CONSTANTS.MAX_BRICK_HP) {
                brickToBuff.health += hpToAdd;
                brickToBuff.maxHealth += hpToAdd;
                hpToDistribute -= hpCost;
            } else {
                const canBuffAny = eligibleBricksForBuff.some(b => {
                    const cost = b.overlay ? 20 : 10;
                    return hpToDistribute >= cost && b.health < GAME_CONSTANTS.MAX_BRICK_HP;
                });
                if (!canBuffAny) {
                    break;
                }
            }
        }
    }
    
    // --- Step 6: Merge High-HP Bricks ---
    // Scan the grid for adjacent, max-HP normal bricks and merge them into larger, more durable bricks.
    // This adds another layer of variation and challenge.
    hpToDistribute = processBrickMerging(p, brickMatrix, hpToDistribute, board);

    // --- Step 7: Spawn Special Cages (Optional) ---
    // High-HP bricks have a chance to spawn a 'Ball Cage' brick in a nearby empty spot.
    if (settings.ballCageBrickChance > 0) {
        const bricksToCheck = [];
        for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (brickMatrix[c][r]) bricksToCheck.push(brickMatrix[c][r]);
        
        bricksToCheck.forEach(brick => {
            if (brick.health >= 100 && p.random() < settings.ballCageBrickChance) {
                const emptySpot = takeNextAvailableCoord();
                if (emptySpot) {
                    brickMatrix[emptySpot.c][emptySpot.r] = new Brick(p, emptySpot.c - 6, emptySpot.r - 6, 'ballCage', 10, gridUnitSize);
                }
            }
        });
    }

    const hpPoolSpent = currentBrickHpPool - hpToDistribute;

    // --- Step 8: Distribute Coin Pool ---
    // Distribute the level's coin pool among all 'normal' bricks, including newly merged ones.
    // The amount of coins a brick can hold is proportional to its health.
    const coinEligibleBricks = [];
    const uniqueBricks = new Set();
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            const brick = brickMatrix[c][r];
            // Only 'normal' type bricks (which includes merged bricks) can hold coins.
            if (brick && brick.type === 'normal' && !uniqueBricks.has(brick)) {
                coinEligibleBricks.push(brick);
                uniqueBricks.add(brick);
            }
        }
    }

    if (coinEligibleBricks.length > 0) {
        let coinsToDistribute = currentCoinPool;
        while (coinsToDistribute > 0) {
            const brickForCoins = coinEligibleBricks[p.floor(p.random(coinEligibleBricks.length))];
            const coinsToAdd = p.min(coinsToDistribute, p.floor(p.random(2, 5)) * (brickForCoins.health / 10));
            brickForCoins.coins += coinsToAdd;
            brickForCoins.maxCoins += coinsToAdd;
            coinsToDistribute -= coinsToAdd;
            if (coinsToDistribute <= 0) break;
            // Failsafe to prevent infinite loops if coins can't be distributed.
            if (coinEligibleBricks.every(b => b.coins > 1000)) break;
        }
    }
    
    // --- Step 9: Finalization ---
    // Generate visual indicators for bricks containing coins.
    // As a final check, ensure at least one Goal brick exists on the board.
    let goalBrickCount = 0;
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            const b = brickMatrix[c][r];
            if (b) {
                if (b.type === 'goal') goalBrickCount++;
                if (b.maxCoins > 0) {
                    b.coinIndicatorPositions = [];
                    for (let i = 0; i < p.min(b.maxCoins, 20); i++) {
                        b.coinIndicatorPositions.push(p.createVector(p.random(b.size * 0.1, b.size * 0.9), p.random(b.size * 0.1, b.size * 0.9)));
                    }
                }
            }
        }
    }

    if (goalBrickCount === 0 && placedGoalBricks.length === 0) {
       const spot = takeNextAvailableCoord();
       if(spot) brickMatrix[spot.c][spot.r] = new Brick(p, spot.c - 6, spot.r - 6, 'goal', 10, gridUnitSize);
    }
    
    return { 
        bricks: brickMatrix, 
        seed: currentSeed,
        hpPool: currentBrickHpPool,
        hpPoolSpent,
        coinPool: currentCoinPool,
    };
}