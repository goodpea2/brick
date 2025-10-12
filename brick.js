// brick.js

import { GAME_CONSTANTS } from './balancing.js';

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
        if (this.overlay === 'mine' && (source === 'ball' || source === 'mine')) { 
            events.push({ type: 'explode_mine', pos: pos.copy() });
            this.overlay = null; 
        }

        return {
            damageDealt,
            coinsDropped,
            isBroken: this.isBroken(),
            color: this.getColor(),
            center: this.p.createVector(pos.x + this.size / 2, pos.y + this.size / 2),
            events,
            source,
        };
    }

    getColor() {
        if (this.type === 'goal') return this.p.color(255, 215, 0); 
        if (this.type === 'extraBall') return this.p.color(0, 255, 127); 
        if (this.type === 'explosive') return this.p.color(255, 69, 0);
        if (this.type === 'horizontalStripe' || this.type === 'verticalStripe') return this.p.color(255, 80, 80);
        
        const from = this.p.color(100, 150, 255); 
        const to = this.p.color(128, 0, 128); 
        const amount = this.p.map(this.health, 10, GAME_CONSTANTS.MAX_BRICK_HP, 0, 1, true); 
        return this.p.lerpColor(from, to, amount);
    }

    draw(board) {
        const p = this.p;
        const pos = this.getPixelPos(board);
        p.stroke(0); 
        p.strokeWeight(2); 
        p.fill(this.getColor()); 
        p.rect(pos.x, pos.y, this.size, this.size);
        
        const cX = pos.x + this.size / 2;
        const cY = pos.y + this.size / 2;
        
        if (this.type === 'extraBall') { 
            p.fill(0, 150); 
            p.textAlign(p.CENTER, p.CENTER); 
            p.textSize(this.size * 0.6); 
            p.text('+1', cX, cY + 1); 
        } else if (this.type === 'explosive') { 
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

    drawOverlays(board) {
         const p = this.p;
         const pos = this.getPixelPos(board);
         if (this.maxCoins > 0 && this.coins > 0 && this.coinIndicatorPositions) { 
             const numIndicators = p.min(this.coins, 20); 
             p.fill(255, 223, 0, 200); 
             p.noStroke(); 
             const indicatorSize = this.size / 6; 
             for (let i = 0; i < numIndicators; i++) {
                 // Recalculate indicator positions based on brick's current pos
                 const indicatorX = pos.x + this.coinIndicatorPositions[i].x;
                 const indicatorY = pos.y + this.coinIndicatorPositions[i].y;
                 p.ellipse(indicatorX, indicatorY, indicatorSize); 
             }
         }
         if (this.overlay) {
            const cX = pos.x + this.size / 2; 
            const cY = pos.y + this.size / 2; 
            const auraSize = this.size * 0.8;
            p.noFill(); 
            p.strokeWeight(2);
            const a = p.map(p.sin(p.frameCount * 0.05), -1, 1, 100, 255);
            if (this.overlay === 'healer') { 
                p.stroke(144, 238, 144, a); p.ellipse(cX, cY, auraSize); 
            } else if (this.overlay === 'builder') { 
                p.stroke(135, 206, 250, a); p.line(cX - auraSize/2, cY, cX + auraSize/2, cY); p.line(cX, cY - auraSize/2, cX, cY + auraSize/2); 
            } else if (this.overlay === 'mine') { 
                p.stroke(255, 99, 71, a); p.ellipse(cX, cY, auraSize); p.ellipse(cX, cY, auraSize*0.5); 
            }
         }
    }
}