# Brick Breaker Game Development Log

This file tracks the features and changes requested for the p5.js Brick Breaker game.

## Internal Naming Conventions

To ensure clear communication, here are the internal names for various game elements:

*   **Ball Types:**
    *   `classic`: Yellow ball, no abilities but 150% base HP. The starting ball.
    *   `explosive`: Yellow ball with red glow, power-up creates an explosion.
    *   `piercing`: Yellow ball, power-up lets it fly through a set number of bricks.
    *   `split`: Yellow ball, power-up splits it into three.
    *   `brick`: Yellow ball, power-up spawns a ring of bricks.
    *   `bullet`: Yellow ball, power-up fires 4 piercing projectiles.
    *   `homing`: Yellow ball, power-up launches a seeking projectile.
    *   `giant`: A large, purple, consumable ball that pierces all bricks.

*   **Brick Types:**
    *   `normal`: The standard, multi-layered brick. Its color and number of layers indicate its health. Can host overlays.
    *   `goal`: Yellow brick. All goal bricks must be destroyed to clear the level.
    *   `extraBall`: Green brick that grants an extra ball when destroyed.
    *   `explosive`: Orange brick that explodes when destroyed.
    *   `horizontalStripe` / `verticalStripe`: Red bricks that clear their row/column when destroyed.

*   **Brick Overlays:** (Applied to `normal` bricks)
    *   `builder`: Light blue `+` aura. Spawns/buffs bricks at the end of a turn.
    *   `healer`: Light green circular aura. Heals nearby bricks at the end of a turn.
    *   `mine`: Red circular aura. Explodes when hit by the ball.

*   **Game States:**
    *   `aiming`: Player is aiming the ball.
    *   `playing`: Ball is in motion.
    *   `levelClearing`: All goal bricks are gone, waiting for the ball to die to proceed.
    *   `levelComplete`: Level is won, awaiting player input to start the next.
    *   `gameOver`: All balls are lost, awaiting player input to restart.

---

## Progression & Feature Unlocks

The game features a persistent progression system based on the player's main XP Level. **XP and Main Level are never reset.** Run-specific progress like coins and shop upgrades are reset upon Game Over.

New features are unlocked at the following levels:

*   **Level 1:** Start with the `ClassicBall` and 3 starting balls per run.
*   **Level 2:** Unlock `ExplosiveBall`. The **Explosive Damage** upgrade appears in the shop.
*   **Level 3:** Unlock **Coins** and the **Shop**.
*   **Level 4:** Unlock the **Combo System** and **Mine** combo rewards.
*   **Level 5:** Increase the number of **+1 Ball Bricks** that spawn in levels.
*   **Level 6:** Unlock `SplitBall`. The **Split Damage** upgrade appears in the shop.
*   **Level 7:** Unlock `ExplosiveBrick` spawns in levels.
*   **Level 8:** Unlock the ability to **purchase Extra Balls** in the shop.
*   **Level 9:** Unlock `PiercingBall`. The **Piercing Damage** upgrade appears in the shop.
*   **Level 10:** Unlock **Stripe Brick** combo rewards.
*   **Level 11:** Gain **+1 Starting Ball** (total 4).
*   **Level 12:** Unlock `BrickBall`. The **Brick Ball Coin %** upgrade appears in the shop.
*   **Level 13:** Unlock the **Bonus XP** upgrade in the shop.
*   **Level 14:** Unlock **Giant Ball** combo rewards.
*   **Level 15:** Unlock `BulletBall`.
*   **Level 18:** Unlock `HomingBall`.

---

## Request Log (Latest First)

### Date: 2024-08-14

**Features & Changes:**

1.  **XP Progression Fix:**
    *   Corrected the formula for the experience required to level up. It now follows the intended scaling curve (50 for Lv2, 150 for Lv3, 300 for Lv4, etc.), ensuring a more balanced progression.

2.  **Documentation & UI:**
    *   Performed a full audit of the project and updated the `README.md` to accurately reflect all current game mechanics, including the `BulletBall`, `HomingBall`, and the full unlock progression up to level 18.
    *   The "Cheat XP" button in the Level Settings modal now correctly displays "+5000 XP".

### Date: 2024-08-13

**Features & Changes:**

1.  **Brick Visual Overhaul:**
    *   The visuals for `normal` bricks have been completely redesigned to clearly communicate health.
    *   **Color Tiers:** Bricks now cycle through four distinct color tiers based on major 50 HP thresholds.
    *   **Pyramid Layers:** Within each color tier, bricks gain a new visible layer on top for every 10 HP, stacking up to a maximum of 5 layers. This creates an intuitive "pyramid" effect that shows health at a glance.

2.  **Quality of Life & UI:**
    *   **Auto-Buy Ball:** If the player runs out of balls but has enough coins to purchase a new one, the game will now automatically buy a ball for them to prevent an unnecessary game over.
    *   **Result Overlay Fix:** Fixed a rendering order bug that was causing the "Game Over" and "Level Complete" screens to be hidden behind other game elements.
    *   **XP Sound Reset:** The sound effect for collecting XP orbs now resets its pitch if no orbs have been collected in the last 40 frames, improving audio feedback.
    *   **Cheat XP Button:** This button in the Level Settings now adds XP directly for faster testing.

### Date: 2024-08-12

**Features & Changes:**

1.  **Gameplay & Balancing:**
    *   **Comprehensive Speed-Up:** The "Speed Up" button now affects the entire game simulation, running it at 3x speed. This includes physics, animations, cooldowns, VFX lifespans, and magnetic attraction forces.
    *   **Shop Unlocks:** Shop upgrades for specific ball types (e.g., Explosive Damage) are now hidden until the corresponding ball is unlocked.
    *   **New Upgrade: Bonus XP:** A new shop upgrade that increases XP gain is now available, unlocking at Level 13.
    *   **Level 5 Unlock:** The unlock at level 5 has been changed from "+1 Starting Ball" to increasing the number of "+1 Ball Bricks" that appear in levels.
    *   **Rebalancing:** Adjusted the cost for purchasing extra balls and the stats for the Brick Ball coin upgrade.

2.  **VFX & SFX:**
    *   **XP Collection SFX:** The sound for collecting XP orbs now increases in pitch with each subsequent orb collected in a chain.
    *   **Mini-Ball Magnetism:** The small balls from `SplitBall` now have their own magnetic radius to help collect XP orbs.

3.  **UI & Quality of Life:**
    *   **XP Bar Animation:** The white "pending XP" preview bar now remains static while the main blue bar animates to fill up to it, providing clearer feedback.
    *   **Shop Text:** Updated "Permanent Upgrades" to the more accurate "Upgrades for this run".

### Date: 2024-08-09

**Features & Changes:**

1.  **New Progression System & Feature Unlocks:**
    *   **Persistent XP:** Player's main level and XP are no longer reset on Game Over, creating a continuous progression path.
    *   **Feature Gating:** Major game systems (new balls, shop, combos, etc.) are now unlocked gradually as the player levels up.
    *   **Level Up Modal:** The level-up visual effect has been replaced with a popup panel that clearly announces the newly unlocked feature.

2.  **New Ball Type: `ClassicBall`:**
    *   Added the `ClassicBall`, a new starting ball with no special abilities but 150% of the standard ball's HP, providing a durable option for new players.

3.  **UI & Quality of Life:**
    *   **Player Level Badge:** The player's XP level is now shown in a compact, gem-like "XP Ore" badge in the top-left corner.
    *   The `startingBalls` for a run is now determined by the player's main level unlocks (3, or 4).

### Date: 2024-08-08

**Features & Changes:**

1.  **New Progression System:**
    *   **XP and Leveling:** The score system has been completely replaced with a player leveling system based on Experience Points (XP).
    *   **XP Bar:** A new, persistent XP bar is displayed at the top of the screen.
    *   **Leveling Curve:** The XP required to level up increases with each level.

2.  **New Loot System: XP Orbs:**
    *   **Brick Drops:** Destroying a brick now drops XP Orbs. The number of orbs is based on the brick's initial maximum health (1 orb per 10 HP).
    *   **Orb Collection:** Orbs become collectible after a 1-second delay. The player's ball has a magnetic field that automatically collects nearby orbs.
    *   **UI Feedback:** Collected XP is added to a "pending" pool for the current turn, which is visualized on the XP bar. At the end of the turn, the pending XP is officially added to the player's total.

3.  **VFX & SFX:**
    *   Added new visuals for XP Orbs (idle, attraction, collection).
    *   Added new sound effects for collecting an orb and for leveling up.
    *   Added a major visual effect for the "LEVEL UP!" moment.

4.  **UI & Quality of Life:**
    *   **Player Level Badge:** The player's XP level is now shown in a compact, gem-like "XP Ore" badge in the top-left corner.
    *   **Game Level Display:** The current game level (difficulty) is now also displayed in the top-left, separate from the player's XP level.
    *   The "Score" display has been removed from the UI.
    *   A "Cheat XP" button was added to the shop for easier testing of the new progression system.

### Date: 2024-08-07

**Features & Changes:**

1.  **Gameplay & Balancing:**
    *   **PiercingBall Rebalance:** This ball has been significantly changed to create a high-risk, high-reward playstyle.
        *   **During Power-up:** The ball is now completely intangible. It phases through bricks without dealing damage and without incrementing the combo, acting as a purely strategic move.
        *   **Normal State:** When *not* using its power-up, the ball now takes 2 damage for every brick it hits. This makes it a fragile ball that requires careful aim to preserve.
    *   **BrickBall Enhancement:** The `BrickBall`'s power-up can now destroy and replace `normal` bricks even if they have a `Builder`, `Healer`, or `Mine` overlay, increasing its utility.

2.  **Visual Fixes:**
    *   **ExplosiveBall Visuals:** The special visuals for the `ExplosiveBall` (its pulsating red glow and orange outline) now correctly disappear once all of its power-up uses have been consumed, making it consistent with other ball types.

### Date: 2024-08-06

**Features & Changes:**

1.  **Gameplay & Balancing:**
    *   **Ball Size:** The four standard ball types (`explosive`, `piercing`, `split`, `brick`) have been made 20% smaller for better maneuverability.
    *   **SplitBall Combo:** The small balls generated by the `SplitBall`'s power-up now correctly contribute to the main combo counter.
    *   **Smarter Game Over:** The game over condition is now more forgiving. The game will only end if the player is out of regular balls, has no `GiantBall`s left, AND cannot afford to purchase a new ball from the shop.

2.  **Game Logic & VFX:**
    *   **Builder/Healer Stacking:** The effects of `Builder` and `Healer` bricks now stack. A brick buffed by multiple Builders will receive a multiplied health bonus. A new brick spawned on a tile targeted by multiple builders will be created with multiplied health. Healers also stack their healing effect on a single target.
    *   **BrickBall Power-up Fix:** The `BrickBall`'s power-up ability now correctly destroys any bricks it replaces, ensuring their on-death effects (explosions, coin drops, etc.) are triggered before the new bricks are spawned.
    *   **StripeBrick Visuals:** The arrows on `StripeBrick`s have been inverted to point outwards, more clearly indicating the direction of the blast.

### Date: 2024-08-05

**Features & Changes:**

1.  **VFX & Visuals Overhaul:**
    *   **Explosion VFX:** The explosion effect (from `ExplosiveBall` and `ExplosiveBrick`) has been reworked. It now starts at full size, with its border growing thicker as it fades out for a more impactful feel.
    *   **Stripe Brick VFX:** The line-clearing effect for `StripeBrick` no longer uses a generic white flash. It now shoots a burst of fast-moving particles in the direction of the line clear.
    *   **ExplosiveBall Visuals:** The `ExplosiveBall` is now a vibrant yellow ball with a pulsating red outer glow.
    *   **StripeBrick Visuals:** `StripeBrick`s are now red with white, elevator-style arrows indicating their clear direction, improving readability.

2.  **UI Improvements:**
    *   The "Giant: X" stat has been removed from the top-left UI for a cleaner look.
    *   The `GiantBall` button in the ball selector UI is now completely hidden if the player has zero giant balls.
    *   When giant balls are awarded from a high combo, a "+N Giant Ball" text now appears below the main combo announcement to provide clear feedback.

3.  **Game Logic Tuning:**
    *   **Level Generation:** Bricks designated to be `Builder` or `Healer` hosts are now also eligible to receive extra HP from the level's HP Pool, making them more resilient.

4.  **Documentation:**
    *   Added a new "Internal Naming Conventions" section to this README to standardize terms for game elements.

### Date: 2024-08-02

**Features & Changes:**

1.  **New Combo & Bonus System:**
    *   **Combo Counter:** A combo counter increases with every brick hit by the main ball or destroyed by any means. It resets to 0 if the main ball hits a wall.
    *   **End-of-Turn Bonuses:** The highest combo achieved in a turn determines the rewards spawned for the next turn.
    *   **VFX:** Added combo counter VFX and a special announcement effect for the max combo achieved.

2.  **Combo Rewards (Tiered System):**
    *   **Mine Overlay (Combo 1-15):** For every 3 combo points, a "Mine" overlay is placed on a random existing brick. When the host brick is hit, it creates a 10-damage explosion to its 8 neighbors.
    *   **Stripe Bricks (Combo 1-60):** For every 15 combo points, a new `StripeBrick` (Horizontal or Vertical, 10 HP) is spawned in an empty space. When destroyed, it deals 30 damage to its entire row or column.
    *   **Giant Ball (Combo 50+):** For every 50 combo points (no limit), the player is awarded one consumable `GiantBall`.

3.  **New Ball Type: Giant Ball (Consumable):**
    *   A new UI element tracks the number of Giant Balls available.
    *   Using a Giant Ball does not consume a regular ball from the player's stock.
    *   **Behavior:** It's a larger, slower ball that moves through bricks (does not bounce), dealing 1000 damage to each brick it touches. It has a fixed 10 HP and is destroyed upon hitting the first wall.
    *   **Limitation:** Turns where a Giant Ball is used do not generate combos or combo bonuses.

4.  **Balancing and UI:**
    *   Builder overlay spawn cost increased to 100 HP Pool.
    *   Healer overlay spawn cost increased to 80 HP Pool.
    *   Default spawn chance for both changed to 3%.
    *   Their inputs in the Level Settings are now number fields instead of sliders for easier input.

### Date: 2024-08-01

**Features & Changes:**

1.  **New Brick Overlay: Builder**
    *   **Visual:** A `(+)` shaped aura on top of a normal brick. Dies if the host brick is destroyed.
    *   **Behavior:** At the end of each turn, the Builder spawns four 10-HP bricks in the nearest available adjacent spots. If a direction is blocked, it will build past the obstruction. If a direction is fully blocked to the edge, it will grant +10 HP to the last brick in that line instead.
    *   **VFX:** Added a visual effect for the building action.

2.  **New Brick Overlay: Healer**
    *   **Visual:** A circular aura on top of a normal brick. Dies with the host.
    *   **Behavior:** At the end of each turn, the Healer restores 10 HP to all 8 surrounding non-special bricks.
    *   **VFX:** Added a visual effect for the healing action.

3.  **Updated Level Generation for Overlays:**
    *   Added `BuilderBrickChance` and `HealerBrickChance` (default 5% each) to the Level Generation Settings.
    *   During the HP distribution phase of level generation, a normal brick has a chance to become a Builder or Healer host instead of gaining HP. This conversion costs 50 HP from the level's HP Pool.

4.  **Responsive In-Game UI Redesign:**
    *   The Ball Health Bar and Power-Up counter are now drawn where the Ball Selector UI appears (bottom-center for portrait, mid-left for landscape).
    *   The number of health segments per row is no longer fixed at 10 but adapts dynamically to the available screen width.

### Date: 2024-07-31

**Features & Changes:**

1.  **Project `README.md`:**
    *   This file was created to log the context of development requests moving forward.

2.  **Level Generation Overhaul:**
    *   **Creative Formulas:** Added new procedural generation algorithms to the "Formulaic" pattern pool to create more varied and interesting brick layouts, including:
        *   Circles
        *   Triangles (isosceles)
        *   Rotated Rectangles
        *   Polygons/Stars
    *   **Strict Brick & HP Distribution Logic:**
        *   The generation process now strictly adheres to the specified brick count and HP pool.
        *   Goal Bricks and +1 Ball Bricks are placed first and do not count towards the level's `brickCount`.
        *   The engine places 10-HP bricks until the `brickCount` is met, generating new formulaic shapes if the previous one runs out of space.
        *   After the target brick count is reached, any remaining HP from the `HPPool` is distributed among the placed normal bricks, increasing their health.
    *   **Updated Default Balancing:**
        *   Starting Bricks: `20`
        *   Bricks per Level: `10`
        *   Max Bricks: `300`
        *   Starting HP Pool: `100`
        *   HP Pool per Level: `80`
        *   HP Multiplier/Lvl: `1.05`
    *   **New "Few Brick Layout" Feature:**
        *   Added a "FewBrickLayoutChance" parameter to Level Settings (default 10%).
        *   When triggered, the level generates with only 20% of the normal brick count, but with the full HP pool distributed among them, creating rare and difficult levels with very tough bricks.

3.  **UI Redesign: In-Canvas Health Bar & Power-Up Counter:**
    *   The HTML-based health bar and power-up indicator have been removed.
    *   These UI elements are now drawn directly onto the p5.js canvas.
    *   They are located in the bottom-left of the game area.
    *   The health bar's segments now visually represent partial health (e.g., a half-filled segment for 5 HP).
    *   The bar supports high HP values by wrapping into multiple rows, with a maximum of 10 segments per row, stacking from the bottom-up.