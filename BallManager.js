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
        const ballRadius = 2.472; // Standard snooker ball radius = (table width / 36) / 2 = (178/36)/2 = 2.472
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
        // Pink ball sits above the red triangle with proper clearance
        const redApexX = 130;
        const ballDiameter = 4.944; // Standard snooker ball diameter = table width / 36 = 178/36 = 4.944
        const pinkX = redApexX - ballDiameter; // Shift left by one ball diameter
        this.addBall(pinkX, 44.5, 'pink', 'pink');
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
        const minDistance = 5.0; // Slightly more than ball diameter (4.944)
        
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
}