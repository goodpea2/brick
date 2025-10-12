// vfx.js

export class Particle { 
    constructor(p, x, y, c, velMag = 3, options={}) { 
        this.p = p; 
        this.pos = p.createVector(x, y); 
        this.vel = options.vel || p.constructor.Vector.random2D().mult(p.random(0.5, velMag)); 
        this.lifespan = options.lifespan || 255; 
        this.color = c; 
        this.size = options.size || 5; 
        if(options.target) { 
            this.target = options.target.copy(); 
            this.accel = p.constructor.Vector.sub(this.target, this.pos).normalize().mult(0.5); 
        } 
    } 
    update() { 
        if(this.target) { 
            this.vel.add(this.accel); 
            this.vel.limit(8); 
        } else { 
            this.vel.mult(0.95); 
        } 
        this.pos.add(this.vel); 
        this.lifespan -= 6; 
        if(this.target && this.p.dist(this.pos.x, this.pos.y, this.target.x, this.target.y) < 10) { 
            this.lifespan = 0;
        } 
    } 
    draw() { 
        this.p.noStroke(); 
        this.p.fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], this.lifespan); 
        this.p.ellipse(this.pos.x, this.pos.y, this.size, this.size); 
    } 
    isFinished() { 
        return this.lifespan < 0; 
    } 
}

export class Shockwave { 
    constructor(p, x, y, r, c, w = 8) { 
        this.p = p; 
        this.pos = p.createVector(x, y); 
        this.radius = r; 
        this.lifespan = 40; 
        this.color = c || p.color(255,150,0); 
        this.maxWeight = w; 
    } 
    update() { 
        this.lifespan--; 
    } 
    draw() { 
        this.p.noFill(); 
        const progress = (40 - this.lifespan) / 40; 
        const a = (1 - progress) * 255; 
        const c = this.color; 
        this.p.stroke(c.levels[0], c.levels[1], c.levels[2], a); 
        this.p.strokeWeight(progress * this.maxWeight); 
        this.p.ellipse(this.pos.x, this.pos.y, this.radius * 2); 
    } 
    isFinished() { 
        return this.lifespan <= 0; 
    } 
}

export class FloatingText { 
    constructor(p, x, y, t, c, options = {}) { 
        this.p = p; 
        this.pos = p.createVector(x, y); 
        this.vel = options.vel || p.createVector(0, -1); 
        this.text = t; 
        this.color = c; 
        this.lifespan = options.lifespan || 80; 
        this.size = options.size || 14; 
        this.accel = options.accel || p.createVector(0,0); 
        this.isBold = options.isBold || false; 
        this.scale = 1.0; 
        this.scaleRate = options.scaleRate || 0; 
    } 
    update() { 
        this.vel.add(this.accel); 
        this.pos.add(this.vel); 
        this.lifespan--; 
        this.scale += this.scaleRate; 
    } 
    draw() { 
        const a = this.p.map(this.lifespan, 0, 80, 0, 255); 
        this.p.fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], a); 
        this.p.noStroke(); 
        this.p.textSize(this.size * this.scale); 
        if (this.isBold) this.p.textStyle(this.p.BOLD); 
        this.p.textAlign(this.p.CENTER, this.p.CENTER); 
        this.p.text(this.text, this.pos.x, this.pos.y); 
        if (this.isBold) this.p.textStyle(this.p.NORMAL); 
    } 
    isFinished() { 
        return this.lifespan < 0; 
    } 
}

export class PowerupVFX { 
    constructor(p, x, y) { 
        this.p = p; 
        this.pos = p.createVector(x, y); 
        this.radius = 0; 
        this.maxRadius = 30; 
        this.lifespan = 20; 
    } 
    update() { 
        this.lifespan--; 
        this.radius = this.p.map(20 - this.lifespan, 0, 20, 0, this.maxRadius); 
    } 
    draw() { 
        const a = this.p.map(this.lifespan, 0, 20, 255, 0); 
        this.p.noFill(); 
        this.p.stroke(255, 255, 100, a); 
        this.p.strokeWeight(3); 
        this.p.ellipse(this.pos.x, this.pos.y, this.radius * 2); 
    } 
    isFinished() { 
        return this.lifespan < 0; 
    } 
}

export class StripeFlash {
    constructor(p, brick, direction, board) {
        this.p = p;
        this.direction = direction;
        this.lifespan = 20; 
        const brickPos = brick.getPixelPos(board);
        if (direction === 'horizontal') {
            this.x = board.x;
            this.y = brickPos.y;
            this.w = board.width;
            this.h = brick.size;
        } else { // vertical
            this.x = brickPos.x;
            this.y = board.y;
            this.w = brick.size;
            this.h = board.height;
        }
    }
    update() { this.lifespan--; }
    isFinished() { return this.lifespan <= 0; }
    draw() {
        const p = this.p;
        const progress = (20 - this.lifespan) / 20;
        const alpha = p.map(progress, 0, 1, 200, 0);
        const sizeMultiplier = p.map(progress, 0, 1, 0.1, 1.5);
        p.noStroke();
        p.fill(255, 200, 200, alpha);
        if (this.direction === 'horizontal') {
            p.rect(this.x, this.y + this.h/2 * (1 - sizeMultiplier), this.w, this.h * sizeMultiplier);
        } else {
            p.rect(this.x + this.w/2 * (1 - sizeMultiplier), this.y, this.w * sizeMultiplier, this.h);
        }
    }
}

export function createSplat(p, splatBuffer, x, y, brickColor, gridUnitSize) { 
    if (!splatBuffer) return; 
    const darkerColor = p.lerpColor(brickColor, p.color(0), 0.3); 
    splatBuffer.noStroke(); 
    splatBuffer.fill(darkerColor.levels[0], darkerColor.levels[1], darkerColor.levels[2], 20); 
    const splatSize = gridUnitSize * 1.2; 
    for (let i = 0; i < 5; i++) { 
        const offsetX = p.random(-splatSize / 2, splatSize / 2); 
        const offsetY = p.random(-splatSize / 2, splatSize / 2); 
        const d = p.random(splatSize * 0.2, splatSize * 0.5); 
        splatBuffer.ellipse(x + offsetX, y + offsetY, d, d); 
    } 
}

export function createBrickHitVFX(p, x, y, c) { 
    const vfx = [];
    for (let i = 0; i < 15; i++) {
        vfx.push(new Particle(p, x, y, c)); 
    }
    return vfx;
}

export function createBallDeathVFX(p, x, y) {
    const vfx = [];
    for (let i = 0; i < 30; i++) {
        vfx.push(new Particle(p, x, y, p.color(255, 255, 0), 4));
    }
    return vfx;
}