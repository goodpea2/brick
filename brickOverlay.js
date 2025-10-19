// brickOverlay.js - End-of-turn logic for brick overlays (Healer, Builder)

import { Shockwave, Particle } from './vfx.js';
import { Brick } from './brick.js';
import { GAME_CONSTANTS } from './balancing.js';

export function processBrickOverlays(p, board, bricks, vfx, sounds) {
    const findBrickAt = (c, r) => { if (c >= 0 && c < board.cols && r >= 0 && r < board.rows) return bricks[c][r]; return null; };
    
    // --- Healer Logic ---
    const healers = [];
    for(let c=0; c<board.cols; c++) for(let r=0; r<board.rows; r++) if(bricks[c][r] && bricks[c][r].overlay === 'healer') healers.push(bricks[c][r]);

    const healActions = new Map(); // Map<Brick, { count: number, sources: Brick[] }>
    healers.forEach(healer => {
        const c = healer.c + 6, r = healer.r + 6;
        for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) { 
            if (dc === 0 && dr === 0) continue; 
            const neighbor = findBrickAt(c + dc, r + dr);
            // Heal normal or extraBall bricks, regardless of their overlay
            if (neighbor && (neighbor.type === 'normal' || neighbor.type === 'extraBall')) { 
                const action = healActions.get(neighbor) || { count: 0, sources: [] }; 
                action.count++; 
                action.sources.push(healer); 
                healActions.set(neighbor, action); 
            } 
        }
    });
    if (healActions.size > 0) sounds.heal();
    healActions.forEach((action, brick) => {
        const isMerged = brick.widthInCells > 1 || brick.heightInCells > 1;
        const healthCap = isMerged ? GAME_CONSTANTS.MERGED_BRICK_HP : GAME_CONSTANTS.MAX_BRICK_HP;
        const healthToAdd = 10 * action.count;

        // Increase both maxHealth and health, capped at the global constant
        const newMaxHealth = p.min(healthCap, brick.maxHealth + healthToAdd);
        brick.maxHealth = newMaxHealth;
        brick.health = newMaxHealth; // Heal to full
        
        const targetPos = brick.getPixelPos(board).add(brick.size / 2, brick.size / 2);
        action.sources.forEach(source => {
            const sourcePos = source.getPixelPos(board).add(source.size / 2, source.size / 2);
            vfx.shockwaves.push(new Shockwave(p, sourcePos.x, sourcePos.y, brick.size * 1.5, p.color(144, 238, 144), 4));
            vfx.particles.push(new Particle(p, sourcePos.x, sourcePos.y, p.color(144, 238, 144, 150), 2, {target: targetPos, size: 3, lifespan: 100}));
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
            while(currentC >= 0 && currentC < board.cols && currentR >= 0 && currentR < board.rows) { 
                const brickAtPos = findBrickAt(currentC, currentR); 
                if (!brickAtPos) { 
                    const key = `${currentC},${currentR}`; 
                    const spawn = buildSpawns.get(key) || { count: 0, sources: []}; 
                    spawn.count++; 
                    spawn.sources.push(builder); 
                    buildSpawns.set(key, spawn); 
                    return; 
                } 
                lastBrick = brickAtPos; 
                currentC += dir.c; 
                currentR += dir.r; 
            }
            // Buff normal or extraBall bricks, regardless of their overlay
            if (lastBrick && (lastBrick.type === 'normal' || lastBrick.type === 'extraBall')) {
                const buff = buildBuffs.get(lastBrick) || { count: 0, sources: []};
                buff.count++;
                buff.sources.push(builder);
                buildBuffs.set(lastBrick, buff);
            }
        });
    });

    if (buildSpawns.size > 0 || buildBuffs.size > 0) sounds.brickSpawn();

    buildSpawns.forEach((spawn, key) => {
        const [c, r] = key.split(',').map(Number);
        if (!findBrickAt(c, r)) {
            const newBrick = new Brick(p, c - 6, r - 6, 'normal', 10 * spawn.count, board.gridUnitSize);
            bricks[c][r] = newBrick;
            const targetPos = newBrick.getPixelPos(board).add(newBrick.size / 2, newBrick.size / 2);
            spawn.sources.forEach(source => { const sourcePos = source.getPixelPos(board).add(source.size/2, source.size/2); for(let i=0; i<5; i++) vfx.particles.push(new Particle(p, sourcePos.x, sourcePos.y, p.color(135, 206, 250), 3, { target: targetPos })); });
        }
    });
    
    buildBuffs.forEach((buff, brick) => {
        const isMerged = brick.widthInCells > 1 || brick.heightInCells > 1;
        const healthCap = isMerged ? GAME_CONSTANTS.MERGED_BRICK_HP : GAME_CONSTANTS.MAX_BRICK_HP;
        const healthToAdd = 10 * buff.count;
        const newMaxHealth = p.min(healthCap, brick.maxHealth + healthToAdd);
        brick.maxHealth = newMaxHealth;
        brick.health = newMaxHealth;
        
        const targetPos = brick.getPixelPos(board).add(brick.size/2, brick.size/2);
        buff.sources.forEach(source => { const sourcePos = source.getPixelPos(board).add(source.size/2, source.size/2); for(let i=0; i<5; i++) vfx.particles.push(new Particle(p, sourcePos.x, sourcePos.y, p.color(135, 206, 250, 150), 2, { target: targetPos, size: 3, lifespan: 100 })); });
    });
}