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
        
        // Initialize score manager
        this.scoreManager = new ScoreManager();

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
            const wasMoving = this.ballsMoving;
            this.ballsMoving = this.checkBallsMoving();
            
            // If balls just stopped moving, end the shot
            if (wasMoving && !this.ballsMoving) {
                this.scoreManager.endShot();
            }

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
            const tableRight = this.offsetX + this.tableWidth * this.scale + margin;
            const tableTop = this.offsetY - margin;
            const tableBottom = this.offsetY + this.tableHeight * this.scale + margin;

            // If ball is outside bounds, reset it to a safe position
            if (pos.x < tableLeft || pos.x > tableRight ||
                pos.y < tableTop || pos.y > tableBottom) {

                console.warn(`Ball ${ball.id} escaped table bounds! Resetting position.`);

                // Reset to center of table
                Body.setPosition(ball.body, {
                    x: this.offsetX + this.tableWidth * this.scale / 2,
                    y: this.offsetY + this.tableHeight * this.scale / 2
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

        // Render cue ball placement preview or cue
        if (this.isPlacingCueBall) {
            this.renderCueBallPlacementPreview();
        } else {
            this.cue.render();
        }

        pop();

        // Render UI elements (not translated)
        this.renderUI();
        
        // Render cue ball placement instruction after UI (so it appears on top)
        if (this.isPlacingCueBall) {
            this.renderCueBallPlacementInstruction();
        }
    }

    /**
     * Render UI elements (score, instructions, etc.)
     */
    renderUI() {
        push();

        // Main menu panel with gradient background
        this.drawPanel(5, 5, 340, 200, 'SNOOKER CHAMPIONSHIP');
        
        // Game mode indicator
        fill(255, 255, 100);
        textAlign(LEFT);
        textSize(16);
        textStyle(BOLD);
        text(`${this.getModeName()}`, 20, 55);
        
        // Current player indicator
        textStyle(NORMAL);
        fill(200, 200, 255);
        textSize(14);
        text(`Current Player: ${this.scoreManager.currentPlayer}`, 20, 75);
        
        // Instructions section
        fill(200);
        textSize(11);
        text("CONTROLS", 20, 100);
        
        fill(255);
        textSize(10);
        if (this.isPlacingCueBall) {
            this.drawInstruction("Click D-zone", "Place cue ball", 20, 115);
            this.drawInstruction("1, 2, 3", "Change layout", 20, 130);
            this.drawInstruction("M", "Toggle sound", 20, 145);
        } else {
            this.drawInstruction("Drag from cue", "Aim shot", 20, 115);
            this.drawInstruction("Pull back", "Adjust power", 20, 130);
            this.drawInstruction("1, 2, 3", "Change layout", 20, 145);
            this.drawInstruction("M", "Toggle sound", 20, 160);
        }
        
        // Sound indicator
        textAlign(LEFT);
        if (soundManager && soundManager.muted) {
            fill(255, 100, 100);
            text("🔇 MUTED", 20, 185);
        } else {
            fill(100, 255, 100);
            text("🔊 SOUND ON", 20, 185);
        }

        // Scoreboard panel
        this.drawPanel(width - 320, 5, 315, 240, 'SCOREBOARD');
        this.renderScoreboard();
        
        // Statistics panel
        this.drawPanel(5, 215, 340, 180, 'GAME STATISTICS');
        this.renderStatistics();
        
        // Recent events panel with enhanced display
        this.renderRecentEvents();

        // Game state overlays
        const cueBall = this.ballManager.getCueBall();
        if (cueBall && cueBall.isPotted) {
            this.drawWarningOverlay("CUE BALL POTTED!", "Press 1, 2, or 3 to reset");
        } else if (this.ballsMoving) {
            this.drawStatusMessage("Wait for balls to stop...");
        }

        pop();
    }
    
    /**
     * Draw a styled panel
     */
    drawPanel(x, y, w, h, title) {
        push();
        
        // Panel background with gradient effect
        drawingContext.fillStyle = drawingContext.createLinearGradient(x, y, x, y + h);
        drawingContext.fillStyle.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
        drawingContext.fillStyle.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        drawingContext.fillRect(x, y, w, h);
        
        // Border
        stroke(255, 255, 100, 100);
        strokeWeight(1);
        noFill();
        rect(x, y, w, h, 8);
        
        // Title bar
        fill(255, 255, 100, 20);
        noStroke();
        rect(x, y, w, 30, 8, 8, 0, 0);
        
        // Title text
        fill(255, 255, 100);
        textAlign(CENTER);
        textSize(14);
        textStyle(BOLD);
        text(title, x + w/2, y + 20);
        
        pop();
    }
    
    /**
     * Draw control instruction
     */
    drawInstruction(key, action, x, y) {
        push();
        fill(255, 255, 100);
        textStyle(BOLD);
        text(key + ":", x, y);
        fill(255);
        textStyle(NORMAL);
        text(action, x + textWidth(key + ": ") + 5, y);
        pop();
    }
    
    /**
     * Render scoreboard
     */
    renderScoreboard() {
        const x = width - 300;
        let y = 50;
        const labelX = x;
        const valueX = width - 25;
        const rowHeight = 38;
        
        // Consistent text settings
        textAlign(LEFT);
        textStyle(NORMAL);
        
        // Player scores section
        this.drawScoreRow("PLAYER 1", this.scoreManager.player1Score, labelX, y, valueX,
                         this.scoreManager.currentPlayer === 1);
        y += rowHeight;
        this.drawScoreRow("PLAYER 2", this.scoreManager.player2Score, labelX, y, valueX,
                         this.scoreManager.currentPlayer === 2);
        
        // Separator line
        y += rowHeight;
        stroke(100);
        strokeWeight(1);
        line(x, y - 15, width - 25, y - 15);
        noStroke();
        
        // Stats section with consistent formatting
        // Current break
        this.drawStatRow("CURRENT BREAK", this.scoreManager.stats.currentBreak.toString(), 
                        labelX, y, valueX, color(255, 255, 100), 20);
        
        // Highest break
        y += rowHeight;
        this.drawStatRow("HIGHEST BREAK", this.scoreManager.stats.highestBreak.toString(), 
                        labelX, y, valueX, color(100, 255, 100), 16);
        
        // Balls remaining
        y += rowHeight;
        const activeBalls = this.ballManager.balls.filter(b => !b.isPotted).length;
        const totalReds = this.ballManager.balls.filter(b => b.colorName === 'red').length;
        const pottedReds = this.ballManager.balls.filter(b => b.isPotted && b.colorName === 'red').length;
        
        this.drawStatRow("BALLS REMAINING", `${activeBalls} (${totalReds - pottedReds} reds)`, 
                        labelX, y, valueX, color(255), 14);
    }
    
    /**
     * Draw a statistics row with consistent formatting
     */
    drawStatRow(label, value, labelX, y, valueX, valueColor, valueSize) {
        // Label
        fill(180);
        textAlign(LEFT);
        textSize(12);
        textStyle(NORMAL);
        text(label, labelX, y);
        
        // Value
        fill(valueColor);
        textAlign(RIGHT);
        textSize(valueSize);
        textStyle(BOLD);
        text(value, valueX, y + 2);
        
        // Reset
        textStyle(NORMAL);
        textAlign(LEFT);
    }
    
    /**
     * Draw score row
     */
    drawScoreRow(label, score, labelX, y, valueX, isActive) {
        push();
        
        if (isActive) {
            // Active player highlight
            fill(255, 255, 100, 30);
            noStroke();
            rect(labelX - 10, y - 22, valueX - labelX + 35, 32, 5);
        }
        
        // Player label
        fill(isActive ? 255 : 180);
        textAlign(LEFT);
        textSize(14);
        textStyle(NORMAL);
        text(label, labelX, y);
        
        // Score value
        fill(isActive ? color(255, 255, 100) : color(200));
        textAlign(RIGHT);
        textSize(26);
        textStyle(BOLD);
        text(score.toString(), valueX, y + 2);
        
        pop();
    }
    
    /**
     * Render game statistics
     */
    renderStatistics() {
        const x = 25;
        let y = 260;
        
        textAlign(LEFT);
        textSize(11);
        
        // Game time
        this.drawStat("Game Time", this.scoreManager.getGameTime(), x, y);
        y += 25;
        
        // Shot accuracy
        this.drawStat("Shot Accuracy", `${this.scoreManager.getShotAccuracy()}%`, x, y);
        y += 25;
        
        // Total shots
        this.drawStat("Total Shots", this.scoreManager.stats.totalShots.toString(), x, y);
        y += 25;
        
        // Balls potted per shot
        this.drawStat("Avg Pot Rate", this.scoreManager.getAveragePotRate(), x, y);
        y += 25;
        
        // Fouls
        this.drawStat("Fouls", this.scoreManager.stats.fouls.toString(), x, y);
        
        // Ball breakdown on the right
        this.renderBallBreakdown(x + 180, 260);
    }
    
    /**
     * Draw a statistic row
     */
    drawStat(label, value, x, y) {
        fill(150);
        text(label + ":", x, y);
        fill(255);
        textAlign(RIGHT);
        text(value, x + 150, y);
        textAlign(LEFT);
    }
    
    /**
     * Render ball breakdown
     */
    renderBallBreakdown(x, y) {
        textSize(10);
        fill(200);
        text("BALLS POTTED", x, y);
        y += 20;
        
        const colors = ['red', 'yellow', 'green', 'brown', 'blue', 'pink', 'black'];
        const emojis = {
            red: '🔴',
            yellow: '🟡',
            green: '🟢',
            brown: '🟤',
            blue: '🔵',
            pink: '🩷',
            black: '⚫'
        };
        
        for (let color of colors) {
            const count = this.scoreManager.stats.ballsPotted[color];
            if (count > 0) {
                fill(255);
                text(`${emojis[color]} ${count}`, x, y);
                y += 18;
            }
        }
    }
    
    /**
     * Render recent events with enhanced formatting
     */
    renderRecentEvents() {
        const events = this.scoreManager.recentEvents;
        if (events.length === 0) return;
        
        const panelWidth = 360;
        const panelHeight = Math.min(140, 35 + events.length * 25);
        
        this.drawPanel(5, height - panelHeight - 10, panelWidth, panelHeight, 'RECENT EVENTS');
        
        let y = height - panelHeight + 35;
        
        textAlign(LEFT);
        
        for (let i = 0; i < Math.min(5, events.length); i++) {
            const event = events[i];
            const desc = this.scoreManager.getEventDescription(event);
            const alpha = 255 - i * 40;
            
            // Event time
            fill(150, alpha);
            textSize(9);
            text(event.time, 20, y);
            
            // Event icon and text
            textSize(11);
            text(desc.icon, 70, y);
            
            // Event description with color
            fill(desc.color.levels[0], desc.color.levels[1], desc.color.levels[2], alpha);
            text(desc.text, 90, y);
            
            y += 22;
        }
    }
    
    /**
     * Draw warning overlay
     */
    drawWarningOverlay(mainText, subText) {
        push();
        
        // Dark overlay
        fill(0, 0, 0, 150);
        rect(0, 0, width, height);
        
        // Warning box
        const boxWidth = 400;
        const boxHeight = 120;
        const boxX = (width - boxWidth) / 2;
        const boxY = (height - boxHeight) / 2;
        
        fill(20, 20, 20, 240);
        stroke(255, 0, 0);
        strokeWeight(3);
        rect(boxX, boxY, boxWidth, boxHeight, 10);
        
        // Warning text
        fill(255, 0, 0);
        textAlign(CENTER);
        textSize(28);
        textStyle(BOLD);
        text(mainText, width / 2, height / 2 - 10);
        
        fill(255);
        textSize(16);
        textStyle(NORMAL);
        text(subText, width / 2, height / 2 + 25);
        
        pop();
    }
    
    /**
     * Draw status message
     */
    drawStatusMessage(message) {
        push();
        
        const boxWidth = 300;
        const boxHeight = 50;
        const boxX = (width - boxWidth) / 2;
        const boxY = height - 150;
        
        fill(0, 0, 0, 200);
        stroke(255, 255, 100, 100);
        strokeWeight(1);
        rect(boxX, boxY, boxWidth, boxHeight, 25);
        
        fill(255, 255, 100);
        textAlign(CENTER);
        textSize(16);
        text(message, width / 2, boxY + 32);
        
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
     * Render cue ball placement preview (D-zone highlight and ball preview)
     */
    renderCueBallPlacementPreview() {
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

        pop();
    }
    
    /**
     * Render cue ball placement instruction (separate method for better positioning)
     */
    renderCueBallPlacementInstruction() {
        push();
        
        // Create highlighted background box
        const instructionText = "PLACE THE CUE BALL IN THE D-ZONE";
        textSize(24);
        const textW = textWidth(instructionText) + 60;
        const textH = 50;
        const textX = (width - textW) / 2;
        const textY = this.offsetY + this.tablePixelHeight + 30;
        
        // Glowing background effect
        drawingContext.shadowBlur = 20;
        drawingContext.shadowColor = 'rgba(255, 255, 100, 0.8)';
        
        // Background box
        fill(0, 0, 0, 220);
        stroke(255, 255, 100);
        strokeWeight(3);
        rect(textX, textY, textW, textH, 10);
        
        // Reset shadow
        drawingContext.shadowBlur = 0;
        
        // Text with animation effect
        fill(255, 255, 100);
        noStroke();
        textAlign(CENTER);
        textSize(24);
        textStyle(BOLD);
        
        // Pulsing effect
        const pulse = sin(frameCount * 0.05) * 5 + 5;
        drawingContext.shadowBlur = pulse;
        drawingContext.shadowColor = 'rgba(255, 255, 100, 1)';
        
        text(instructionText, width / 2, textY + 35);
        
        // Reset shadow
        drawingContext.shadowBlur = 0;
        textStyle(NORMAL);
        
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
        console.log(`%cPlayer ${this.scoreManager.currentPlayer} - BALL POTTED: ${ball.colorName}`, `color: ${this.getBallColor(ball.colorName)}`);
        ball.isPotted = true;

        // Remove from physics world
        World.remove(world, ball.body);

        // Play pocket drop sound
        if (soundManager) {
            soundManager.playPocketDrop();
        }

        // Record in score manager
        if (ball.colorName !== 'white') {
            this.scoreManager.recordBallPotted(ball.colorName);
        }

        // Track consecutive colored ball potting
        if (ball.colorName !== 'red' && ball.colorName !== 'white') {
            if (this.lastPottedBall && this.lastPottedBall.colorName !== 'red' && this.lastPottedBall.colorName !== 'white') {
                this.consecutiveColoredPotted++;
                if (this.consecutiveColoredPotted >= 2) {
                    this.scoreManager.recordFoul("Two consecutive colored balls potted");
                    console.warn("ERROR: Two consecutive colored balls potted!");
                }
            } else {
                this.consecutiveColoredPotted = 1;
            }
            this.respotColoredBall(ball);
        } else if (ball.colorName === 'red') {
            this.consecutiveColoredPotted = 0;
        } else if (ball.colorName === 'white') {
            // Cue ball potted - foul
            this.isPlacingCueBall = true;
            this.scoreManager.recordFoul("Cue ball potted");
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
                const shotTaken = this.cue.shoot(cueBall);
                // Only track shot if it was actually taken
                if (shotTaken) {
                    this.scoreManager.startNewShot();
                }
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
                    if (ballA.id === 'cue') {
                        this.scoreManager.recordBallHit(ballB.colorName);
                        console.log(`Player ${this.scoreManager.currentPlayer} - CUE HIT: ${ballB.colorName}`);
                    } else {
                        this.scoreManager.recordBallHit(ballA.colorName);
                        console.log(`Player ${this.scoreManager.currentPlayer} - CUE HIT: ${ballA.colorName}`);
                    }
                }
            } else if ((bodyA.label === 'cue' && bodyB.label === 'cushion') ||
                       (bodyA.label === 'cushion' && bodyB.label === 'cue')) {
                // Cue ball hit cushion
                this.scoreManager.recordCushionHit();
            }
        }
    }
}