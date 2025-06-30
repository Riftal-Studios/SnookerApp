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
        this.radius = 2.472; // Standard snooker ball radius = (table width / 36) / 2 = (178/36)/2 = 2.472
        this.isPotted = false;
        this.isLogged = false; // For movement logging
        
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
        
        // No movement logging to avoid flooding
        
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
        
        // Add highlight for 3D effect - adjust opacity based on ball brightness
        let highlightOpacity = 60;
        if (this.colorName === 'yellow' || this.colorName === 'pink' || this.colorName === 'white') {
            highlightOpacity = 30; // Reduced highlight for light-colored balls
        }
        fill(255, 255, 255, highlightOpacity);
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