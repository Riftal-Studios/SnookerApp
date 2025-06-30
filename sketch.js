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

    // Initialize sound manager (will be activated on first user interaction)
    soundManager = null; // Delay initialization until user interaction
    
    // Initialize city background
    cityBackground = new CityBackground();
    
    // Initialize the game
    game = new Game();
    
    // Set up collision detection with sound
    Events.on(engine, 'collisionStart', function(event) {
        game.handleCollisions(event.pairs);
        if (soundManager) {
            soundManager.handleCollisionSound(event.pairs);
        }
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
        if (soundManager) {
            soundManager.toggleMute();
            if (soundManager.muted) {
                console.log('SOUND: OFF');
            } else {
                console.log('SOUND: ON');
            }
        } else {
            console.log('🔊 Click anywhere first to enable audio!');
        }
    }
}

/**
 * Handle mouse press for cue interaction
 */
function mousePressed() {
    // Initialize sound manager on first user interaction to avoid browser warnings
    if (!soundManager) {
        console.log('🔊 Initializing audio system...');
        soundManager = new SoundManager();
        console.log('✅ Audio system ready!');
    }
    
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