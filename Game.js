/**
 * Main Game class
 * Manages overall game state, rules, and coordination between components
 */
class Game {
    constructor() {
        // Game dimensions (in game units)
        this.tableWidth = 178;
        this.tableHeight = 89;

        // Calculate scale to fit table nicely in viewport
        this.calculateScale();

        // Initialize game components
        this.createComponents();

        // Game state
        this.displayMode = 1; // 1: starting positions, 2: random reds, 3: random all
        this.isPaused = false;
        this.collisionReports = [];
        this.ballsMoving = false;
        this.isPlacingCueBall = true; // Start with cue ball placement
        this.cueBallPlacementX = null;
        this.cueBallPlacementY = null;
        this.consecutiveColoredPotted = 0;
        this.lastPottedBall = null;

        // Initialize game
        this.initializeGame();
    }

    /**
     * Calculate scale and offsets based on window size
     */
    calculateScale() {
        // Target table size should be about 60% of viewport
        const targetWidth = windowWidth * 0.6;
        const targetHeight = windowHeight * 0.6;

        // Calculate scale to fit within target size while maintaining aspect ratio
        const scaleX = targetWidth / this.tableWidth;
        const scaleY = targetHeight / this.tableHeight;
        this.scale = Math.min(scaleX, scaleY, 5); // Cap at 5 for reasonable size

        // Calculate actual pixel dimensions
        this.tablePixelWidth = this.tableWidth * this.scale;
        this.tablePixelHeight = this.tableHeight * this.scale;

        // Center the table
        this.offsetX = (windowWidth - this.tablePixelWidth) / 2;
        this.offsetY = (windowHeight - this.tablePixelHeight) / 2;
    }

    /**
     * Create or recreate game components
     */
    createComponents() {
        this.table = new Table(this.tableWidth, this.tableHeight, this.scale, this.offsetX, this.offsetY);
        this.ballManager = new BallManager(this.scale, this.offsetX, this.offsetY);
        this.cue = new Cue(this.scale, this.offsetX, this.offsetY);
    }

    /**
     * Update table position on window resize
     */
    updateTablePosition() {
        const oldOffsetX = this.offsetX;
        const oldOffsetY = this.offsetY;

        // Recalculate scale and offsets
        this.calculateScale();

        // Update component offsets
        this.table.offsetX = this.offsetX;
        this.table.offsetY = this.offsetY;
        this.ballManager.offsetX = this.offsetX;
        this.ballManager.offsetY = this.offsetY;
        this.cue.offsetX = this.offsetX;
        this.cue.offsetY = this.offsetY;

        // Update all ball body positions
        const deltaX = this.offsetX - oldOffsetX;
        const deltaY = this.offsetY - oldOffsetY;

        for (let ball of this.ballManager.balls) {
            if (!ball.isPotted) {
                Body.setPosition(ball.body, {
                    x: ball.body.position.x + deltaX,
                    y: ball.body.position.y + deltaY
                });
            }
        }

        // Update cushion positions
        for (let cushion of this.table.cushions) {
            Body.setPosition(cushion, {
                x: cushion.position.x + deltaX,
                y: cushion.position.y + deltaY
            });
        }

        // Update boundary wall positions
        for (let wall of this.table.walls) {
            Body.setPosition(wall, {
                x: wall.position.x + deltaX,
                y: wall.position.y + deltaY
            });
        }

        // Ensure D-zone balls stay within bounds
        if (this.isPlacingCueBall) {
            this.updateCueBallPosition();
        }
    }
    /**
     * Update the cue ball position after window resize to prevent movement
     */
    updateCueBallPosition() {
        const baulkLine = 44.5;
        const dRadius = 14.5;


        const cueBall = this.ballManager.getCueBall();
        if (cueBall) {
            // Ensure cue ball remains within the D-zone
            const newX = (baulkLine) * this.scale;
            const newY = (this.tableHeight / 2) * this.scale;

            // Update the cue ball's position
            Body.setPosition(cueBall.body, {
                x: this.offsetX + newX,
                y: this.offsetY + newY
            });
        }
    }

    /**
     * Initialize game with starting ball positions
     */
    initializeGame() {
        this.ballManager.setupStartingPositions(false); // Don't add cue ball
        // Cue ball placement will be handled manually
        this.isPlacingCueBall = true;
    }

    /**
     * Update game logic
     */
    update() {
        if (!this.isPaused) {
            this.ballManager.update();
            this.cue.update();

            // Check if any balls are still moving
            this.ballsMoving = this.checkBallsMoving();

            // Check for potted balls
            this.checkPottedBalls();

            // Safety check for escaped balls
            this.checkEscapedBalls();

            // Update cue ball placement preview
            if (this.isPlacingCueBall && mouseIsPressed) {
                this.cueBallPlacementX = mouseX;
                this.cueBallPlacementY = mouseY;
            }
        }
    }

    /**
     * Check for balls that have escaped the table bounds
     */
    checkEscapedBalls() {
        const margin = 50; // Extra margin beyond table bounds

        for (let ball of this.ballManager.balls) {
            if (ball.isPotted) continue;

            const pos = ball.body.position;
            const tableLeft = this.offsetX - margin;
            const tableRight = this.offsetX + this.width * this.scale + margin;
            const tableTop = this.offsetY - margin;
            const tableBottom = this.offsetY + this.height * this.scale + margin;

            // If ball is outside bounds, reset it to a safe position
            if (pos.x < tableLeft || pos.x > tableRight ||
                pos.y < tableTop || pos.y > tableBottom) {

                console.warn(`Ball ${ball.id} escaped table bounds! Resetting position.`);

                // Reset to center of table
                Body.setPosition(ball.body, {
                    x: this.offsetX + this.width * this.scale / 2,
                    y: this.offsetY + this.height * this.scale / 2
                });

                // Stop the ball
                Body.setVelocity(ball.body, { x: 0, y: 0 });
                Body.setAngularVelocity(ball.body, 0);
            }
        }

    }

    /**
     * Check if any balls are still moving
     */
    checkBallsMoving() {
        const minVelocity = 0.1; // Threshold for considering a ball "stopped"

        for (let ball of this.ballManager.balls) {
            if (ball.isPotted) continue;

            const velocity = ball.body.velocity;
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

            if (speed > minVelocity) {
                return true; // At least one ball is still moving
            }
        }

        return false; // All balls have stopped
    }

    /**
     * Render all game elements
     */
    render() {
        // Add glow effect around table area
        push();
        drawingContext.shadowBlur = 50;
        drawingContext.shadowColor = 'rgba(0, 0, 0, 0.8)';
        fill(0, 0, 0, 50);
        noStroke();
        rect(
            this.offsetX - 50,
            this.offsetY - 50,
            this.tablePixelWidth + 100,
            this.tablePixelHeight + 100,
            20
        );
        drawingContext.shadowBlur = 0;
        pop();

        // Table and game elements are rendered on top of city background
        push();
        translate(this.offsetX, this.offsetY);

        // Render game components

        this.table.render();
        this.ballManager.render();

        // Render cue ball placement mode
        if (this.isPlacingCueBall) {
            this.renderCueBallPlacement();
        } else {
            this.cue.render();
        }

        pop();

        // Render UI elements (not translated)
        this.renderUI();
    }

    /**
     * Render UI elements (score, instructions, etc.)
     */
    renderUI() {
        push();

        // Semi-transparent background for UI
        fill(0, 0, 0, 180);
        noStroke();
        rect(5, 5, 300, 165, 5);

        // Title
        fill(255);
        textAlign(LEFT);
        textSize(18);
        textStyle(BOLD);
        text("SNOOKER GAME", 15, 30);

        textStyle(NORMAL);
        textSize(14);

        // Display mode
        fill(255, 255, 100);
        text(`Mode: ${this.getModeName()}`, 15, 55);

        // Instructions
        fill(255);
        textSize(12);
        text("Controls:", 15, 75);
        if (this.isPlacingCueBall) {
            fill(255, 255, 100);
            text("• Click in D-zone to place cue ball", 15, 90);
            fill(255);
            text("• Press 1, 2, or 3 to change ball layout", 15, 105);
            text("• Press M to toggle sound", 15, 120);
        } else {
            text("• Click & drag from cue ball to aim", 15, 90);
            text("• Pull back for more power", 15, 105);
            text("• Press 1, 2, or 3 to change ball layout", 15, 120);
            text("• Press M to toggle sound", 15, 135);
        }

        // Sound status
        if (soundManager && soundManager.muted) {
            fill(255, 100, 100);
            text("🔇 Sound: OFF", 15, 155);
        } else {
            fill(100, 255, 100);
            text("🔊 Sound: ON", 15, 155);
        }

        // Ball count
        const activeBalls = this.ballManager.balls.filter(b => !b.isPotted).length;
        const pottedReds = this.ballManager.balls.filter(b => b.isPotted && b.colorName === 'red').length;

        fill(0, 0, 0, 180);
        rect(width - 155, 5, 150, 60, 5);

        fill(255);
        textAlign(RIGHT);
        textSize(14);
        text(`Active Balls: ${activeBalls}`, width - 15, 30);
        text(`Potted Reds: ${pottedReds}`, width - 15, 50);

        // Collision reports with better styling
        if (this.collisionReports.length > 0) {
            fill(0, 0, 0, 180);
            rect(5, height - 85, 300, 80, 5);

            fill(255, 255, 100);
            textAlign(LEFT);
            textSize(12);
            text("Recent Events:", 15, height - 65);

            fill(255);
            // Show last 3 collisions
            for (let i = 0; i < Math.min(3, this.collisionReports.length); i++) {
                const alpha = 255 - i * 50; // Fade older reports
                fill(255, alpha);
                text(`• ${this.collisionReports[i]}`, 15, height - 45 + i * 18);
            }
        }

        // Game state indicators
        const cueBall = this.ballManager.getCueBall();
        if (cueBall && cueBall.isPotted) {
            // Warning when cue ball is potted
            fill(255, 0, 0);
            textAlign(CENTER);
            textSize(24);
            text("CUE BALL POTTED!", width / 2, height / 2);
            textSize(16);
            text("(Press 1, 2, or 3 to reset)", width / 2, height / 2 + 30);
        } else if (this.ballsMoving) {
            // Show waiting message when balls are moving
            fill(255, 255, 100);
            textAlign(CENTER);
            textSize(16);
            text("Wait for balls to stop...", width / 2, height - 100);
        }

        pop();
    }

    /**
     * Get display mode name
     */
    getModeName() {
        switch(this.displayMode) {
            case 1: return "Starting Positions";
            case 2: return "Random Reds";
            case 3: return "Random All";
            default: return "Unknown";
        }
    }

    /**
     * Render cue ball placement mode
     */
    renderCueBallPlacement() {
        push();

        // Highlight D-zone
        const dRadius = 14.5; // Half of D diameter (29.2/2)
        const baulkLine = 44.5;
        const dCenterX = (baulkLine) * this.scale;
        const dCenterY = (this.tableHeight / 2) * this.scale;

        // Draw D-zone with highlight
        strokeWeight(3);
        stroke(255, 255, 100, 150);
        fill(255, 255, 100, 30);
        arc(dCenterX, dCenterY, dRadius * 2 * this.scale, dRadius * 2 * this.scale, HALF_PI, -HALF_PI);

        // Draw preview cue ball at mouse position if in D-zone
        const mouseGameX = (mouseX - this.offsetX) / this.scale;
        const mouseGameY = (mouseY - this.offsetY) / this.scale;


        if (this.isValidCueBallPosition(mouseGameX, mouseGameY)) {
            // Valid position - show green preview
            fill(255, 255, 255, 200);
            stroke(0, 255, 0, 255);
            strokeWeight(2);
            circle(mouseX - this.offsetX, mouseY - this.offsetY, 2.625 * 2 * this.scale);

            // Show placement hint
            fill(0, 255, 0);
            noStroke();
            textAlign(CENTER);
            textSize(12);
            text("Click to place", mouseX - this.offsetX, mouseY - this.offsetY - 20);
        } else {
            // Invalid position - show red preview
            fill(255, 255, 255, 100);
            stroke(255, 0, 0, 255);
            strokeWeight(2);
            circle(mouseX - this.offsetX, mouseY - this.offsetY, 2.625 * 2 * this.scale);

            // Show error hint
            fill(255, 0, 0);
            noStroke();
            textAlign(CENTER);
            textSize(12);
            text("Must place in D-zone", mouseX - this.offsetX, mouseY - this.offsetY - 20);
        }

        // Instructions
        fill(255, 255, 100);
        textAlign(CENTER);
        textSize(18);
        text("Place the cue ball in the D-zone", 0, -this.tableHeight * this.scale / 2 - 30);

        pop();
    }

    /**
     * Check if position is valid for cue ball placement
     */
    isValidCueBallPosition(x, y) {
        // Must be in D-zone
        const dRadius = 14.5; // Half of D diameter
        const baulkLine = 44.5;
        const dCenterX = baulkLine;
        const dCenterY = 44.5; // Center of table height

        // Check if in D semicircle
        const dx = x - dCenterX;
        const dy = y - dCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Must be within D radius and on left side of baulk line
        if (distance <= dRadius && x <= baulkLine) {
            // Check if position is not occupied by another ball
            return this.ballManager.isValidPosition(x, y);
        }

        return false;
    }

    /**
     * Check for balls that have been potted
     */
    checkPottedBalls() {
        const pockets = this.table.pockets;
        const balls = this.ballManager.balls;

        for (let ball of balls) {
            if (ball.isPotted) continue; // Skip already potted balls

            // Get ball position in game units
            const ballX = (ball.body.position.x - this.offsetX) / this.scale;
            const ballY = (ball.body.position.y - this.offsetY) / this.scale;

            // Check each pocket
            for (let pocket of pockets) {
                const distance = dist(ballX, ballY, pocket.x, pocket.y);

                // If ball is close to pocket, apply attraction force (increased range for easier potting)
                if (distance < pocket.radius * 2.2 && distance > pocket.radius * 0.3) {
                    // Calculate stronger attraction force towards pocket center
                    const pocketX = this.offsetX + pocket.x * this.scale;
                    const pocketY = this.offsetY + pocket.y * this.scale;
                    const attractionStrength = 0.0008; // Increased from 0.0002
                    const force = {
                        x: (pocketX - ball.body.position.x) * attractionStrength,
                        y: (pocketY - ball.body.position.y) * attractionStrength
                    };
                    Body.applyForce(ball.body, ball.body.position, force);

                    // Reduce velocity more aggressively for easier capture
                    Body.setVelocity(ball.body, {
                        x: ball.body.velocity.x * 0.88, // Increased damping from 0.92
                        y: ball.body.velocity.y * 0.88
                    });
                }

                // If ball center is close enough to pocket center, it's potted (increased capture radius)
                if (distance < pocket.radius * 0.85) {
                    this.handleBallPotted(ball);
                    break;
                }
            }
        }
    }

    /**
     * Handle when a ball is potted
     */
    handleBallPotted(ball) {
        console.log(`%cBALL POTTED: ${ball.colorName}`, `color: ${this.getBallColor(ball.colorName)}`);
        ball.isPotted = true;

        // Remove from physics world
        World.remove(world, ball.body);

        // Play pocket drop sound
        if (soundManager) {
            soundManager.playPocketDrop();
        }

        // Add to collision reports
        const report = `${ball.colorName} ball potted!`;
        this.collisionReports.unshift(report);
        if (this.collisionReports.length > 5) {
            this.collisionReports.pop();
        }

        // Track consecutive colored ball potting
        if (ball.colorName !== 'red' && ball.colorName !== 'white') {
            if (this.lastPottedBall && this.lastPottedBall.colorName !== 'red' && this.lastPottedBall.colorName !== 'white') {
                this.consecutiveColoredPotted++;
                if (this.consecutiveColoredPotted >= 2) {
                    const errorReport = "ERROR: Two consecutive colored balls potted!";
                    this.collisionReports.unshift(errorReport);
                    console.warn(errorReport);
                }
            } else {
                this.consecutiveColoredPotted = 1;
            }
            this.respotColoredBall(ball);
        } else if (ball.colorName === 'red') {
            this.consecutiveColoredPotted = 0;
        } else if (ball.colorName === 'white') {
            // Cue ball potted - need to replace
            this.isPlacingCueBall = true;
            const report = "Cue ball potted! Place it in the D-zone";
            this.collisionReports.unshift(report);
        }

        this.lastPottedBall = ball;
    }
    
    /**
     * Get CSS color for console logging
     */
    getBallColor(colorName) {
        switch(colorName) {
            case 'white': return '#FFFFFF';
            case 'red': return '#DC143C';
            case 'yellow': return '#FFD700';
            case 'green': return '#008000';
            case 'brown': return '#8B4513';
            case 'blue': return '#0000FF';
            case 'pink': return '#FFC0CB';
            case 'black': return '#000000';
            default: return '#808080';
        }
    }

    /**
     * Re-spot a colored ball after it's potted
     */
    respotColoredBall(ball) {
        // Define standard spots for colored balls
        const spots = {
            yellow: { x: 44.5, y: 55.625 },
            green: { x: 44.5, y: 33.375 },
            brown: { x: 44.5, y: 44.5 },
            blue: { x: 89, y: 44.5 },
            pink: { x: 141, y: 44.5 },
            black: { x: 164, y: 44.5 }
        };

        const spot = spots[ball.colorName];
        if (spot) {
            // Check if spot is occupied
            if (this.ballManager.isValidPosition(spot.x, spot.y)) {
                // Re-create the ball at its spot
                ball.isPotted = false;
                ball.body = Bodies.circle(
                    this.offsetX + spot.x * this.scale,
                    this.offsetY + spot.y * this.scale,
                    ball.radius * this.scale,
                    {
                        restitution: 0.5,
                        friction: 0.01,
                        frictionAir: 0.015,
                        label: ball.id,
                        collisionFilter: {
                            category: CATEGORY_BALL,
                            mask: CATEGORY_BALL | CATEGORY_CUSHION
                        }
                    }
                );
                World.add(world, ball.body);

                const report = `${ball.colorName} ball re-spotted`;
                this.collisionReports.unshift(report);
            }
        }
    }

    /**
     * Handle keyboard input
     */
    handleKeyPress(key) {
        switch(key) {
            case '1':
                console.log('GAME MODE: Starting Positions');
                this.displayMode = 1;
                this.ballManager.setupStartingPositions(false); // Don't add cue ball
                this.cue.reset();
                this.isPlacingCueBall = true;
                this.consecutiveColoredPotted = 0;
                this.lastPottedBall = null;
                break;
            case '2':
                console.log('GAME MODE: Random Reds');
                this.displayMode = 2;
                this.ballManager.setupRandomReds(false); // Don't add cue ball
                this.cue.reset();
                this.isPlacingCueBall = true;
                this.consecutiveColoredPotted = 0;
                this.lastPottedBall = null;
                break;
            case '3':
                console.log('GAME MODE: Random All');
                this.displayMode = 3;
                this.ballManager.setupRandomAll(false); // Don't add cue ball
                this.cue.reset();
                this.isPlacingCueBall = true;
                this.consecutiveColoredPotted = 0;
                this.lastPottedBall = null;
                break;
        }
    }

    /**
     * Handle mouse press
     */
    handleMousePress(x, y) {
        if (this.isPlacingCueBall) {
            // Handle cue ball placement
            const gameX = (x - this.offsetX) / this.scale;
            const gameY = (y - this.offsetY) / this.scale;

            if (this.isValidCueBallPosition(gameX, gameY)) {
                // Place the cue ball
                console.log('CUE BALL PLACED');
                this.ballManager.addCueBall(gameX, gameY, true);
                this.isPlacingCueBall = false;
                const report = "Cue ball placed successfully";
                this.collisionReports.unshift(report);
            }
        } else if (!this.ballsMoving) {
            // Only allow aiming when balls have stopped
            const cueBall = this.ballManager.getCueBall();
            if (cueBall && !cueBall.isPotted) {
                this.cue.startAiming(x, y, cueBall);
            }
        }
    }

    /**
     * Handle mouse drag
     */
    handleMouseDrag(x, y) {
        if (!this.isPlacingCueBall) {
            this.cue.updateAiming(x, y);
        }
    }

    /**
     * Handle mouse release
     */
    handleMouseRelease() {
        if (!this.isPlacingCueBall) {
            const cueBall = this.ballManager.getCueBall();
            if (cueBall) {
                this.cue.shoot(cueBall);
            }
        }
    }

    /**
     * Handle collision events from Matter.js
     */
    handleCollisions(pairs) {
        for (let pair of pairs) {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            // Check if both bodies are balls (have labels)
            if (bodyA.label && bodyB.label &&
                bodyA.label !== 'ground' && bodyB.label !== 'ground') {

                // Find the ball objects
                const ballA = this.ballManager.balls.find(b => b.id === bodyA.label);
                const ballB = this.ballManager.balls.find(b => b.id === bodyB.label);

                // Only report collisions involving the cue ball
                if (ballA && ballB && (ballA.id === 'cue' || ballB.id === 'cue')) {
                    let report = '';
                    if (ballA.id === 'cue') {
                        report = `Cue ball hit ${ballB.colorName}`;
                        console.log('CUE HIT:', ballB.colorName);
                    } else {
                        report = `Cue ball hit ${ballA.colorName}`;
                        console.log('CUE HIT:', ballA.colorName);
                    }
                    this.collisionReports.unshift(report);

                    // Keep only recent reports
                    if (this.collisionReports.length > 5) {
                        this.collisionReports.pop();
                    }
                }
            } else if ((bodyA.label === 'cue' && bodyB.label === 'cushion') ||
                       (bodyA.label === 'cushion' && bodyB.label === 'cue')) {
                // Cue ball hit cushion
                const report = 'Cue ball hit cushion';
                this.collisionReports.unshift(report);
                if (this.collisionReports.length > 5) {
                    this.collisionReports.pop();
                }
            }
        }
    }
}