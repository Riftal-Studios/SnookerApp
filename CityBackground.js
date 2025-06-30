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
            { text: "SNOOKER", x: windowWidth * 0.4, y: windowHeight * 0.16, hue: 0 },
            { text: "CLUB", x: windowWidth * 0.57, y: windowHeight * 0.16, hue: 180 },
            { text: "24/7", x: windowWidth * 0.5, y: windowHeight * 0.16, hue: 120 }
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