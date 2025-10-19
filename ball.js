// ball.js

let brickSprite;

function drawGlossyCircle(buffer, pos, radius, color) {
    // Main circle
    buffer.fill(color);
    buffer.noStroke();
    buffer.ellipse(pos.x, pos.y, radius * 2);

    // Inset shadow effect using a radial gradient for a smoother look
    buffer.noFill();
    const shadowGradient = buffer.drawingContext.createRadialGradient(
        pos.x, pos.y, 0,
        pos.x, pos.y, radius
    );
    shadowGradient.addColorStop(0.7, 'rgba(0,0,0,0)');
    shadowGradient.addColorStop(1, 'rgba(0,0,0,0.5)');
    buffer.drawingContext.fillStyle = shadowGradient;
    buffer.ellipse(pos.x, pos.y, radius * 2);

    // Glossy highlight effect
    const highlightX = pos.x - radius * 0.3;
    const highlightY = pos.y - radius * 0.3;
    const highlightW = radius * 0.6;
    const highlightH = radius * 0.5;
    buffer.fill(255, 255, 255, 120);
    buffer.noStroke();
    buffer.ellipse(highlightX, highlightY, highlightW, highlightH);
}


class Projectile {
    constructor(p, pos, vel, damage) {
        this.p = p;
        this.pos = pos;
        this.vel = vel;
        this.damage = damage;
        this.radius = 6; // 50% larger than 4
        this.isDead = false;
        this.lifespan = 120; // Failsafe
    }

    update(board, bricks) {
        this.pos.add(this.vel);
        this.lifespan--;
        if (this.lifespan <= 0) {
            this.isDead = true;
            return null;
        }

        // Wall collision
        if (this.pos.x < board.x || this.pos.x > board.x + board.width || this.pos.y < board.y || this.pos.y > board.y + board.height) {
            this.isDead = true;
            return null;
        }

        // Brick collision
        const gridC = Math.floor((this.pos.x - board.genX) / board.gridUnitSize);
        const gridR = Math.floor((this.pos.y - board.genY) / board.gridUnitSize);

        if (gridC >= 0 && gridC < board.cols && gridR >= 0 && gridR < board.rows) {
            const brick = bricks[gridC][gridR];
            if (brick) {
                this.isDead = true;
                const hitResult = brick.hit(this.damage, 'projectile', board);
                if (hitResult) {
                    return { type: 'brick_hit', ...hitResult, source: 'projectile' };
                }
            }
        }
        return null;
    }

    draw() {
        this.p.push();
        this.p.translate(this.pos.x, this.pos.y);
        this.p.rotate(this.vel.heading());
        this.p.fill(255, 255, 0);
        this.p.noStroke();
        // Draw rect centered at (0,0) after translation
        const height = 6; // 50% larger than 4
        this.p.rect(-this.radius, -height / 2, this.radius * 2, height);
        this.p.pop();
    }
}

export class HomingProjectile {
    constructor(p, pos, vel, damage, target) {
        this.p = p;
        this.pos = pos;
        this.vel = vel;
        this.damage = damage;
        this.target = target;
        this.radius = 6;
        this.isDead = false;
        this.maxSpeed = 8;
        this.turnRate = 0.2;
    }

    update(board, bricks) {
        if (this.target && this.target.health > 0) {
            const targetPos = this.target.getPixelPos(board).add(this.target.size / 2, this.target.size / 2);
            const desiredVel = this.p.constructor.Vector.sub(targetPos, this.pos);
            const dist = desiredVel.mag();
            desiredVel.normalize();
            desiredVel.mult(this.maxSpeed);

            const steer = this.p.constructor.Vector.sub(desiredVel, this.vel);
            steer.limit(this.turnRate); // Use turnRate to control how sharply it can turn
            this.vel.add(steer);
            this.vel.limit(this.maxSpeed);
            
            // If very close, just snap to the target to guarantee a hit and prevent orbiting
            if (dist < this.target.size * 0.5) {
                this.pos.set(targetPos);
            }
        } else {
            // Target is dead or gone, accelerate straight
            this.vel.mult(1.05);
            this.vel.limit(this.maxSpeed * 1.5);
        }

        this.pos.add(this.vel);

        // Wall collision
        if (this.pos.x < board.x || this.pos.x > board.x + board.width || this.pos.y < board.y || this.pos.y > board.y + board.height) {
            this.isDead = true;
            return null;
        }

        // Brick collision
        const gridC = Math.floor((this.pos.x - board.genX) / board.gridUnitSize);
        const gridR = Math.floor((this.pos.y - board.genY) / board.gridUnitSize);
        if (gridC >= 0 && gridC < board.cols && gridR >= 0 && gridR < board.rows) {
            if (bricks[gridC][gridR]) {
                this.isDead = true;
                return { type: 'homing_explode', pos: this.pos, radius: board.gridUnitSize * 2, damage: this.damage };
            }
        }
        return null;
    }

    draw() {
        this.p.noStroke();
        const a = this.p.map(this.p.sin(this.p.frameCount * 0.2), -1, 1, 150, 255);
        this.p.fill(255, 100, 0, a);
        this.p.ellipse(this.pos.x, this.pos.y, this.radius * 2.5);
        this.p.fill(255, 200, 0);
        this.p.ellipse(this.pos.x, this.pos.y, this.radius * 2);
    }
}

export class MiniBall {
    constructor(p, x, y, vel, gridUnitSize) { 
        this.p = p;
        this.pos = p.createVector(x,y); 
        this.vel = vel; 
        this.radius = gridUnitSize * 0.2; // 4 / 20
        this.brickHitCooldowns = new Map();
        this.isDead = false;
        this.mainBallIsDead = false;
    }

    update(board, ball, checkBrickCollisions) {
        for (const [brick, cooldown] of this.brickHitCooldowns.entries()) {
            if (cooldown - 1 <= 0) {
                this.brickHitCooldowns.delete(brick);
            } else {
                this.brickHitCooldowns.set(brick, cooldown - 1);
            }
        }

        const speed = this.vel.mag();
        const steps = Math.ceil(speed / (this.radius * 0.8));
        const stepVel = this.p.constructor.Vector.div(this.vel, steps);
        let hitEvents = [];

        for (let i = 0; i < steps; i++) {
            this.pos.add(stepVel);
            const collisionEvents = checkBrickCollisions(this);
            hitEvents.push(...collisionEvents);

            if (collisionEvents.length > 0) {
                break;
            }
            
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
            if (wallHit) {
                if (this.mainBallIsDead) {
                    this.isDead = true;
                    return hitEvents;
                }
                if (ball) {
                    const event = ball.takeDamage(5, 'miniball_wall');
                    if (event) hitEvents.push(event);
                }
                break;
            }
        }
        return hitEvents;
    }

    draw() { 
        this.p.fill(127, 255, 212); // Aquamarine, a lighter green
        this.p.noStroke(); 
        this.p.ellipse(this.pos.x, this.pos.y, this.radius * 2); 
    }
}

export class Ball { 
    constructor(p, x, y, type, gridUnitSize, stats, { isGhost = false, lifetimeInSeconds = 1 } = {}) { 
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
        this.brickHitCooldowns = new Map();
        this.isDead = false;
        this.isDying = false; // New property for "last stand"
        
        this.radius = gridUnitSize * 0.32; // 6.4 / 20

        this.isGhost = isGhost;
        if (this.isGhost) {
            this.maxLifetime = lifetimeInSeconds * 60; // frames
            this.lifetime = this.maxLifetime;
            this.hp = Infinity;
            this.powerUpUses = 0;
            this.trail = []; // No trail for ghost ball
        }
        
        switch(type) {
            case 'classic': this.maxHp = stats.ballMaxHp * 1.5; this.hp = this.maxHp; this.powerUpUses = this.powerUpMaxUses = 0; break;
            case 'explosive': this.powerUpUses = this.powerUpMaxUses = 2; break;
            case 'piercing': this.powerUpUses = this.powerUpMaxUses = 2; this.isPiercing = false; this.piercingContactsLeft = 0; this.piercedBricks.clear(); break;
            case 'split': this.powerUpUses = this.powerUpMaxUses = 1; break;
            case 'brick': this.powerUpUses = this.powerUpMaxUses = 1; break;
            case 'bullet': this.powerUpUses = this.powerUpMaxUses = 3; break;
            case 'homing': this.powerUpUses = this.powerUpMaxUses = 2; break;
            case 'giant': 
                this.radius = gridUnitSize * 0.8; 
                this.maxHp = 20; 
                this.hp = 20; 
                this.powerUpUses = 0; 
                this.piercedBricks.clear();
                this.damageDealtForHpLoss = 0;
                break;
        }

        if (this.isGhost) this.hp = Infinity; // Re-apply after switch
    } 

    launch(force, ballSpeedMultiplier) { 
        let speed = (this.type === 'giant') ? 0.3 : ballSpeedMultiplier;
        this.vel = force.mult(speed); 
        this.isMoving = true; 
        if (!this.isGhost && this.type !== 'giant') this.hp = this.maxHp;
        return 'playing'; // new gameState
    } 

    update(board, checkBrickCollisions) { 
        if (this.isGhost) {
            this.lifetime--;
            if (this.lifetime <= 0) {
                this.isDead = true;
                return [];
            }
        }
        if (!this.isMoving) return []; 
        if (this.flashTime > 0) this.flashTime--;

        for (const [brick, cooldown] of this.brickHitCooldowns.entries()) {
            if (cooldown - 1 <= 0) {
                this.brickHitCooldowns.delete(brick);
            } else {
                this.brickHitCooldowns.set(brick, cooldown - 1);
            }
        }
        
        if (!this.isGhost) {
            this.trail.push(this.pos.copy());
            if (this.trail.length > 15) this.trail.shift();
        }
        
        this.angle += 0.05;

        const speed = this.vel.mag();
        const steps = Math.ceil(speed / (this.radius * 0.8));
        const stepVel = this.p.constructor.Vector.div(this.vel, steps);
        let hitEvents = [];

        for(let i=0; i<steps; i++) {
            this.pos.add(stepVel);
            const collisionEvents = checkBrickCollisions(this);
            hitEvents.push(...collisionEvents);
            
            if (collisionEvents.length > 0) {
                break;
            }

            const right = board.x + board.width - board.border/2, bottom = board.y + board.height - board.border/2, left = board.x + board.border/2, top = board.y + board.border/2;
            let wallHit = false;
            if (this.pos.x - this.radius < left || this.pos.x + this.radius > right) { this.vel.x *= -1; this.pos.x = this.p.constrain(this.pos.x, left + this.radius, right - this.radius); wallHit = true; } 
            if (this.pos.y - this.radius < top || this.pos.y + this.radius > bottom) { this.vel.y *= -1; this.pos.y = this.p.constrain(this.pos.y, top + this.radius, bottom - this.radius); wallHit = true; }
            if (wallHit) {
                if (this.isDying && this.type !== 'giant') {
                    this.isDead = true;
                    hitEvents.push({ type: 'dying_ball_death', pos: this.pos.copy() });
                    break; 
                }
                if (this.isPiercing) {
                    this.piercedBricks.clear();
                }
                const event = this.takeDamage(10, 'wall');
                if (event) hitEvents.push(event);
                break;
            }
        }
        return hitEvents;
    }

    takeDamage(amount, source = 'brick') {
        if (this.isGhost) return null; // No damage to ghosts
        // Allow damage to dying balls to be processed by shared HP, but don't re-trigger 'dying' state
        if (this.isPiercing && source === 'brick') return null;

        const damageDealt = amount;
        let event = { type: 'damage_taken', source, ballType: this.type, damageAmount: damageDealt };
        
        // isDead logic is now handled in sketch.js based on shared HP
        return event;
    }


    usePowerUp(board, skipDecrement = false) {
        if (this.isGhost || (!skipDecrement && this.powerUpUses <= 0) || !this.isMoving) return null;
        if (!skipDecrement) {
            this.powerUpUses--;
        }
        
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
            case 'bullet':
                const speed = this.gridUnitSize * 0.6; // 25% slower
                const damage = 10;
                const gridC = Math.round((this.pos.x - board.genX) / board.gridUnitSize);
                const gridR = Math.round((this.pos.y - board.genY) / board.gridUnitSize);
                const spawnX = board.genX + gridC * board.gridUnitSize + board.gridUnitSize / 2;
                const spawnY = board.genY + gridR * board.gridUnitSize + board.gridUnitSize / 2;
                const spawnPos = this.p.createVector(spawnX, spawnY);

                powerUpResult.effect = {
                    type: 'spawn_projectiles',
                    projectiles: [
                        new Projectile(this.p, spawnPos.copy(), this.p.createVector(0, -speed), damage),
                        new Projectile(this.p, spawnPos.copy(), this.p.createVector(0, speed), damage),
                        new Projectile(this.p, spawnPos.copy(), this.p.createVector(-speed, 0), damage),
                        new Projectile(this.p, spawnPos.copy(), this.p.createVector(speed, 0), damage),
                    ]
                };
                powerUpResult.sound = 'bulletFire';
                break;
            case 'homing':
                powerUpResult.effect = { type: 'spawn_homing_projectile' };
                powerUpResult.sound = 'homingLaunch';
                break;
        }
        return powerUpResult;
    }

    draw(buffer) {
        buffer = buffer || this.p;

        if (this.isGhost) {
            const fadeDuration = 0.25 * 60; // 0.25s in frames
            let alpha = 100; // Base transparency
            if (this.lifetime < fadeDuration) {
                alpha = buffer.map(this.lifetime, 0, fadeDuration, 0, 100);
            }
            buffer.noStroke();
            buffer.fill(0, 255, 127, alpha);
            buffer.ellipse(this.pos.x, this.pos.y, this.radius * 2);
            return;
        }

        const ballColor = buffer.color(0, 255, 127);
        
        this.trail.forEach((t, i) => { const alpha = buffer.map(i, 0, this.trail.length, 0, 80); buffer.fill(ballColor.levels[0], ballColor.levels[1], ballColor.levels[2], alpha); buffer.noStroke(); buffer.ellipse(t.x, t.y, this.radius * 2 * (i/this.trail.length)); });
        buffer.noStroke();
        
        let mainFillColor;
        if (this.type === 'giant') { 
            const c1 = buffer.color(148, 0, 211); 
            const c2 = buffer.color(75, 0, 130); 
            mainFillColor = buffer.lerpColor(c1, c2, buffer.sin(buffer.frameCount * 0.1)); 
        } else { 
            mainFillColor = (this.flashTime > 0 ? buffer.color(255) : ballColor); 
        }

        const noPowerUps = this.powerUpUses <= 0;

        switch(this.type) {
            case 'classic': 
            case 'giant': 
                drawGlossyCircle(buffer, this.pos, this.radius, mainFillColor);
                break;
            case 'explosive': 
                drawGlossyCircle(buffer, this.pos, this.radius, mainFillColor);
                if (!noPowerUps) { 
                    const glowAlpha = buffer.map(buffer.sin(buffer.frameCount * 0.15), -1, 1, 150, 220);
                    buffer.noFill();
                    buffer.stroke(255, 0, 0, glowAlpha);
                    buffer.strokeWeight(3);
                    buffer.ellipse(this.pos.x, this.pos.y, this.radius * 2.3);
                } 
                break;
            case 'piercing': 
                drawGlossyCircle(buffer, this.pos, this.radius, mainFillColor);
                if (!noPowerUps) { 
                    buffer.stroke(200); buffer.strokeWeight(1.5); 
                    if (buffer.drawingContext) buffer.drawingContext.setLineDash([3, 3]); 
                    buffer.noFill(); 
                    buffer.ellipse(this.pos.x, this.pos.y, this.radius * 2.2); 
                    if (buffer.drawingContext) buffer.drawingContext.setLineDash([]); 
                } 
                if(this.isPiercing) { 
                    const glowSize = buffer.map(buffer.sin(buffer.frameCount * 0.2), -1, 1, 2.5, 3.0); 
                    buffer.fill(255, 255, 255, 80); 
                    buffer.noStroke(); 
                    buffer.ellipse(this.pos.x, this.pos.y, this.radius * glowSize); 
                    buffer.fill(255, 255, 255, 120); 
                    buffer.ellipse(this.pos.x, this.pos.y, this.radius * 2.2); 
                } 
                break;
            case 'split': 
                buffer.push(); 
                buffer.translate(this.pos.x, this.pos.y); 
                if (!noPowerUps) { 
                    buffer.rotate(this.angle); 
                    for (let i = 0; i < 3; i++) { 
                        const a = buffer.TWO_PI/3 * i; 
                        const x = buffer.cos(a) * this.radius/2;
                        const y = buffer.sin(a) * this.radius/2;
                        drawGlossyCircle(buffer, {x, y}, this.radius * 0.55, mainFillColor);
                    } 
                } else { 
                    drawGlossyCircle(buffer, {x: 0, y: 0}, this.radius, mainFillColor); 
                } 
                buffer.pop(); 
                break;
            case 'brick': 
                drawGlossyCircle(buffer, this.pos, this.radius, mainFillColor);
                if (!noPowerUps) {
                    buffer.push();
                    buffer.translate(this.pos.x, this.pos.y);
                    buffer.rotate(this.angle);
                    const legDist = this.radius * 0.8;
                    const legSize = this.radius * 0.4;
                    const brickColor = buffer.color(100, 150, 255);
                    const brickShadowColor = buffer.lerpColor(brickColor, buffer.color(0), 0.4);

                    for (let i = 0; i < 4; i++) {
                        const angle = buffer.PI / 4 + i * buffer.PI / 2;
                        const x = buffer.cos(angle) * legDist;
                        const y = buffer.sin(angle) * legDist;
                        
                        buffer.fill(brickShadowColor);
                        buffer.noStroke();
                        buffer.rect(x - legSize/2, y - legSize/2 + 1, legSize, legSize, 1);
                        
                        buffer.fill(brickColor);
                        buffer.rect(x - legSize/2, y - legSize/2, legSize, legSize, 1);
                    }
                    buffer.pop();
                }
                break;
            case 'bullet': 
                drawGlossyCircle(buffer, this.pos, this.radius, mainFillColor);
                if (!noPowerUps) {
                    buffer.push();
                    buffer.translate(this.pos.x, this.pos.y);
                    buffer.noStroke();
                    buffer.fill(0, 150);
                    const ellipseW = this.radius * 0.6;
                    const ellipseH = this.radius * 0.2;
                    const offset = this.radius * 0.8;

                    buffer.ellipse(0, -offset, ellipseW, ellipseH);
                    buffer.ellipse(0, offset, ellipseW, ellipseH);
                    buffer.ellipse(-offset, 0, ellipseH, ellipseW);
                    buffer.ellipse(offset, 0, ellipseH, ellipseW);
                    buffer.pop();
                }
                break;
            case 'homing': 
                drawGlossyCircle(buffer, this.pos, this.radius, mainFillColor);
                if (!noPowerUps) { 
                    buffer.noFill(); 
                    buffer.stroke(255, 100, 0, 200); 
                    buffer.strokeWeight(2); 
                    buffer.ellipse(this.pos.x, this.pos.y, this.radius * 1.5); 
                    buffer.ellipse(this.pos.x, this.pos.y, this.radius * 0.8); 
                } 
                break;
            default: 
                drawGlossyCircle(buffer, this.pos, this.radius, mainFillColor);
        }
    } 
}

export function createBallVisuals(p) {
    const size = 40;
    const types = ['classic', 'explosive', 'piercing', 'split', 'brick', 'bullet', 'homing', 'giant'];
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