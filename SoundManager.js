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