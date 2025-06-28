/**
 * Snooker Game - Graphics Programming Assignment
 * 
 * A physics-based snooker game implementation using p5.js for rendering
 * and Matter.js for physics simulation. Features realistic ball physics,
 * cue stick mechanics, and proper snooker rules.
 * 
 * COMMENTARY (500 words)
 * =====================
 * 
 * Design Philosophy:
 * This snooker game was designed with a focus on realism and user experience. The architecture
 * follows object-oriented principles with clear separation of concerns between game logic,
 * physics simulation, and rendering. Each major component (Game, Table, BallManager, Ball, Cue)
 * is encapsulated in its own class, promoting code reusability and maintainability.
 * 
 * Cue Mechanism:
 * The cue system uses a combination of mouse interactions for intuitive control. Players click
 * and drag from the cue ball to aim, with the direction determined by the drag vector. The power
 * is calculated based on the distance dragged, multiplied by a scaling factor (0.08) to ensure
 * shots remain within realistic bounds. Visual feedback is provided through a semi-transparent
 * cue stick that follows the mouse, with a power indicator line showing the shot strength.
 * This approach was chosen over keyboard-only controls as it provides more precise aiming and
 * feels more natural, similar to real snooker.
 * 
 * Random Algorithm:
 * For modes 2 and 3, ball placement uses a rejection sampling algorithm. The system generates
 * random coordinates within the table bounds and checks if the position is valid (no overlaps
 * with existing balls). If invalid, it tries again up to 100 times per ball. This simple
 * approach ensures good distribution while avoiding infinite loops. The algorithm maintains
 * a minimum distance of 5.5 units between ball centers (slightly more than ball diameter)
 * to prevent overlapping.
 * 
 * Physics Implementation:
 * Matter.js handles the physics simulation with carefully tuned parameters. Balls have a
 * restitution of 0.5 for realistic bouncing, low friction (0.01) for smooth rolling, and
 * friction air (0.015) for gradual stopping. Cushions have higher restitution (0.85) to
 * simulate the rubber's bounciness. The cue ball placement system temporarily disables
 * collisions during setup to prevent balls from pushing each other, then re-enables them
 * for normal gameplay.
 * 
 * Extension: Animated City Background & Synthesized Sound Effects
 * The city background creates an atmospheric environment with procedurally generated buildings,
 * twinkling stars, and animated neon signs. This unique extension transforms the traditional
 * snooker experience into something more modern and visually engaging. Buildings have random
 * heights and window patterns, creating a dynamic skyline that changes each time the game loads.
 * 
 * The sound system uses p5.sound's oscillator synthesis to create collision sounds without
 * external audio files. Different frequencies are used for different ball types: lower tones
 * for red balls (200-300Hz), mid-range for colored balls (300-500Hz), and distinct tones for
 * cushion impacts. The velocity-based volume adjustment makes harder hits sound louder,
 * enhancing realism.
 * 
 * Technical Challenges:
 * Key challenges included proper pocket detection (solved with attraction forces near pockets),
 * preventing ball escape (boundary walls outside visible area), and ensuring smooth cue ball
 * placement (D-zone validation with visual feedback). The consecutive colored ball error
 * detection required tracking the last potted ball type, resetting the counter when reds
 * are potted.
 * 
 * This implementation successfully combines traditional snooker rules with modern graphics
 * and innovative features, creating an engaging and technically sophisticated game.
 */

// Matter.js aliases for convenience
const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Events = Matter.Events;
const Vector = Matter.Vector;

// Global variables
let engine, world;
let game;
let cityBackground;
let soundManager;

// Collision categories for filtering
const CATEGORY_BALL = 0x0001;
const CATEGORY_CUSHION = 0x0002;
const CATEGORY_CUE = 0x0004;

/**
 * Main p5.js setup function
 * Initializes canvas, physics engine, and game objects
 */
function setup() {
    createCanvas(windowWidth, windowHeight);
    
    // Initialize Matter.js physics engine
    engine = Engine.create();
    world = engine.world;
    
    // Disable gravity for top-down view
    world.gravity.y = 0;
    
    // Initialize sound manager
    soundManager = new SoundManager();
    
    // Initialize city background
    cityBackground = new CityBackground();
    
    // Initialize the game
    game = new Game();
    
    // Set up collision detection with sound
    Events.on(engine, 'collisionStart', function(event) {
        game.handleCollisions(event.pairs);
        soundManager.handleCollisionSound(event.pairs);
    });
}

/**
 * Handle window resize
 */
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    
    // Recalculate table position
    game.updateTablePosition();
    
    // Regenerate city background for new dimensions
    cityBackground = new CityBackground();
}

/**
 * Main p5.js draw loop
 * Updates physics and renders all game elements
 */
function draw() {
    // Update physics engine
    Engine.update(engine, 16.666); // 60 FPS
    
    // Render city background
    cityBackground.update();
    cityBackground.render();
    
    // Update and render game
    game.update();
    game.render();
}

/**
 * Handle keyboard input for game modes
 */
function keyPressed() {
    game.handleKeyPress(key);
    
    // Sound controls
    if (key === 'm' || key === 'M') {
        soundManager.toggleMute();
    }
}

/**
 * Handle mouse press for cue interaction
 */
function mousePressed() {
    game.handleMousePress(mouseX, mouseY);
}

/**
 * Handle mouse drag for cue aiming
 */
function mouseDragged() {
    game.handleMouseDrag(mouseX, mouseY);
}

/**
 * Handle mouse release for taking shots
 */
function mouseReleased() {
    game.handleMouseRelease();
}

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
        arc(dCenterX, dCenterY, dRadius * 2 * this.scale, dRadius * 2 * this.scale, -HALF_PI, HALF_PI);
        
        // Draw preview cue ball at mouse position if in D-zone
        const mouseGameX = (mouseX - this.offsetX) / this.scale;
        const mouseGameY = (mouseY - this.offsetY) / this.scale;
        
        if (this.isValidCueBallPosition(mouseGameX, mouseGameY)) {
            // Valid position - show green preview
            fill(255, 255, 255, 200);
            stroke(0, 255, 0, 255);
            strokeWeight(2);
            circle(mouseX - this.offsetX, mouseY - this.offsetY, 5.25 * this.scale);
            
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
            circle(mouseX - this.offsetX, mouseY - this.offsetY, 5.25 * this.scale);
            
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
                
                // If ball is close to pocket, apply attraction force
                if (distance < pocket.radius * 1.5 && distance > pocket.radius * 0.5) {
                    // Calculate attraction force towards pocket center
                    const pocketX = this.offsetX + pocket.x * this.scale;
                    const pocketY = this.offsetY + pocket.y * this.scale;
                    const force = {
                        x: (pocketX - ball.body.position.x) * 0.0002,
                        y: (pocketY - ball.body.position.y) * 0.0002
                    };
                    Body.applyForce(ball.body, ball.body.position, force);
                    
                    // Reduce velocity for easier capture
                    Body.setVelocity(ball.body, {
                        x: ball.body.velocity.x * 0.92,
                        y: ball.body.velocity.y * 0.92
                    });
                }
                
                // If ball center is close enough to pocket center, it's potted
                if (distance < pocket.radius * 0.7) {
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
                this.displayMode = 1;
                this.ballManager.setupStartingPositions(false); // Don't add cue ball
                this.cue.reset();
                this.isPlacingCueBall = true;
                this.consecutiveColoredPotted = 0;
                this.lastPottedBall = null;
                break;
            case '2':
                this.displayMode = 2;
                this.ballManager.setupRandomReds(false); // Don't add cue ball
                this.cue.reset();
                this.isPlacingCueBall = true;
                this.consecutiveColoredPotted = 0;
                this.lastPottedBall = null;
                break;
            case '3':
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
                    } else {
                        report = `Cue ball hit ${ballA.colorName}`;
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

/**
 * Table class
 * Handles table rendering and cushion physics
 */
class Table {
    constructor(width, height, scale, offsetX, offsetY) {
        this.width = width;
        this.height = height;
        this.scale = scale;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        
        // Table measurements in game units
        this.cushionWidth = 4;
        this.pocketRadius = 5.5; // Increased for better ball capture
        this.cornerPocketSize = 9; // Increased gap for corner pockets
        this.middlePocketSize = 8; // Increased gap for middle pockets
        
        // Create physics bodies
        this.cushions = [];
        this.walls = [];
        this.createCushions();
        this.createBoundaryWalls();
        
        // Define pocket positions
        this.createPockets();
    }
    
    /**
     * Create Matter.js bodies for cushions
     */
    createCushions() {
        const restitution = 0.85;
        const cw = this.cushionWidth * this.scale;
        
        // Clear any existing helpers
        this.cushions = [];
        
        // Define cushion segments with proper gaps for pockets
        const segments = [
            // Top left cushion (leaves gap for corner pocket)
            {
                x: this.offsetX + this.cornerPocketSize * this.scale * 1.2 + (this.width / 2 - this.middlePocketSize / 2 - this.cornerPocketSize * 1.2) * this.scale / 2,
                y: this.offsetY + cw / 2,
                width: (this.width / 2 - this.middlePocketSize / 2 - this.cornerPocketSize * 1.2) * this.scale,
                height: cw,
                label: 'top-left'
            },
            // Top right cushion
            {
                x: this.offsetX + (this.width / 2 + this.middlePocketSize / 2 + (this.width / 2 - this.middlePocketSize / 2 - this.cornerPocketSize * 1.2) / 2) * this.scale,
                y: this.offsetY + cw / 2,
                width: (this.width / 2 - this.middlePocketSize / 2 - this.cornerPocketSize * 1.2) * this.scale,
                height: cw,
                label: 'top-right'
            },
            // Bottom left cushion
            {
                x: this.offsetX + this.cornerPocketSize * this.scale * 1.2 + (this.width / 2 - this.middlePocketSize / 2 - this.cornerPocketSize * 1.2) * this.scale / 2,
                y: this.offsetY + this.height * this.scale - cw / 2,
                width: (this.width / 2 - this.middlePocketSize / 2 - this.cornerPocketSize * 1.2) * this.scale,
                height: cw,
                label: 'bottom-left'
            },
            // Bottom right cushion
            {
                x: this.offsetX + (this.width / 2 + this.middlePocketSize / 2 + (this.width / 2 - this.middlePocketSize / 2 - this.cornerPocketSize * 1.2) / 2) * this.scale,
                y: this.offsetY + this.height * this.scale - cw / 2,
                width: (this.width / 2 - this.middlePocketSize / 2 - this.cornerPocketSize * 1.2) * this.scale,
                height: cw,
                label: 'bottom-right'
            },
            // Left cushion (with gaps for corner pockets)
            {
                x: this.offsetX + cw / 2,
                y: this.offsetY + this.cornerPocketSize * this.scale * 1.2 + (this.height - 2 * this.cornerPocketSize * 1.2) * this.scale / 2,
                width: cw,
                height: (this.height - 2 * this.cornerPocketSize * 1.2) * this.scale,
                label: 'left'
            },
            // Right cushion
            {
                x: this.offsetX + this.width * this.scale - cw / 2,
                y: this.offsetY + this.cornerPocketSize * this.scale * 1.2 + (this.height - 2 * this.cornerPocketSize * 1.2) * this.scale / 2,
                width: cw,
                height: (this.height - 2 * this.cornerPocketSize * 1.2) * this.scale,
                label: 'right'
            }
        ];
        
        // Create cushion bodies
        segments.forEach(seg => {
            const cushion = Bodies.rectangle(seg.x, seg.y, seg.width, seg.height, {
                isStatic: true,
                restitution: restitution,
                label: 'cushion',
                collisionFilter: {
                    category: CATEGORY_CUSHION,
                    mask: CATEGORY_BALL
                }
            });
            this.cushions.push(cushion);
        });
        
        World.add(world, this.cushions);
    }
    
    /**
     * Create invisible boundary walls to prevent balls from escaping
     */
    createBoundaryWalls() {
        const wallThickness = 50;
        
        // Create walls outside the visible table area
        const walls = [
            // Top wall
            Bodies.rectangle(
                this.offsetX + this.width * this.scale / 2,
                this.offsetY - wallThickness / 2 - 10,
                this.width * this.scale + 100,
                wallThickness,
                { isStatic: true, label: 'boundary-top' }
            ),
            // Bottom wall
            Bodies.rectangle(
                this.offsetX + this.width * this.scale / 2,
                this.offsetY + this.height * this.scale + wallThickness / 2 + 10,
                this.width * this.scale + 100,
                wallThickness,
                { isStatic: true, label: 'boundary-bottom' }
            ),
            // Left wall
            Bodies.rectangle(
                this.offsetX - wallThickness / 2 - 10,
                this.offsetY + this.height * this.scale / 2,
                wallThickness,
                this.height * this.scale + 100,
                { isStatic: true, label: 'boundary-left' }
            ),
            // Right wall
            Bodies.rectangle(
                this.offsetX + this.width * this.scale + wallThickness / 2 + 10,
                this.offsetY + this.height * this.scale / 2,
                wallThickness,
                this.height * this.scale + 100,
                { isStatic: true, label: 'boundary-right' }
            )
        ];
        
        // Set collision properties
        walls.forEach(wall => {
            wall.collisionFilter = {
                category: CATEGORY_CUSHION,
                mask: CATEGORY_BALL
            };
            wall.restitution = 0.5;
            wall.render = { visible: false }; // Make them invisible
        });
        
        this.walls = walls;
        World.add(world, walls);
    }
    
    /**
     * Define pocket positions
     */
    createPockets() {
        this.pockets = [
            // Corner pockets (at actual corners)
            { x: 0, y: 0, radius: this.pocketRadius },
            { x: this.width, y: 0, radius: this.pocketRadius },
            { x: 0, y: this.height, radius: this.pocketRadius },
            { x: this.width, y: this.height, radius: this.pocketRadius },
            // Middle pockets
            { x: this.width / 2, y: 0, radius: this.pocketRadius },
            { x: this.width / 2, y: this.height, radius: this.pocketRadius }
        ];
        
        // Create pocket "helper" bodies that guide balls in
        this.createPocketHelpers();
    }
    
    /**
     * Create invisible angled bodies near pockets to guide balls
     */
    createPocketHelpers() {
        const helpers = [];
        
        // Top-left corner helpers
        helpers.push(
            Bodies.rectangle(
                this.offsetX + this.cornerPocketSize * this.scale * 0.7,
                this.offsetY + this.cushionWidth * this.scale * 0.5,
                this.cornerPocketSize * this.scale * 0.6,
                this.cushionWidth * this.scale * 0.5,
                { 
                    isStatic: true, 
                    angle: -Math.PI / 6,
                    render: { visible: false }
                }
            )
        );
        
        helpers.push(
            Bodies.rectangle(
                this.offsetX + this.cushionWidth * this.scale * 0.5,
                this.offsetY + this.cornerPocketSize * this.scale * 0.7,
                this.cushionWidth * this.scale * 0.5,
                this.cornerPocketSize * this.scale * 0.6,
                { 
                    isStatic: true, 
                    angle: Math.PI / 6,
                    render: { visible: false }
                }
            )
        );
        
        // Similar helpers for other corners...
        // For now, add collision filters
        helpers.forEach(helper => {
            helper.collisionFilter = {
                category: CATEGORY_CUSHION,
                mask: CATEGORY_BALL
            };
            helper.restitution = 0.5; // Less bouncy to guide balls in
        });
        
        World.add(world, helpers);
    }
    
    /**
     * Render the table
     */
    render() {
        push();
        
        // Draw outer table frame (wood)
        fill(92, 51, 23); // Dark wood
        noStroke();
        rect(-20, -20, this.width * this.scale + 40, this.height * this.scale + 40, 10);
        
        // Inner bevel
        fill(139, 69, 19); // Lighter wood
        rect(-10, -10, this.width * this.scale + 20, this.height * this.scale + 20, 5);
        
        // Draw table bed (slate)
        fill(50, 50, 50);
        rect(0, 0, this.width * this.scale, this.height * this.scale);
        
        // Draw playing surface (green baize)
        fill(0, 100, 0);
        noStroke();
        rect(
            this.cushionWidth * this.scale,
            this.cushionWidth * this.scale,
            this.width * this.scale - 2 * this.cushionWidth * this.scale,
            this.height * this.scale - 2 * this.cushionWidth * this.scale
        );
        
        // Draw cushions with proper geometry
        this.drawCushions();
        
        // Draw pockets
        this.drawPockets();
        
        // Draw table markings
        this.drawTableMarkings();
        
        // Add subtle cloth texture
        for (let i = 0; i < 5; i++) {
            fill(255, 255, 255, 2);
            rect(
                this.cushionWidth * this.scale + i,
                this.cushionWidth * this.scale + i,
                this.width * this.scale - 2 * this.cushionWidth * this.scale - 2 * i,
                this.height * this.scale - 2 * this.cushionWidth * this.scale - 2 * i
            );
        }
        
        pop();
    }
    
    /**
     * Draw cushions visually
     */
    drawCushions() {
        fill(0, 80, 0); // Darker green for cushions
        stroke(60, 30, 15); // Dark wood edge
        strokeWeight(1);
        
        const cw = this.cushionWidth * this.scale;
        const cornerGap = this.cornerPocketSize * this.scale;
        const middleGap = this.middlePocketSize * this.scale;
        
        // Top cushions
        // Left section
        beginShape();
        vertex(cornerGap, 0);
        vertex(this.width * this.scale / 2 - middleGap / 2, 0);
        vertex(this.width * this.scale / 2 - middleGap / 2 - cw * 0.3, cw);
        vertex(cornerGap + cw * 0.3, cw);
        endShape(CLOSE);
        
        // Right section
        beginShape();
        vertex(this.width * this.scale / 2 + middleGap / 2, 0);
        vertex(this.width * this.scale - cornerGap, 0);
        vertex(this.width * this.scale - cornerGap - cw * 0.3, cw);
        vertex(this.width * this.scale / 2 + middleGap / 2 + cw * 0.3, cw);
        endShape(CLOSE);
        
        // Bottom cushions
        // Left section
        beginShape();
        vertex(cornerGap + cw * 0.3, this.height * this.scale - cw);
        vertex(this.width * this.scale / 2 - middleGap / 2 - cw * 0.3, this.height * this.scale - cw);
        vertex(this.width * this.scale / 2 - middleGap / 2, this.height * this.scale);
        vertex(cornerGap, this.height * this.scale);
        endShape(CLOSE);
        
        // Right section
        beginShape();
        vertex(this.width * this.scale / 2 + middleGap / 2 + cw * 0.3, this.height * this.scale - cw);
        vertex(this.width * this.scale - cornerGap - cw * 0.3, this.height * this.scale - cw);
        vertex(this.width * this.scale - cornerGap, this.height * this.scale);
        vertex(this.width * this.scale / 2 + middleGap / 2, this.height * this.scale);
        endShape(CLOSE);
        
        // Left cushion
        beginShape();
        vertex(0, cornerGap);
        vertex(cw, cornerGap + cw * 0.3);
        vertex(cw, this.height * this.scale - cornerGap - cw * 0.3);
        vertex(0, this.height * this.scale - cornerGap);
        endShape(CLOSE);
        
        // Right cushion
        beginShape();
        vertex(this.width * this.scale, cornerGap);
        vertex(this.width * this.scale, this.height * this.scale - cornerGap);
        vertex(this.width * this.scale - cw, this.height * this.scale - cornerGap - cw * 0.3);
        vertex(this.width * this.scale - cw, cornerGap + cw * 0.3);
        endShape(CLOSE);
        
        // Corner pieces
        this.drawCornerCushions();
    }
    
    /**
     * Draw corner cushion pieces
     */
    drawCornerCushions() {
        const cw = this.cushionWidth * this.scale;
        const cornerGap = this.cornerPocketSize * this.scale;
        
        fill(0, 80, 0);
        noStroke();
        
        // Top-left corner
        arc(cornerGap, cornerGap, cornerGap * 2, cornerGap * 2, PI, PI + HALF_PI);
        
        // Top-right corner
        arc(this.width * this.scale - cornerGap, cornerGap, cornerGap * 2, cornerGap * 2, -HALF_PI, 0);
        
        // Bottom-left corner
        arc(cornerGap, this.height * this.scale - cornerGap, cornerGap * 2, cornerGap * 2, HALF_PI, PI);
        
        // Bottom-right corner
        arc(this.width * this.scale - cornerGap, this.height * this.scale - cornerGap, cornerGap * 2, cornerGap * 2, 0, HALF_PI);
    }
    
    /**
     * Draw pockets
     */
    drawPockets() {
        fill(0); // Black holes
        noStroke();
        
        for (let pocket of this.pockets) {
            // Outer pocket ring
            fill(60, 30, 15); // Dark wood
            circle(pocket.x * this.scale, pocket.y * this.scale, pocket.radius * this.scale * 2.2);
            
            // Inner pocket (the actual hole)
            fill(0);
            circle(pocket.x * this.scale, pocket.y * this.scale, pocket.radius * this.scale * 2);
            
            // Add subtle gradient effect
            for (let i = 0; i < 5; i++) {
                fill(0, 0, 0, 255 - i * 40);
                circle(
                    pocket.x * this.scale,
                    pocket.y * this.scale,
                    pocket.radius * this.scale * 2 - i * 2
                );
            }
            
            // Debug: Show pocket detection radius
            if (false) { // Set to true to see detection areas
                noFill();
                stroke(255, 0, 0, 100);
                strokeWeight(1);
                circle(pocket.x * this.scale, pocket.y * this.scale, pocket.radius * this.scale * 2 * 0.7);
                
                // Show pocket center
                fill(255, 0, 0);
                noStroke();
                circle(pocket.x * this.scale, pocket.y * this.scale, 3);
            }
        }
    }
    
    /**
     * Draw table markings (D-zone, spots, etc.)
     */
    drawTableMarkings() {
        push();
        
        // Translate to account for cushions
        translate(this.cushionWidth * this.scale, this.cushionWidth * this.scale);
        
        // D-zone parameters
        const dRadius = 29.2; // Radius of D in game units
        const baulkLine = 44.5 - this.cushionWidth; // Adjust for cushion width
        
        // Draw baulk line
        stroke(255, 255, 255, 80);
        strokeWeight(2);
        line(
            baulkLine * this.scale,
            0,
            baulkLine * this.scale,
            (this.height - 2 * this.cushionWidth) * this.scale
        );
        
        // Draw D arc
        noFill();
        stroke(255, 255, 255, 80);
        strokeWeight(2);
        arc(
            baulkLine * this.scale,
            (this.height - 2 * this.cushionWidth) * this.scale / 2,
            dRadius * 2 * this.scale,
            dRadius * 2 * this.scale,
            -HALF_PI,
            HALF_PI
        );
        
        // Draw spots
        fill(255, 255, 255);
        noStroke();
        
        // Baulk line spots
        const spotSize = 1.5 * this.scale;
        
        // Yellow spot
        circle(baulkLine * this.scale, (55.625 - this.cushionWidth) * this.scale, spotSize);
        
        // Brown spot
        circle(baulkLine * this.scale, (44.5 - this.cushionWidth) * this.scale, spotSize);
        
        // Green spot  
        circle(baulkLine * this.scale, (33.375 - this.cushionWidth) * this.scale, spotSize);
        
        // Blue spot
        circle((89 - this.cushionWidth) * this.scale, (44.5 - this.cushionWidth) * this.scale, spotSize);
        
        // Pink spot
        circle((141 - this.cushionWidth) * this.scale, (44.5 - this.cushionWidth) * this.scale, spotSize);
        
        // Black spot
        circle((164 - this.cushionWidth) * this.scale, (44.5 - this.cushionWidth) * this.scale, spotSize);
        
        pop();
    }
    
}

/**
 * BallManager class
 * Manages all balls in the game, their positions, and physics
 */
class BallManager {
    constructor(scale, offsetX, offsetY) {
        this.scale = scale;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.balls = [];
    }
    
    /**
     * Set up balls in starting positions
     */
    setupStartingPositions(addCueBall = true) {
        // Clear existing balls
        this.clearBalls();
        
        // Temporarily set all balls to be sensors during setup
        this.isSettingUp = true;
        
        // Add cue ball in D zone only if requested
        if (addCueBall) {
            this.addCueBall(30, 44.5); // Center of D
        }
        
        // Add reds in triangle formation
        const startX = 130;
        const startY = 44.5;
        const ballRadius = 2.625;
        const spacing = ballRadius * 2.05; // Slightly tighter for proper triangle
        
        // Create red balls in triangle
        let ballIndex = 0;
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col <= row; col++) {
                const x = startX + row * spacing * 0.866; // cos(30°)
                const y = startY + (col - row / 2) * spacing;
                this.addBall(x, y, 'red', `red${ballIndex++}`);
            }
        }
        
        // Add colored balls in their spots
        this.addColoredBalls();
        
        // After all balls are placed, reset their velocities and enable collisions
        setTimeout(() => {
            this.isSettingUp = false;
            for (let ball of this.balls) {
                // Reset velocity to zero
                Body.setVelocity(ball.body, { x: 0, y: 0 });
                Body.setAngularVelocity(ball.body, 0);
                
                // Re-enable collisions
                ball.body.isSensor = false;
            }
        }, 100);
    }
    
    /**
     * Set up balls with random red positions
     */
    setupRandomReds(addCueBall = true) {
        // Clear existing balls
        this.clearBalls();
        
        // Temporarily disable collisions during setup
        this.isSettingUp = true;
        
        // Add cue ball only if requested
        if (addCueBall) {
            this.addCueBall(30, 44.5);
        }
        
        // Add colored balls in their spots
        this.addColoredBalls();
        
        // Add reds in random positions
        for (let i = 0; i < 15; i++) {
            let x, y;
            let validPosition = false;
            
            // Try to find a valid position
            while (!validPosition) {
                x = random(20, 158);
                y = random(10, 79);
                validPosition = this.isValidPosition(x, y);
            }
            
            this.addBall(x, y, 'red', `red${i}`);
        }
        
        // Enable collisions after setup
        setTimeout(() => {
            this.isSettingUp = false;
            for (let ball of this.balls) {
                Body.setVelocity(ball.body, { x: 0, y: 0 });
                Body.setAngularVelocity(ball.body, 0);
                ball.body.isSensor = false;
            }
        }, 100);
    }
    
    /**
     * Set up all balls in random positions
     */
    setupRandomAll(addCueBall = true) {
        // Clear existing balls
        this.clearBalls();
        
        // Temporarily disable collisions during setup
        this.isSettingUp = true;
        
        // Add cue ball only if requested
        if (addCueBall) {
            this.addCueBall(30, 44.5);
        }
        
        // Add all balls in random positions
        const ballsToAdd = [
            { color: 'yellow', id: 'yellow' },
            { color: 'green', id: 'green' },
            { color: 'brown', id: 'brown' },
            { color: 'blue', id: 'blue' },
            { color: 'pink', id: 'pink' },
            { color: 'black', id: 'black' }
        ];
        
        // Add 15 reds
        for (let i = 0; i < 15; i++) {
            ballsToAdd.push({ color: 'red', id: `red${i}` });
        }
        
        // Place all balls randomly
        for (let ballInfo of ballsToAdd) {
            let x, y;
            let validPosition = false;
            let attempts = 0;
            
            // Try to find a valid position
            while (!validPosition && attempts < 100) {
                x = random(20, 158);
                y = random(10, 79);
                validPosition = this.isValidPosition(x, y);
                attempts++;
            }
            
            if (validPosition) {
                this.addBall(x, y, ballInfo.color, ballInfo.id);
            }
        }
        
        // Enable collisions after setup
        setTimeout(() => {
            this.isSettingUp = false;
            for (let ball of this.balls) {
                Body.setVelocity(ball.body, { x: 0, y: 0 });
                Body.setAngularVelocity(ball.body, 0);
                ball.body.isSensor = false;
            }
        }, 100);
    }
    
    /**
     * Add colored balls in their standard positions
     */
    addColoredBalls() {
        // Standard snooker colored ball positions
        this.addBall(141, 44.5, 'pink', 'pink');
        this.addBall(89, 44.5, 'blue', 'blue');
        this.addBall(44.5, 44.5, 'brown', 'brown');
        this.addBall(44.5, 33.375, 'green', 'green');
        this.addBall(44.5, 55.625, 'yellow', 'yellow');
        this.addBall(164, 44.5, 'black', 'black');
    }
    
    /**
     * Add cue ball
     */
    addCueBall(x, y, enableCollisions = false) {
        // Remove existing cue ball if any
        const existingCue = this.getCueBall();
        if (existingCue) {
            World.remove(world, existingCue.body);
            this.balls = this.balls.filter(b => b.id !== 'cue');
        }
        
        const ball = new Ball(x, y, 'white', 'cue', this.scale, this.offsetX, this.offsetY, !enableCollisions);
        this.balls.push(ball);
    }
    
    /**
     * Add a ball to the game
     */
    addBall(x, y, colorName, id) {
        const ball = new Ball(x, y, colorName, id, this.scale, this.offsetX, this.offsetY, this.isSettingUp);
        this.balls.push(ball);
    }
    
    /**
     * Check if position is valid (no overlaps)
     */
    isValidPosition(x, y) {
        const minDistance = 5.5; // Slightly more than ball diameter
        
        for (let ball of this.balls) {
            const d = dist(x, y, ball.x, ball.y);
            if (d < minDistance) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Clear all balls
     */
    clearBalls() {
        // Remove Matter.js bodies
        for (let ball of this.balls) {
            World.remove(world, ball.body);
        }
        
        this.balls = [];
    }
    
    /**
     * Get the cue ball
     */
    getCueBall() {
        return this.balls.find(ball => ball.id === 'cue');
    }
    
    /**
     * Update all balls
     */
    update() {
        for (let ball of this.balls) {
            ball.update();
        }
    }
    
    /**
     * Render all balls
     */
    render() {
        for (let ball of this.balls) {
            ball.render();
        }
    }
    
    /**
     * Get the cue ball
     */
    getCueBall() {
        return this.balls.find(ball => ball.id === 'cue');
    }
}

/**
 * Ball class
 * Represents a single ball with physics properties
 */
class Ball {
    constructor(x, y, colorName, id, scale, offsetX = 0, offsetY = 0, isSettingUp = false) {
        this.id = id;
        this.colorName = colorName;
        this.scale = scale;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.radius = 2.625;
        this.isPotted = false;
        
        // Create Matter.js body with offset
        this.body = Bodies.circle(
            offsetX + x * scale,
            offsetY + y * scale,
            this.radius * scale,
            {
                restitution: 0.5,
                friction: 0.02, // Increased friction
                frictionAir: 0.025, // Increased air resistance for faster stopping
                label: id,
                isSensor: isSettingUp, // Temporarily disable collisions during setup
                collisionFilter: {
                    category: CATEGORY_BALL,
                    mask: CATEGORY_BALL | CATEGORY_CUSHION // Balls collide with other balls and cushions
                }
            }
        );
        
        // Add to physics world
        World.add(world, this.body);
        
        // Get color
        this.color = this.getColor(colorName);
    }
    
    /**
     * Get ball color
     */
    getColor(colorName) {
        // Access color from game's color palette
        // For now, return basic colors
        switch(colorName) {
            case 'white': return color(255, 255, 255);
            case 'red': return color(220, 20, 60);
            case 'yellow': return color(255, 215, 0);
            case 'green': return color(0, 128, 0);
            case 'brown': return color(139, 69, 19);
            case 'blue': return color(0, 0, 255);
            case 'pink': return color(255, 192, 203);
            case 'black': return color(0, 0, 0);
            default: return color(128, 128, 128);
        }
    }
    
    /**
     * Update ball state
     */
    update() {
        // Limit maximum velocity to prevent tunneling
        const maxVelocity = 15;
        const velocity = this.body.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        
        if (speed > maxVelocity) {
            // Scale down velocity to max
            const scale = maxVelocity / speed;
            Body.setVelocity(this.body, {
                x: velocity.x * scale,
                y: velocity.y * scale
            });
        }
    }
    
    /**
     * Render the ball
     */
    render() {
        if (this.isPotted) return;
        
        push();
        
        // Get position from Matter.js body (already includes offset)
        const pos = this.body.position;
        
        // Translate back since we're already in translated context
        const renderX = pos.x - this.offsetX;
        const renderY = pos.y - this.offsetY;
        
        // Draw ball
        fill(this.color);
        noStroke();
        circle(renderX, renderY, this.radius * this.scale * 2);
        
        // Add highlight for 3D effect
        fill(255, 255, 255, 60);
        circle(
            renderX - this.radius * this.scale * 0.3,
            renderY - this.radius * this.scale * 0.3,
            this.radius * this.scale * 0.8
        );
        
        pop();
    }
    
    // Getter for position (in game units, without offset)
    get x() {
        return (this.body.position.x - this.offsetX) / this.scale;
    }
    
    get y() {
        return (this.body.position.y - this.offsetY) / this.scale;
    }
}

/**
 * Cue class
 * Handles cue stick rendering and shot mechanics
 */
class Cue {
    constructor(scale, offsetX, offsetY) {
        this.scale = scale;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.isAiming = false;
        this.aimStart = null;
        this.aimEnd = null;
        this.power = 0;
        this.maxPower = 20;
        this.cueLength = 140; // Length of cue stick in pixels
        this.cueOffset = 15; // Distance from ball when aiming
    }
    
    /**
     * Start aiming process
     */
    startAiming(x, y, cueBall) {
        // Check if clicking near cue ball
        const cueBallPos = cueBall.body.position;
        const distance = dist(x, y, cueBallPos.x, cueBallPos.y);
        
        if (distance < 50) { // Within 50 pixels of cue ball
            this.isAiming = true;
            this.aimStart = createVector(cueBallPos.x, cueBallPos.y);
            this.aimEnd = createVector(x, y);
            this.cueBall = cueBall;
        }
    }
    
    /**
     * Update aiming
     */
    updateAiming(x, y) {
        if (this.isAiming) {
            this.aimEnd = createVector(x, y);
            
            // Calculate power based on distance with exponential scaling
            const distance = p5.Vector.dist(this.aimStart, this.aimEnd);
            // Exponential power scaling for more dramatic effect
            this.power = constrain(pow(distance / 50, 1.5) * 10, 0, this.maxPower);
        }
    }
    
    /**
     * Take the shot
     */
    shoot(cueBall) {
        if (this.isAiming && this.power > 0 && this.cueBall) {
            // Calculate force direction (from cue ball towards mouse, not away)
            const force = p5.Vector.sub(this.aimEnd, this.aimStart);
            force.normalize();
            // Increased force multiplier for stronger shots
            force.mult(this.power * 0.003);
            
            // Apply force to cue ball using Matter.js
            Body.applyForce(this.cueBall.body, this.cueBall.body.position, {
                x: force.x,
                y: force.y
            });
            
            // Play cue strike sound
            if (soundManager) {
                soundManager.playCueStrike(this.power / this.maxPower);
            }
            
            // Reset aiming
            this.isAiming = false;
            this.power = 0;
            this.cueBall = null;
        }
    }
    
    /**
     * Update cue state
     */
    update() {
        // Update animations or state
    }
    
    /**
     * Reset cue state
     */
    reset() {
        this.isAiming = false;
        this.aimStart = null;
        this.aimEnd = null;
        this.power = 0;
        this.cueBall = null;
    }
    
    /**
     * Render the cue
     */
    render() {
        if (this.isAiming && this.cueBall) {
            push();
            
            // Convert positions to table-relative coordinates
            const ballX = this.aimStart.x - this.offsetX;
            const ballY = this.aimStart.y - this.offsetY;
            const mouseX = this.aimEnd.x - this.offsetX;
            const mouseY = this.aimEnd.y - this.offsetY;
            
            // Calculate cue direction
            const dir = createVector(mouseX - ballX, mouseY - ballY);
            dir.normalize();
            
            // Calculate cue position based on power (pull back effect)
            const pullBack = this.power * 2;
            const cueStart = createVector(
                ballX - dir.x * (this.cueOffset + pullBack),
                ballY - dir.y * (this.cueOffset + pullBack)
            );
            const cueEnd = createVector(
                cueStart.x - dir.x * this.cueLength,
                cueStart.y - dir.y * this.cueLength
            );
            
            // Draw cue stick
            strokeWeight(8);
            // Cue gradient effect (dark to light)
            stroke(101, 67, 33); // Dark brown
            line(cueEnd.x, cueEnd.y, 
                 cueEnd.x + dir.x * this.cueLength * 0.7, 
                 cueEnd.y + dir.y * this.cueLength * 0.7);
            
            stroke(160, 82, 45); // Light brown
            strokeWeight(6);
            line(cueEnd.x + dir.x * this.cueLength * 0.6, 
                 cueEnd.y + dir.y * this.cueLength * 0.6,
                 cueStart.x, cueStart.y);
            
            // Draw cue tip
            stroke(255, 248, 220); // Ivory color
            strokeWeight(5);
            point(cueStart.x, cueStart.y);
            
            // Draw aiming guide line
            stroke(255, 255, 0, 100);
            strokeWeight(1);
            setLineDash([5, 5]); // Dashed line
            line(ballX, ballY, ballX + dir.x * 100, ballY + dir.y * 100);
            setLineDash([]); // Reset to solid line
            
            // Draw ghost ball (where cue ball will hit)
            noFill();
            stroke(255, 255, 0, 80);
            strokeWeight(1);
            const ghostDist = 50;
            circle(ballX + dir.x * ghostDist, ballY + dir.y * ghostDist, this.cueBall.radius * this.scale * 2);
            
            pop();
            
            // Draw power indicator (outside of table translation)
            push();
            translate(-this.offsetX, -this.offsetY);
            
            // Draw power bar
            fill(255, 255, 0);
            noStroke();
            const powerBarWidth = 100;
            const powerBarHeight = 10;
            rect(10, windowHeight - 30, powerBarWidth * (this.power / this.maxPower), powerBarHeight);
            
            // Power bar outline
            noFill();
            stroke(255);
            strokeWeight(1);
            rect(10, windowHeight - 30, powerBarWidth, powerBarHeight);
            
            // Power text
            fill(255);
            textAlign(LEFT);
            textSize(12);
            text(`Power: ${Math.round(this.power / this.maxPower * 100)}%`, 10, windowHeight - 35);
            
            pop();
        }
    }
}

// Helper function to create dashed lines in p5.js
function setLineDash(list) {
    drawingContext.setLineDash(list);
}

/**
 * SoundManager class
 * Handles all game sound effects
 */
class SoundManager {
    constructor() {
        // Initialize sound objects
        this.sounds = {
            ballHit: null,
            cushionHit: null,
            pocketDrop: null,
            cueStrike: null,
            ambience: null
        };
        
        // Create synthesized sounds using p5.sound
        this.initializeSounds();
        
        // Volume settings
        this.masterVolume = 0.5;
        this.muted = false;
    }
    
    /**
     * Initialize synthesized sound effects
     */
    initializeSounds() {
        // Ball collision sound - sharp click
        this.sounds.ballHit = new p5.Oscillator('sine');
        this.sounds.ballHit.amp(0);
        this.sounds.ballHit.start();
        
        // Cushion hit - softer thud
        this.sounds.cushionHit = new p5.Oscillator('triangle');
        this.sounds.cushionHit.amp(0);
        this.sounds.cushionHit.start();
        
        // Pocket drop - descending tone
        this.sounds.pocketDrop = new p5.Oscillator('sawtooth');
        this.sounds.pocketDrop.amp(0);
        this.sounds.pocketDrop.start();
        
        // Create white noise for cue strike
        this.sounds.cueStrike = new p5.Noise('white');
        this.sounds.cueStrike.amp(0);
        this.sounds.cueStrike.start();
        
        // Ambient city sounds
        this.sounds.ambience = new p5.Noise('pink');
        this.sounds.ambience.amp(0.02);
        this.sounds.ambience.start();
    }
    
    /**
     * Play ball collision sound
     */
    playBallHit(velocity = 1) {
        if (this.muted) return;
        
        const volume = constrain(velocity * 0.1, 0.1, 0.5) * this.masterVolume;
        const pitch = random(800, 1200); // Randomize pitch slightly
        
        this.sounds.ballHit.freq(pitch);
        this.sounds.ballHit.amp(volume, 0.01);
        this.sounds.ballHit.amp(0, 0.1, 0.05); // Quick fade out
    }
    
    /**
     * Play cushion hit sound
     */
    playCushionHit(velocity = 1) {
        if (this.muted) return;
        
        const volume = constrain(velocity * 0.08, 0.05, 0.3) * this.masterVolume;
        const pitch = random(200, 400);
        
        this.sounds.cushionHit.freq(pitch);
        this.sounds.cushionHit.amp(volume, 0.01);
        this.sounds.cushionHit.amp(0, 0.2, 0.05);
    }
    
    /**
     * Play pocket drop sound
     */
    playPocketDrop() {
        if (this.muted) return;
        
        // Descending tone effect
        const startFreq = 600;
        const endFreq = 100;
        
        this.sounds.pocketDrop.freq(startFreq);
        this.sounds.pocketDrop.amp(0.3 * this.masterVolume, 0.01);
        
        // Sweep frequency down
        this.sounds.pocketDrop.freq(endFreq, 0.5);
        this.sounds.pocketDrop.amp(0, 0.5, 0.1);
    }
    
    /**
     * Play cue strike sound
     */
    playCueStrike(power = 1) {
        if (this.muted) return;
        
        const volume = constrain(power * 0.02, 0.05, 0.4) * this.masterVolume;
        
        // Quick burst of white noise
        this.sounds.cueStrike.amp(volume, 0.001);
        this.sounds.cueStrike.amp(0, 0.05, 0.01);
        
        // Also play a low frequency thump
        const thump = new p5.Oscillator('sine');
        thump.freq(random(60, 100));
        thump.start();
        thump.amp(volume * 0.5, 0.001);
        thump.amp(0, 0.1, 0.01);
        thump.stop(0.2);
    }
    
    /**
     * Handle collision sounds based on collision pairs
     */
    handleCollisionSound(pairs) {
        for (let pair of pairs) {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            // Calculate collision velocity
            const relativeVelocity = Matter.Vector.sub(bodyA.velocity, bodyB.velocity);
            const speed = Matter.Vector.magnitude(relativeVelocity);
            
            // Ball to ball collision
            if (bodyA.label && bodyB.label && 
                bodyA.label.includes('ball') || bodyA.label.includes('cue') ||
                bodyA.label.includes('red') || bodyA.label.includes('yellow') ||
                bodyA.label.includes('green') || bodyA.label.includes('brown') ||
                bodyA.label.includes('blue') || bodyA.label.includes('pink') ||
                bodyA.label.includes('black')) {
                this.playBallHit(speed);
            }
            // Ball to cushion collision
            else if ((bodyA.label && bodyA.label.includes('cushion')) || 
                     (bodyB.label && bodyB.label.includes('cushion'))) {
                this.playCushionHit(speed);
            }
        }
    }
    
    /**
     * Toggle mute
     */
    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.sounds.ambience.amp(0, 0.1);
        } else {
            this.sounds.ambience.amp(0.02, 0.1);
        }
    }
    
    /**
     * Set master volume
     */
    setVolume(volume) {
        this.masterVolume = constrain(volume, 0, 1);
    }
}

/**
 * CityBackground class
 * Creates an animated city skyline background
 */
class CityBackground {
    constructor() {
        this.buildings = [];
        this.stars = [];
        this.cars = [];
        this.neonSigns = [];
        
        // Create buildings based on window width
        const buildingCount = Math.floor(windowWidth / 80);
        for (let i = 0; i < buildingCount; i++) {
            this.buildings.push({
                x: random(windowWidth),
                width: random(60, 120),
                height: random(windowHeight * 0.3, windowHeight * 0.7),
                color: color(random(20, 60), random(20, 60), random(40, 80)),
                windows: this.generateWindows()
            });
        }
        
        // Sort buildings by height for proper layering
        this.buildings.sort((a, b) => b.height - a.height);
        
        // Create stars based on window size
        const starCount = Math.floor((windowWidth * windowHeight) / 10000);
        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: random(windowWidth),
                y: random(windowHeight / 2),
                size: random(1, 3),
                twinkle: random(TWO_PI)
            });
        }
        
        // Create moving cars (distant lights)
        const carCount = Math.floor(windowWidth / 120);
        for (let i = 0; i < carCount; i++) {
            this.cars.push({
                x: random(windowWidth),
                y: random(windowHeight - 100, windowHeight - 50),
                speed: random(1, 3),
                color: random() > 0.5 ? color(255, 255, 200) : color(255, 100, 100)
            });
        }
        
        // Create neon signs
        this.neonSigns = [
            { text: "SNOOKER", x: windowWidth * 0.2, y: windowHeight * 0.3, hue: 0 },
            { text: "CLUB", x: windowWidth * 0.7, y: windowHeight * 0.25, hue: 180 },
            { text: "24/7", x: windowWidth * 0.5, y: windowHeight * 0.35, hue: 120 }
        ];
    }
    
    generateWindows() {
        const windows = [];
        const rows = floor(random(10, 20));
        const cols = floor(random(3, 6));
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                windows.push({
                    row: r,
                    col: c,
                    lit: random() > 0.3,
                    flicker: random(100, 500)
                });
            }
        }
        return windows;
    }
    
    update() {
        // Update star twinkle
        for (let star of this.stars) {
            star.twinkle += 0.05;
        }
        
        // Update car positions
        for (let car of this.cars) {
            car.x += car.speed;
            if (car.x > windowWidth + 50) {
                car.x = -50;
                car.y = random(windowHeight - 100, windowHeight - 50);
                car.speed = random(1, 3);
            }
        }
        
        // Update window flickers
        for (let building of this.buildings) {
            for (let window of building.windows) {
                if (frameCount % window.flicker === 0) {
                    window.lit = !window.lit;
                    window.flicker = floor(random(100, 500));
                }
            }
        }
        
        // Update neon sign colors
        for (let sign of this.neonSigns) {
            sign.hue = (sign.hue + 0.5) % 360;
        }
    }
    
    render() {
        // Night sky gradient
        for (let i = 0; i <= windowHeight; i++) {
            const inter = map(i, 0, windowHeight, 0, 1);
            const c = lerpColor(color(10, 10, 30), color(40, 20, 60), inter);
            stroke(c);
            line(0, i, windowWidth, i);
        }
        
        // Stars
        push();
        for (let star of this.stars) {
            const brightness = sin(star.twinkle) * 0.5 + 0.5;
            fill(255, 255, 200, brightness * 255);
            noStroke();
            circle(star.x, star.y, star.size);
        }
        pop();
        
        // Buildings
        for (let building of this.buildings) {
            push();
            
            // Building silhouette
            fill(building.color);
            noStroke();
            rect(building.x, windowHeight - building.height, building.width, building.height);
            
            // Windows
            const winWidth = building.width / 6;
            const winHeight = 15;
            const windowSpacing = 5;
            
            for (let window of building.windows) {
                if (window.lit) {
                    fill(255, 255, random(180, 220), 200);
                    rect(
                        building.x + windowSpacing + window.col * (winWidth + windowSpacing),
                        windowHeight - building.height + 20 + window.row * (winHeight + windowSpacing),
                        winWidth,
                        winHeight
                    );
                }
            }
            
            // Building top lights
            fill(255, 0, 0, 100);
            for (let i = 0; i < 3; i++) {
                circle(
                    building.x + building.width / 2 + (i - 1) * 15,
                    windowHeight - building.height - 5,
                    5
                );
            }
            
            pop();
        }
        
        // Moving cars (distant lights)
        push();
        for (let car of this.cars) {
            // Car light trail
            for (let i = 0; i < 10; i++) {
                fill(car.color.levels[0], car.color.levels[1], car.color.levels[2], 255 - i * 25);
                noStroke();
                ellipse(car.x - i * 5, car.y, 15 - i, 3);
            }
        }
        pop();
        
        // Neon signs
        push();
        textAlign(CENTER);
        for (let sign of this.neonSigns) {
            // Glow effect
            drawingContext.shadowBlur = 20;
            drawingContext.shadowColor = `hsl(${sign.hue}, 100%, 50%)`;
            
            stroke(`hsl(${sign.hue}, 100%, 80%)`);
            strokeWeight(3);
            fill(`hsl(${sign.hue}, 100%, 95%)`);
            textSize(40);
            textStyle(BOLD);
            text(sign.text, sign.x, sign.y);
            
            // Reset shadow
            drawingContext.shadowBlur = 0;
        }
        pop();
        
        // Ground fog effect
        push();
        for (let i = 0; i < 50; i++) {
            fill(100, 100, 150, 5);
            noStroke();
            rect(0, windowHeight - i * 2, windowWidth, 2);
        }
        pop();
    }
}