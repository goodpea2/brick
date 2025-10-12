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

export function generateLevel(p, settings, level, board) {
    const { cols, rows, gridUnitSize } = board;
    let brickMatrix = Array(cols).fill(null).map(() => Array(rows).fill(null));

    const currentSeed = (settings.seed !== null && !isNaN(settings.seed)) ? settings.seed : p.floor(p.random(1000000));
    p.randomSeed(currentSeed);

    let currentBrickHpPool = (settings.startingBrickHp + (level - 1) * settings.brickHpIncrement) * Math.pow(settings.brickHpIncrementMultiplier, level - 1);
    let currentCoinPool = p.min(settings.maxCoin, settings.startingCoin + (level - 1) * settings.coinIncrement);
    if (level > 1 && level % settings.bonusLevelInterval === 0) { 
        const multiplier = p.random(settings.minCoinBonusMultiplier, settings.maxCoinBonusMultiplier); 
        currentCoinPool = Math.floor(currentCoinPool * multiplier); 
    }
    
    let brickCountTarget = Math.floor(p.min(settings.maxBrickCount, settings.brickCount + (level - 1) * settings.brickCountIncrement));
    if (p.random() < settings.fewBrickLayoutChance) {
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
    
    const goalBricksToPlace = Math.floor(settings.goalBricks + (level - 1) * settings.goalBrickCountIncrement);
    for (let i = 0; i < goalBricksToPlace; i++) { 
        const spot = takeNextAvailableCoord(); 
        if(spot) brickMatrix[spot.c][spot.r] = new Brick(p, spot.c - 6, spot.r - 6, 'goal', 10, gridUnitSize); 
    }
    for (let i = 0; i < settings.extraBallBricks; i++) { 
        const spot = takeNextAvailableCoord(); 
        if(spot) brickMatrix[spot.c][spot.r] = new Brick(p, spot.c - 6, spot.r - 6, 'extraBall', 10, gridUnitSize); 
    }

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

    let tempNormalBricks = [];
    let hpPlacedSoFar = 0;
    normalBrickCoords.forEach(spot => {
        if((hpPlacedSoFar + 10) <= currentBrickHpPool) {
            const type = p.random() < settings.explosiveBrickChance ? 'explosive' : 'normal';
            const newBrick = new Brick(p, spot.c - 6, spot.r - 6, type, 10, gridUnitSize);
            brickMatrix[spot.c][spot.r] = newBrick;
            hpPlacedSoFar += 10;
            if (type === 'normal') tempNormalBricks.push(newBrick);
        }
    });

    let hpToDistribute = currentBrickHpPool - hpPlacedSoFar;
    while (hpToDistribute > 0) {
        let eligibleBricks = [];
        for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (brickMatrix[c][r] && brickMatrix[c][r].type === 'normal') eligibleBricks.push(brickMatrix[c][r]);
        
        if (eligibleBricks.length === 0) break;
        const brickToBuff = eligibleBricks[p.floor(p.random(eligibleBricks.length))];
        const rand = p.random();
        const builderCost = 100, healerCost = 80;

        let converted = false;
        if (!brickToBuff.overlay) {
            if (rand < settings.builderBrickChance && hpToDistribute >= builderCost) {
                brickToBuff.overlay = 'builder';
                hpToDistribute -= builderCost;
                converted = true;
            } else if (rand < settings.builderBrickChance + settings.healerBrickChance && hpToDistribute >= healerCost) {
                brickToBuff.overlay = 'healer';
                hpToDistribute -= healerCost;
                converted = true;
            }
        }

        if (!converted) {
            if (hpToDistribute >= 10 && brickToBuff.health < GAME_CONSTANTS.MAX_BRICK_HP) {
                brickToBuff.health += 10;
                brickToBuff.maxHealth += 10;
                hpToDistribute -= 10;
            } else {
                if (eligibleBricks.every(b => b.health >= GAME_CONSTANTS.MAX_BRICK_HP) || hpToDistribute < 10) {
                    break;
                }
            }
        }
    }

    if (tempNormalBricks.length > 0) { 
        let coinsToDistribute = currentCoinPool; 
        while (coinsToDistribute > 0) { 
            const brickForCoins = tempNormalBricks[p.floor(p.random(tempNormalBricks.length))]; 
            const coinsToAdd = p.min(coinsToDistribute, p.floor(p.random(2, 5)) * (brickForCoins.health / 10)); 
            brickForCoins.coins += coinsToAdd; 
            brickForCoins.maxCoins += coinsToAdd; 
            coinsToDistribute -= coinsToAdd; 
            if (coinsToDistribute <= 0) break; 
            if (tempNormalBricks.every(b => b.coins > 1000)) break; 
        } 
    }
    
    let goalBrickCount = 0;
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            const b = brickMatrix[c][r];
            if (b) {
                if (b.type === 'goal') goalBrickCount++;
                if (b.maxCoins > 0) {
                    b.coinIndicatorPositions = [];
                    for (let i = 0; i < p.min(b.maxCoins, 20); i++) {
                        // Store relative positions for recalculation in draw
                        b.coinIndicatorPositions.push(p.createVector(p.random(b.size * 0.1, b.size * 0.9), p.random(b.size * 0.1, b.size * 0.9)));
                    }
                }
            }
        }
    }

    if (goalBrickCount === 0) {
       const spot = takeNextAvailableCoord();
       if(spot) brickMatrix[spot.c][spot.r] = new Brick(p, spot.c - 6, spot.r - 6, 'goal', 10, gridUnitSize);
    }
    
    return { bricks: brickMatrix, seed: currentSeed };
}