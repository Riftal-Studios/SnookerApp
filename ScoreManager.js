/**
 * ScoreManager class
 * Manages scoring, statistics, and game state tracking
 */
class ScoreManager {
    constructor() {
        // Player scores
        this.player1Score = 0;
        this.player2Score = 0;
        this.currentPlayer = 1;
        
        // Game statistics
        this.stats = {
            totalShots: 0,
            successfulShots: 0,
            fouls: 0,
            highestBreak: 0,
            currentBreak: 0,
            ballsPotted: {
                red: 0,
                yellow: 0,
                green: 0,
                brown: 0,
                blue: 0,
                pink: 0,
                black: 0,
                total: 0
            },
            gameTime: 0,
            gameStartTime: Date.now()
        };
        
        // Shot tracking
        this.currentShot = {
            ballsHit: [],
            ballsPotted: [],
            cushionsHit: 0,
            isValid: true
        };
        
        // Recent events for display
        this.recentEvents = [];
        this.maxRecentEvents = 5;
        
        // Ball values in snooker
        this.ballValues = {
            red: 1,
            yellow: 2,
            green: 3,
            brown: 4,
            blue: 5,
            pink: 6,
            black: 7
        };
    }
    
    /**
     * Start a new shot
     */
    startNewShot() {
        this.currentShot = {
            ballsHit: [],
            ballsPotted: [],
            cushionsHit: 0,
            isValid: true
        };
        this.stats.totalShots++;
        console.log(`Player ${this.currentPlayer} - New shot started. Total shots: ${this.stats.totalShots}`);
    }
    
    /**
     * Record a ball being hit
     */
    recordBallHit(ballColor) {
        if (!this.currentShot.ballsHit.includes(ballColor)) {
            this.currentShot.ballsHit.push(ballColor);
        }
    }
    
    /**
     * Record a cushion hit
     */
    recordCushionHit() {
        this.currentShot.cushionsHit++;
    }
    
    /**
     * Record a ball being potted
     */
    recordBallPotted(ballColor) {
        this.currentShot.ballsPotted.push(ballColor);
        
        // Update statistics
        if (this.stats.ballsPotted[ballColor] !== undefined) {
            this.stats.ballsPotted[ballColor]++;
        }
        this.stats.ballsPotted.total++;
        
        // Calculate points
        const points = this.ballValues[ballColor] || 0;
        console.log(`Player ${this.currentPlayer} potted: ${ballColor}, Points: ${points}`);
        
        if (points > 0) {
            if (this.currentPlayer === 1) {
                this.player1Score += points;
                console.log(`Player 1 score updated to: ${this.player1Score}`);
            } else {
                this.player2Score += points;
                console.log(`Player 2 score updated to: ${this.player2Score}`);
            }
            this.stats.currentBreak += points;
            
            // Check for highest break
            if (this.stats.currentBreak > this.stats.highestBreak) {
                this.stats.highestBreak = this.stats.currentBreak;
            }
        }
        
        // Add event with color and points
        this.addEvent({
            type: 'pot',
            color: ballColor,
            points: points,
            player: this.currentPlayer,
            time: this.getGameTime()
        });
    }
    
    /**
     * Record a foul
     */
    recordFoul(reason, penaltyPoints = 4) {
        this.stats.fouls++;
        this.stats.currentBreak = 0;
        this.currentShot.isValid = false;
        
        // Award penalty points to opponent (minimum 4 points in snooker)
        const penalty = Math.max(4, penaltyPoints);
        const opponent = this.currentPlayer === 1 ? 2 : 1;
        
        if (opponent === 1) {
            this.player1Score += penalty;
            console.log(`Player ${this.currentPlayer} - Foul! Player 1 awarded ${penalty} points. Score: ${this.player1Score}`);
        } else {
            this.player2Score += penalty;
            console.log(`Player ${this.currentPlayer} - Foul! Player 2 awarded ${penalty} points. Score: ${this.player2Score}`);
        }
        
        // Add foul event
        this.addEvent({
            type: 'foul',
            reason: reason,
            player: this.currentPlayer,
            penaltyPoints: penalty,
            time: this.getGameTime()
        });
        
        // Switch players
        this.switchPlayer();
    }
    
    /**
     * End the current shot
     */
    endShot() {
        // Check if shot was successful
        if (this.currentShot.ballsPotted.length > 0 && this.currentShot.isValid) {
            this.stats.successfulShots++;
        } else if (this.currentShot.ballsPotted.length === 0) {
            // No balls potted, switch players
            this.switchPlayer();
            this.stats.currentBreak = 0;
        }
    }
    
    /**
     * Switch current player
     */
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.addEvent({
            type: 'turnChange',
            player: this.currentPlayer,
            time: this.getGameTime()
        });
    }
    
    /**
     * Add an event to recent events
     */
    addEvent(event) {
        this.recentEvents.unshift(event);
        if (this.recentEvents.length > this.maxRecentEvents) {
            this.recentEvents.pop();
        }
    }
    
    /**
     * Get formatted game time
     */
    getGameTime() {
        const elapsed = Date.now() - this.stats.gameStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * Get shot accuracy percentage
     */
    getShotAccuracy() {
        if (this.stats.totalShots === 0) return 0;
        return Math.round((this.stats.successfulShots / this.stats.totalShots) * 100);
    }
    
    /**
     * Get average pot success rate
     */
    getAveragePotRate() {
        if (this.stats.totalShots === 0) return 0;
        return (this.stats.ballsPotted.total / this.stats.totalShots).toFixed(2);
    }
    
    /**
     * Reset scores and stats
     */
    reset() {
        this.player1Score = 0;
        this.player2Score = 0;
        this.currentPlayer = 1;
        this.stats = {
            totalShots: 0,
            successfulShots: 0,
            fouls: 0,
            highestBreak: 0,
            currentBreak: 0,
            ballsPotted: {
                red: 0,
                yellow: 0,
                green: 0,
                brown: 0,
                blue: 0,
                pink: 0,
                black: 0,
                total: 0
            },
            gameTime: 0,
            gameStartTime: Date.now()
        };
        this.recentEvents = [];
    }
    
    /**
     * Get formatted event description
     */
    getEventDescription(event) {
        switch (event.type) {
            case 'pot':
                return {
                    text: `${this.getColorEmoji(event.color)} ${event.color.toUpperCase()} potted (+${event.points})`,
                    color: this.getEventColor(event.color),
                    icon: '🎯'
                };
            case 'foul':
                return {
                    text: `FOUL: ${event.reason} (+${event.penaltyPoints || 4} to opponent)`,
                    color: color(255, 100, 100),
                    icon: '⚠️'
                };
            case 'turnChange':
                return {
                    text: `Player ${event.player}'s turn`,
                    color: color(200, 200, 255),
                    icon: '🔄'
                };
            default:
                return {
                    text: event.toString(),
                    color: color(255),
                    icon: '•'
                };
        }
    }
    
    /**
     * Get color emoji for balls
     */
    getColorEmoji(colorName) {
        const emojis = {
            red: '🔴',
            yellow: '🟡',
            green: '🟢',
            brown: '🟤',
            blue: '🔵',
            pink: '🩷',
            black: '⚫',
            white: '⚪'
        };
        return emojis[colorName] || '●';
    }
    
    /**
     * Get display color for events
     */
    getEventColor(colorName) {
        switch(colorName) {
            case 'red': return color(220, 20, 60);
            case 'yellow': return color(255, 215, 0);
            case 'green': return color(0, 200, 0);
            case 'brown': return color(139, 69, 19);
            case 'blue': return color(100, 100, 255);
            case 'pink': return color(255, 192, 203);
            case 'black': return color(50, 50, 50);
            default: return color(255);
        }
    }
}