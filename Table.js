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
        this.pocketRadius = 3.708; // 1.5 times ball diameter (4.944 * 1.5 = 7.416, so radius = 3.708)
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
     * Recreate physics bodies when scale changes
     */
    recreatePhysicsBodies() {
        // Remove old physics bodies
        if (this.cushions.length > 0) {
            World.remove(world, this.cushions);
        }
        if (this.walls.length > 0) {
            World.remove(world, this.walls);
        }
        
        // Clear arrays
        this.cushions = [];
        this.walls = [];
        
        // Recreate with new dimensions
        this.createCushions();
        this.createBoundaryWalls();
    }
    renderDZone() {
        push();

        const dRadius = 14.5; // D radius in game units
        const baulkLine = 44.5; // Adjust based on your table
        const dCenterX = (baulkLine) * this.scale;
        const dCenterY = (this.height / 2) * this.scale;

        // Draw the D-zone (always visible)
        strokeWeight(2);
        stroke(255, 255, 100, 150);
        fill(255, 255, 100, 30);
        arc(dCenterX, dCenterY, dRadius * 2 * this.scale, dRadius * 2 * this.scale, HALF_PI, -HALF_PI);

        pop();
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
        this.renderDZone();

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
        const dRadius = 0; // Radius of D in game units
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

        // Pink spot (positioned with clearance from red triangle)
        const pinkSpotX = 130 - 4.944; // Same position as pink ball (diameter = 4.944)
        circle((pinkSpotX - this.cushionWidth) * this.scale, (44.5 - this.cushionWidth) * this.scale, spotSize);

        // Black spot
        circle((164 - this.cushionWidth) * this.scale, (44.5 - this.cushionWidth) * this.scale, spotSize);

        pop();
    }

}