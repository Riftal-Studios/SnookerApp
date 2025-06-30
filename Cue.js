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
        this.lastLoggedPower = 0; // For power logging
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
            // Power is calculated but not logged to avoid flooding
        }
    }
    
    /**
     * Take the shot
     */
    shoot(cueBall) {
        // Only shoot if we're aiming, have power, and have dragged far enough
        const minPower = 0.5; // Minimum power threshold to count as a shot
        if (this.isAiming && this.power > minPower && this.cueBall) {
            console.log('SHOT TAKEN - Power:', this.power.toFixed(1));
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
            
            return true; // Shot was taken
        }
        
        // Reset if not a valid shot
        this.isAiming = false;
        this.power = 0;
        this.cueBall = null;
        
        return false; // No shot taken
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