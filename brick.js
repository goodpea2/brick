// brick.js

import { GAME_CONSTANTS, BRICK_VISUALS } from './balancing.js';
import { state } from './state.js';

export class Brick {
    constructor(p, c, r, type = 'normal', health = 10, gridUnitSize) { 
        this.p = p;
        this.c = c; // Column, -6 to 6
        this.r = r; // Row, -6 to 6
        this.size = gridUnitSize; 
        this.type = type; 
        this.maxHealth = health; 
        this.health = health; 
        this.pointsPerHp = 1; 
        this.maxCoins = 0; 
        this.coins = 0; 
        this.coinIndicatorPositions = null; 
        this.overlay = null; 
        this.flashTime = 0;
        
        // For merged bricks
        this.widthInCells = 1;
        this.heightInCells = 1;
    }

    getPixelPos(board) {
        const gridC = this.c + 6; // Map -6..6 to 0..12
        const gridR = this.r + 6; // Map -6..6 to 0..12
        return this.p.createVector(
            board.genX + gridC * board.gridUnitSize,
            board.genY + gridR * board.gridUnitSize
        );
    }

    isBroken() { 
        return this.health <= 0; 
    }

    hit(damage, source, board) {
        if (this.health <= 0) return null; 
        if (typeof damage !== 'number' || !isFinite(damage)) {
            console.error(`Brick hit with invalid damage: ${damage}. Defaulting to 1.`);
            damage = 1;
        }
        
        const colorBeforeHit = this.getColor();
        const totalLayers = this.getTotalLayers();
        this.flashTime = 8;
        const damageDealt = this.p.min(this.health, damage); 
        this.health -= damageDealt; 
        
        let coinsDropped = 0; 
        if (this.maxCoins > 0) { 
            const coinsBeforeHit = this.coins; 
            const coinsAfterHit = Math.ceil((this.health / this.maxHealth) * this.maxCoins); 
            coinsDropped = coinsBeforeHit - coinsAfterHit; 
            this.coins = coinsAfterHit; 
        }

        let events = [];
        const pos = this.getPixelPos(board);
        const centerPos = this.p.createVector(
            pos.x + (this.size * this.widthInCells) / 2, 
            pos.y + (this.size * this.heightInCells) / 2
        );
        if (this.overlay === 'mine' && (source instanceof Object && source.type && (source.type !== 'giant' && source.type !== 'projectile' && source.type !== 'miniball'))) { 
            events.push({ type: 'explode_mine', pos: centerPos });
            this.overlay = null; 
        }

        return {
            damageDealt,
            coinsDropped,
            isBroken: this.isBroken(),
            color: colorBeforeHit,
            center: centerPos,
            events,
            source,
            totalLayers, // Pass the layer count for SFX
            sourceBallVel: source instanceof Object && source.vel ? source.vel.copy() : null,
        };
    }

    getTotalLayers() {
        if (this.type !== 'normal' && this.type !== 'extraBall' && this.type !== 'goal') {
            return Math.max(1, Math.floor((this.health - 1) / 10) + 1);
        }
        
        const isMerged = this.widthInCells > 1 || this.heightInCells > 1;
        let hpPerLayer;

        if (this.type === 'goal') {
            hpPerLayer = BRICK_VISUALS.hpPerLayer.goal;
        } else if (this.type === 'extraBall') {
            hpPerLayer = isMerged ? BRICK_VISUALS.hpPerLayer.long : BRICK_VISUALS.hpPerLayer.extraBall;
        } else { // normal
            hpPerLayer = isMerged ? BRICK_VISUALS.hpPerLayer.long : BRICK_VISUALS.hpPerLayer.normal;
        }
        
        const hpPerTier = BRICK_VISUALS.layersPerTier * hpPerLayer;
        const tier = Math.max(0, Math.floor((this.health - 1) / hpPerTier));
        const hpInTier = ((this.health - 1) % hpPerTier) + 1;
        const numLayersInTier = Math.max(1, Math.ceil(hpInTier / hpPerLayer));
        
        return (tier * BRICK_VISUALS.layersPerTier) + numLayersInTier;
    }


    getColor() {
        const p = this.p;
        // This function now primarily returns the BASE color for the current tier, used for VFX.
        // The actual layered drawing with highlights happens in the draw() method.

        if (this.type === 'goal') {
            const hpPerLayer = BRICK_VISUALS.hpPerLayer.goal;
            const hpPerTier = BRICK_VISUALS.layersPerTier * hpPerLayer;
            const tier = Math.max(0, Math.floor((this.health - 1) / hpPerTier));
            const colorValues = BRICK_VISUALS.palettes.goal[Math.min(tier, BRICK_VISUALS.palettes.goal.length - 1)];
            return p.color(...colorValues);
        }
        if (this.type === 'ballCage') return p.color(100, 150, 255);
        if (this.type === 'explosive' || this.type === 'horizontalStripe' || this.type === 'verticalStripe') return p.color(255, 80, 80);

        const isMerged = this.widthInCells > 1 || this.heightInCells > 1;
        let hpPerLayer, palette;

        if (this.type === 'extraBall') {
            hpPerLayer = isMerged ? BRICK_VISUALS.hpPerLayer.long : BRICK_VISUALS.hpPerLayer.extraBall;
            palette = isMerged ? BRICK_VISUALS.palettes.long : BRICK_VISUALS.palettes.extraBall;
        } else { // normal
            hpPerLayer = isMerged ? BRICK_VISUALS.hpPerLayer.long : BRICK_VISUALS.hpPerLayer.normal;
            palette = isMerged ? BRICK_VISUALS.palettes.long : BRICK_VISUALS.palettes.normal;
        }
        
        const hpPerTier = BRICK_VISUALS.layersPerTier * hpPerLayer;
        const tier = Math.max(0, Math.floor((this.health - 1) / hpPerTier));
        const colorValues = palette[Math.min(tier, palette.length - 1)];
        return p.color(...colorValues);
    }

    draw(board) {
        const p = this.p;
        const pos = this.getPixelPos(board);
        const totalWidth = this.size * this.widthInCells;
        const totalHeight = this.size * this.heightInCells;
        
        if (this.type === 'normal' || this.type === 'extraBall' || this.type === 'goal') {
            const isMerged = this.widthInCells > 1 || this.heightInCells > 1;
            let hpPerLayer, palette;

            if (this.type === 'goal') {
                hpPerLayer = BRICK_VISUALS.hpPerLayer.goal;
                palette = BRICK_VISUALS.palettes.goal;
            } else if (this.type === 'extraBall') {
                hpPerLayer = isMerged ? BRICK_VISUALS.hpPerLayer.long : BRICK_VISUALS.hpPerLayer.extraBall;
                palette = isMerged ? BRICK_VISUALS.palettes.long : BRICK_VISUALS.palettes.extraBall;
            } else { // normal
                hpPerLayer = isMerged ? BRICK_VISUALS.hpPerLayer.long : BRICK_VISUALS.hpPerLayer.normal;
                palette = isMerged ? BRICK_VISUALS.palettes.long : BRICK_VISUALS.palettes.normal;
            }
            
            const hpPerTier = BRICK_VISUALS.layersPerTier * hpPerLayer;
            const tier = Math.max(0, Math.floor((this.health - 1) / hpPerTier));
            const baseColorValues = palette[Math.min(tier, palette.length - 1)];
            const baseColor = p.color(...baseColorValues);

            const hpInTier = ((this.health - 1) % hpPerTier) + 1;
            const numLayers = Math.max(1, Math.ceil(hpInTier / hpPerLayer));

            const layerShrinkStepX = totalWidth / 5;
            const layerShrinkStepY = totalHeight / 5;
            const extrusion = 2;

            // Draw base brick (the bottom-most, largest layer)
            let drawColor = baseColor;
            if (this.flashTime > 0) {
                drawColor = p.lerpColor(baseColor, p.color(255), 0.6);
            }
            const shadowColor = p.lerpColor(drawColor, p.color(0), 0.4);

            p.noStroke();
            p.fill(shadowColor);
            p.rect(pos.x, pos.y + extrusion, totalWidth, totalHeight, 2);
            p.fill(drawColor);
            p.rect(pos.x, pos.y, totalWidth, totalHeight, 2);
            
            // Draw stacked layers on top
            for (let i = 1; i < numLayers; i++) {
                const layerWidth = totalWidth - i * layerShrinkStepX;
                const layerHeight = totalHeight - i * layerShrinkStepY;
                const offsetX = (totalWidth - layerWidth) / 2;
                const offsetY = (totalHeight - layerHeight) / 2;
                const layerPos = { x: pos.x + offsetX, y: pos.y + offsetY };
                
                // Lighten upper layers
                const colorFactor = 1 + (i * 0.08);
                const layerColor = p.color(p.red(drawColor) * colorFactor, p.green(drawColor) * colorFactor, p.blue(drawColor) * colorFactor);
                const layerShadowColor = p.lerpColor(layerColor, p.color(0), 0.4);

                p.fill(layerShadowColor);
                p.rect(layerPos.x, layerPos.y + extrusion, layerWidth, layerHeight, 2);
                p.fill(layerColor);
                p.rect(layerPos.x, layerPos.y, layerWidth, layerHeight, 2);
            }

            if (this.flashTime > 0) this.flashTime--;

            // Draw icons on top
            const cX = pos.x + totalWidth / 2;
            const cY = pos.y + totalHeight / 2;
            if (this.type === 'extraBall') {
                p.fill(0, 150); 
                p.textAlign(p.CENTER, p.CENTER); 
                p.textSize(this.size * 0.6); 
                p.text('+1', cX, cY + 1); 
            }
        } else if (this.type === 'ballCage') {
            const cX = pos.x + this.size / 2;
            const cY = pos.y + this.size / 2;
            const cornerRadius = 2;
            const extrusion = 3;
            
            const mainColor = this.getColor();
            const shadowColor = p.lerpColor(mainColor, p.color(0), 0.4);

            // Draw shadow/extrusion
            p.noStroke();
            p.fill(shadowColor);
            p.rect(pos.x, pos.y + extrusion, this.size, this.size, cornerRadius);

            // Draw hollow border
            p.noFill();
            let borderColor = mainColor;
            if (this.flashTime > 0) {
                borderColor = p.lerpColor(mainColor, p.color(255), 0.6);
                this.flashTime--;
            }
            p.stroke(borderColor);
            p.strokeWeight(3);
            p.rect(pos.x + 1.5, pos.y + 1.5, this.size - 3, this.size - 3, cornerRadius);

            // Draw green ball inside
            p.fill(0, 255, 127); // Ball green
            p.noStroke();
            p.ellipse(cX, cY, this.size * 0.5);

        } else {
             // --- Existing draw logic for other brick types ---
            const mainColor = this.getColor();
            const shadowColor = p.lerpColor(mainColor, p.color(0), 0.4);
            const cornerRadius = 2;
            const extrusion = 3;

            // Draw shadow/extrusion
            p.noStroke();
            p.fill(shadowColor);
            p.rect(pos.x, pos.y + extrusion, totalWidth, totalHeight, cornerRadius);
            
            let drawColor = mainColor;
            if (this.flashTime > 0) {
                drawColor = p.lerpColor(mainColor, p.color(255), 0.6);
                this.flashTime--;
            }
            p.fill(drawColor);
            p.rect(pos.x, pos.y, totalWidth, totalHeight, cornerRadius);
            
            const cX = pos.x + totalWidth / 2;
            const cY = pos.y + totalHeight / 2;
            
            if (this.type === 'explosive') { 
                p.noFill(); 
                p.stroke(0, 150); 
                p.strokeWeight(1); 
                p.ellipse(cX, cY, this.size * 0.25); 
            } else if (this.type === 'horizontalStripe') { 
                p.fill(255, 255, 255, 200); 
                p.noStroke();
                const arrowWidth = this.size * 0.4; 
                const arrowHeight = this.size * 0.25;
                p.triangle(cX - this.size * 0.1 - arrowWidth, cY, cX - this.size * 0.1, cY - arrowHeight, cX - this.size * 0.1, cY + arrowHeight);
                p.triangle(cX + this.size * 0.1 + arrowWidth, cY, cX + this.size * 0.1, cY - arrowHeight, cX + this.size * 0.1, cY + arrowHeight);
            } else if (this.type === 'verticalStripe') { 
                p.fill(255, 255, 255, 200); 
                p.noStroke();
                const arrowWidth = this.size * 0.25; 
                const arrowHeight = this.size * 0.4;
                p.triangle(cX, cY - this.size * 0.1 - arrowHeight, cX - arrowWidth, cY - this.size * 0.1, cX + arrowWidth, cY - this.size * 0.1);
                p.triangle(cX, cY + this.size * 0.1 + arrowHeight, cX - arrowWidth, cY + this.size * 0.1, cX + arrowWidth, cY + this.size * 0.1);
            }
        }
    }

    drawOverlays(board) {
         const p = this.p;
         const pos = this.getPixelPos(board);
         const totalWidth = this.size * this.widthInCells;
         const totalHeight = this.size * this.heightInCells;

         if (this.maxCoins > 0 && this.coins > 0 && this.coinIndicatorPositions) { 
             const numIndicators = p.min(this.coins, 20); 
             p.fill(255, 223, 0, 200); 
             p.noStroke(); 
             const indicatorSize = this.size / 6; 
             for (let i = 0; i < numIndicators; i++) {
                 // Adjust position to be within the potentially larger brick bounds
                 const indicatorX = pos.x + this.coinIndicatorPositions[i].x * this.widthInCells;
                 const indicatorY = pos.y + this.coinIndicatorPositions[i].y * this.heightInCells;
                 p.ellipse(indicatorX, indicatorY, indicatorSize); 
             }
         }
         if (this.overlay) {
            const cX = pos.x + totalWidth / 2; 
            const cY = pos.y + totalHeight / 2; 
            const auraSize = this.size * 0.7;
            const a = p.map(p.sin(p.frameCount * 0.05), -1, 1, 100, 255);
            if (this.overlay === 'healer') { 
                const pulseSize = auraSize * p.map(p.sin(p.frameCount * 0.1), -1, 1, 0.9, 1.1);
                const pulseAlpha = p.map(p.sin(p.frameCount * 0.1), -1, 1, 80, 80);
                p.noFill();
                p.strokeWeight(2);
                p.stroke(255, 255, 255, pulseAlpha);
                p.ellipse(cX, cY, pulseSize * 1.2);
                p.stroke(255, 255, 255, pulseAlpha * 0.8);
                p.ellipse(cX, cY, pulseSize * 1.5);
            } else if (this.overlay === 'builder') {
                const triSize = this.size * 0.25;
                const offset = this.size * 0.3;
                p.noStroke();
                // Shadow
                p.fill(0, 0, 0, 100);
                p.triangle(cX, cY - offset - triSize, cX - triSize, cY - offset, cX + triSize, cY - offset); // Top
                p.triangle(cX, cY + offset + triSize, cX - triSize, cY + offset, cX + triSize, cY + offset); // Bottom
                p.triangle(cX - offset - triSize, cY, cX - offset, cY - triSize, cX - offset, cY + triSize); // Left
                p.triangle(cX + offset + triSize, cY, cX + offset, cY - triSize, cX + offset, cY + triSize); // Right
                // Main triangles
                p.fill(135, 206, 250);
                p.triangle(cX, cY - offset - triSize + 1, cX - triSize + 1, cY - offset, cX + triSize - 1, cY - offset); // Top
                p.triangle(cX, cY + offset + triSize - 1, cX - triSize + 1, cY + offset, cX + triSize - 1, cY + offset); // Bottom
                p.triangle(cX - offset - triSize + 1, cY, cX - offset, cY - triSize + 1, cX - offset, cY + triSize - 1); // Left
                p.triangle(cX + offset + triSize - 1, cY, cX + offset, cY - triSize + 1, cX + offset, cY + triSize - 1); // Right
            } else if (this.overlay === 'mine') { 
                p.stroke(255, 99, 71, a); p.strokeWeight(2); p.noFill(); p.ellipse(cX, cY, auraSize); p.ellipse(cX, cY, auraSize*0.5); 
            }
         }
         
        if (state.isDebugView) {
            const cX = pos.x + totalWidth / 2;
            const cY = pos.y + totalHeight / 2;
            p.textAlign(p.CENTER, p.CENTER);
            const textSize = this.size * 0.3;
            p.textSize(textSize);
            p.noStroke();

            const hpText = `${Math.ceil(this.health)}`;
            const hasCoinText = this.coins > 0;
            const coinText = hasCoinText ? `${Math.ceil(this.coins)}` : '';
            
            // Determine panel dimensions
            let panelWidth = p.textWidth(hpText);
            let panelHeight;
            if (hasCoinText) {
                panelWidth = p.max(panelWidth, p.textWidth(coinText));
                panelHeight = (textSize * 2) + 4; // Two lines of text plus padding
            } else {
                panelHeight = textSize + 4; // One line of text plus padding
            }
            panelWidth += 4; // Padding on width

            // Draw panel
            p.fill(0, 0, 0, 150);
            p.rect(cX - panelWidth / 2, cY - panelHeight / 2, panelWidth, panelHeight, 2);

            // Draw texts
            if (hasCoinText) {
                p.fill(255);
                p.text(hpText, cX, cY - textSize / 2); // HP text on top
                p.fill(255, 223, 0); // Yellow for coin
                p.text(coinText, cX, cY + textSize / 2); // Coin text below
            } else {
                p.fill(255);
                p.text(hpText, cX, cY);
            }
        }
    }
}