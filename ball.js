// ball.js

let brickSprite;

export class MiniBall {
    constructor(p, x, y, vel, gridUnitSize) { 
        this.p = p;
        this.pos = p.createVector(x,y); 
        this.vel = vel; 
        this.radius = gridUnitSize * 0.2; // 4 / 20
    }

    update(board, ball) {
        this.pos.add(this.vel);
        
        const right = board.x + board.width - board.border/2, 
              bottom = board.y + board.height - board.border/2, 
              left = board.x + board.border/2, 
              top = board.y + board.border/2;
              
        let wallHit = false;
        if (this.pos.x - this.radius < left || this.pos.x + this.radius > right) { 
            this.vel.x *= -1; 
            this.pos.x = this.p.constrain(this.pos.x, left + this.radius, right - this.radius); 
            wallHit = true;
        } 
        if (this.pos.y - this.radius < top || this.pos.y + this.radius > bottom) { 
            this.vel.y *= -1; 
            this.pos.y = this.p.constrain(this.pos.y, top + this.radius, bottom - this.radius); 
            wallHit = true;
        }
        if (wallHit && ball) {
            return ball.takeDamage(5, 'miniball_wall');
        }
        return null;
    }

    draw() { 
        this.p.fill(255, 255, 150); 
        this.p.noStroke(); 
        this.p.ellipse(this.pos.x, this.pos.y, this.radius * 2); 
    }
}

export class Ball { 
    constructor(p, x, y, type, gridUnitSize, stats) { 
        this.p = p;
        this.pos = p.createVector(x, y); 
        this.vel = p.createVector(0, 0); 
        this.isMoving = false; 
        this.maxHp = stats.ballMaxHp; 
        this.hp = this.maxHp; 
        this.flashTime = 0; 
        this.type = type; 
        this.trail = []; 
        this.angle = 0; 
        this.piercedBricks = new Set();
        this.stats = stats;
        this.gridUnitSize = gridUnitSize;
        
        this.radius = gridUnitSize * 0.32; // 6.4 / 20
        
        switch(type) {
            case 'explosive': this.powerUpUses = this.powerUpMaxUses = 2; break;
            case 'piercing': this.powerUpUses = this.powerUpMaxUses = 2; this.isPiercing = false; this.piercingContactsLeft = 0; this.piercedBricks.clear(); break;
            case 'split': this.powerUpUses = this.powerUpMaxUses = 1; break;
            case 'brick': this.powerUpUses = this.powerUpMaxUses = 1; break;
            case 'giant': this.radius = gridUnitSize * 0.8; this.maxHp = 10; this.hp = 10; this.powerUpUses = 0; this.piercedBricks.clear(); break;
        }
    } 

    launch(force, ballSpeedMultiplier) { 
        let speed = (this.type === 'giant') ? 0.3 : ballSpeedMultiplier;
        this.vel = force.mult(speed); 
        this.isMoving = true; 
        if (this.type !== 'giant') this.hp = this.maxHp;
        return 'playing'; // new gameState
    } 

    update(board, checkBrickCollisions) { 
        if (!this.isMoving) return []; 
        if (this.flashTime > 0) this.flashTime--;
        
        this.trail.push(this.pos.copy());
        if (this.trail.length > 15) this.trail.shift();
        
        this.angle += 0.05;

        const speed = this.vel.mag();
        const steps = Math.ceil(speed / (this.radius * 0.8));
        const stepVel = this.p.constructor.Vector.div(this.vel, steps);
        let hitEvents = [];

        for(let i=0; i<steps; i++) {
            this.pos.add(stepVel);
            hitEvents.push(...checkBrickCollisions(this));
            
            const right = board.x + board.width - board.border/2, bottom = board.y + board.height - board.border/2, left = board.x + board.border/2, top = board.y + board.border/2;
            let wallHit = false;
            if (this.pos.x - this.radius < left || this.pos.x + this.radius > right) { this.vel.x *= -1; this.pos.x = this.p.constrain(this.pos.x, left + this.radius, right - this.radius); wallHit = true; } 
            if (this.pos.y - this.radius < top || this.pos.y + this.radius > bottom) { this.vel.y *= -1; this.pos.y = this.p.constrain(this.pos.y, top + this.radius, bottom - this.radius); wallHit = true; }
            if (wallHit) {
                const event = this.takeDamage(10, 'wall');
                if (event) hitEvents.push(event);
                break;
            }
        }
        return hitEvents;
    }

    takeDamage(amount, source = 'brick') { 
        if (this.isPiercing && source === 'brick') return null; 
        
        this.hp -= amount; 
        this.flashTime = 15;
        
        let event = { type: 'damage_taken', source };
        
        if (this.hp <= 0 && this.isMoving) {
            this.isMoving = false;
            event.isDead = true;
        }
        return event;
    }

    usePowerUp() {
        if (this.powerUpUses <= 0 || !this.isMoving) return null;
        this.powerUpUses--;
        
        let powerUpResult = { vfx: [{type: 'powerup', pos: this.pos.copy()}] };

        switch(this.type) {
            case 'explosive': powerUpResult.effect = { type: 'explode', pos: this.pos.copy(), radius: this.gridUnitSize * 2.5 }; break;
            case 'piercing': this.isPiercing = true; this.piercingContactsLeft = this.stats.piercingContactCount; this.piercedBricks.clear(); powerUpResult.sound = 'piercingActivate'; break;
            case 'split':
                let v1 = this.vel.copy().rotate(this.p.radians(20));
                let v2 = this.vel.copy().rotate(this.p.radians(-20));
                powerUpResult.effect = { type: 'spawn_miniballs', miniballs: [ new MiniBall(this.p, this.pos.x, this.pos.y, v1, this.gridUnitSize), new MiniBall(this.p, this.pos.x, this.pos.y, v2, this.gridUnitSize) ] };
                powerUpResult.sound = 'split';
                break;
            case 'brick':
                powerUpResult.effect = { type: 'spawn_bricks', center: this.pos.copy(), coinChance: this.stats.brickSummonCoinChance };
                powerUpResult.sound = 'brickSpawn';
                break;
        }
        return powerUpResult;
    }

    draw(buffer) {
        buffer = buffer || this.p;
        this.trail.forEach((t, i) => { const alpha = buffer.map(i, 0, this.trail.length, 0, 80); buffer.fill(255, 255, 0, alpha); buffer.noStroke(); buffer.ellipse(t.x, t.y, this.radius * 2 * (i/this.trail.length)); });
        buffer.noStroke();
        if (this.type === 'giant') { const c1 = buffer.color(148, 0, 211); const c2 = buffer.color(75, 0, 130); buffer.fill(buffer.lerpColor(c1, c2, buffer.sin(buffer.frameCount * 0.1))); } else { buffer.fill(this.flashTime > 0 ? buffer.color(255) : buffer.color(255, 255, 0)); }

        const noPowerUps = this.powerUpUses <= 0;

        switch(this.type) {
            case 'giant': buffer.ellipse(this.pos.x, this.pos.y, this.radius * 2); break;
            case 'explosive': 
                if (!noPowerUps) { const glowAlpha = buffer.map(buffer.sin(buffer.frameCount * 0.15), -1, 1, 100, 200); buffer.noStroke(); buffer.fill(255, 0, 0, glowAlpha); buffer.ellipse(this.pos.x, this.pos.y, this.radius * 2.5); } 
                buffer.fill(this.flashTime > 0 ? buffer.color(255) : buffer.color(255, 223, 0));
                buffer.stroke(0, 150); 
                buffer.strokeWeight(1); 
                buffer.ellipse(this.pos.x, this.pos.y, this.radius * 2); 
                if (!noPowerUps) { buffer.noFill(); buffer.stroke(255, 69, 0); buffer.strokeWeight(2); buffer.ellipse(this.pos.x, this.pos.y, this.radius * 2.2); } 
                break;
            case 'piercing': buffer.ellipse(this.pos.x, this.pos.y, this.radius * 2); if (!noPowerUps) { buffer.stroke(200); buffer.strokeWeight(1.5); if (buffer.drawingContext) buffer.drawingContext.setLineDash([3, 3]); buffer.noFill(); buffer.ellipse(this.pos.x, this.pos.y, this.radius * 2.2); if (buffer.drawingContext) buffer.drawingContext.setLineDash([]); } if(this.isPiercing) { const glowSize = buffer.map(buffer.sin(buffer.frameCount * 0.2), -1, 1, 2.5, 3.0); buffer.fill(255, 255, 255, 80); buffer.noStroke(); buffer.ellipse(this.pos.x, this.pos.y, this.radius * glowSize); buffer.fill(255, 255, 255, 120); buffer.ellipse(this.pos.x, this.pos.y, this.radius * 2.2); } break;
            case 'split': buffer.push(); buffer.translate(this.pos.x, this.pos.y); if (!noPowerUps) { buffer.rotate(this.angle); for (let i = 0; i < 3; i++) { const a = buffer.TWO_PI/3 * i; buffer.ellipse(buffer.cos(a) * this.radius/2, buffer.sin(a) * this.radius/2, this.radius); } } else { buffer.ellipse(0, 0, this.radius * 2); } buffer.pop(); break;
            case 'brick': buffer.ellipse(this.pos.x, this.pos.y, this.radius * 2); if (!noPowerUps) { buffer.push(); buffer.translate(this.pos.x, this.pos.y); buffer.rotate(this.angle); if (!brickSprite) { const brickSize = this.gridUnitSize; brickSprite = this.p.createGraphics(brickSize, brickSize); brickSprite.stroke(0); brickSprite.strokeWeight(2); brickSprite.fill(100, 150, 255); brickSprite.rect(0,0,brickSize, brickSize); } buffer.image(brickSprite, -this.radius/2, -this.radius/2, this.radius, this.radius); buffer.pop(); } break;
            default: buffer.ellipse(this.pos.x, this.pos.y, this.radius * 2);
        }
    } 
}

export function createBallVisuals(p) {
    const size = 40;
    const types = ['explosive', 'piercing', 'split', 'brick', 'giant'];
    const visuals = {};
    const dummyStats = { ballMaxHp: 100 };
    const dummyGridUnitSize = 20;
    types.forEach(type => {
        const pg = p.createGraphics(size, size);
        pg.clear();
        const tempBall = new Ball(p, size / 2, size / 2, type, dummyGridUnitSize, dummyStats);
        tempBall.radius = size * 0.4; 
        tempBall.trail = []; 
        tempBall.flashTime = 0;
        tempBall.powerUpUses = tempBall.powerUpMaxUses; // Show powerup visuals
        tempBall.draw(pg);
        visuals[type] = pg.canvas.toDataURL();
        pg.remove();
    });
    return visuals;
}