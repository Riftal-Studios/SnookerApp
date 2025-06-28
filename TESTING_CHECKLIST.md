# SnookerApp Testing Checklist

## 🎯 **Core Game Functionality**

### 1. **Game Initialization**
- [ ] Game loads without errors
- [ ] Canvas adjusts to window size
- [ ] Table renders correctly with proper proportions
- [ ] City background displays with buildings, stars, cars
- [ ] Sound system initializes (check console for errors)

### 2. **Display Modes (Press 1, 2, 3)**
- [ ] **Mode 1**: Starting positions
  - [ ] 15 red balls in triangle formation
  - [ ] 6 colored balls in standard spots (yellow, green, brown, blue, pink, black)
  - [ ] Balls positioned correctly relative to table markings
  
- [ ] **Mode 2**: Random reds
  - [ ] Colored balls in standard positions
  - [ ] 15 red balls scattered randomly
  - [ ] No ball overlaps
  
- [ ] **Mode 3**: Random all
  - [ ] All 21 balls (15 reds + 6 colored) scattered randomly
  - [ ] No ball overlaps
  - [ ] Valid positions (not in pockets/cushions)

### 3. **Cue Ball Placement**
- [ ] Game starts in cue ball placement mode
- [ ] D-zone highlighted in yellow
- [ ] Mouse preview shows green circle when in valid position
- [ ] Mouse preview shows red circle when in invalid position
- [ ] Can only place cue ball within D-zone (left semicircle)
- [ ] Placement successful message appears
- [ ] Transitions to normal play mode after placement

## 🎱 **Ball Physics & Mechanics**

### 4. **Cue Mechanics**
- [ ] Click and drag from cue ball to aim
- [ ] Aiming line appears (yellow dashed line)
- [ ] Cue stick renders with proper orientation
- [ ] Power bar shows at bottom left
- [ ] Power increases with drag distance
- [ ] Cue stick pulls back based on power
- [ ] Ghost ball shows predicted path
- [ ] Shot fires on mouse release

### 5. **Ball Movement**
- [ ] Balls move realistically after being struck
- [ ] Balls gradually slow down (friction/air resistance)
- [ ] Balls stop completely when velocity is low
- [ ] Maximum velocity is capped (no tunneling)
- [ ] Ball rotations appear natural

### 6. **Collision Detection**
- [ ] Ball-to-ball collisions work correctly
- [ ] Ball-to-cushion collisions work correctly
- [ ] Realistic bounce angles from cushions
- [ ] Collision reports appear in bottom left
- [ ] Only cue ball collisions are reported

### 7. **Pocket Mechanics**
- [ ] Balls are attracted to nearby pockets
- [ ] Balls drop into pockets when close enough
- [ ] "Ball potted" message appears
- [ ] Ball disappears from table
- [ ] Pocket drop sound plays

## 🎨 **Visual Elements**

### 8. **Table Rendering**
- [ ] Table has proper wood frame
- [ ] Green baize surface
- [ ] Cushions render correctly with gaps for pockets
- [ ] 6 pockets (4 corners + 2 middle) visible as black holes
- [ ] Table markings: D-zone arc, baulk line, colored ball spots
- [ ] Table scales properly with window size

### 9. **Ball Rendering**
- [ ] All balls have correct colors:
  - White (cue ball)
  - Red (15 red balls)
  - Yellow, Green, Brown, Blue, Pink, Black
- [ ] Balls have 3D highlight effect
- [ ] Ball size consistent and proportional
- [ ] Potted balls disappear correctly

### 10. **UI Elements**
- [ ] Game title displays
- [ ] Current mode shown
- [ ] Control instructions visible
- [ ] Active balls count updates
- [ ] Potted reds count updates
- [ ] Sound status indicator (ON/OFF)
- [ ] Collision reports with fade effect
- [ ] Power indicator during aiming

## 🌃 **Background & Atmosphere**

### 11. **City Background**
- [ ] Night sky gradient (dark blue to purple)
- [ ] Twinkling stars animate
- [ ] Buildings with random heights and windows
- [ ] Some windows lit, some dark
- [ ] Window lights flicker occasionally
- [ ] Moving car lights across bottom
- [ ] Neon signs with color cycling
- [ ] Fog effect at ground level

## 🔊 **Sound System**

### 12. **Sound Effects**
- [ ] Ball collision sounds (sharp click, varies with velocity)
- [ ] Cushion hit sounds (softer thud)
- [ ] Pocket drop sounds (descending tone)
- [ ] Cue strike sounds (white noise burst + thump)
- [ ] Ambient city sounds (pink noise)
- [ ] Volume adjusts based on collision intensity
- [ ] Press 'M' to toggle mute on/off

## 🎮 **Controls & Interaction**

### 13. **Keyboard Controls**
- [ ] **1**: Switch to starting positions mode
- [ ] **2**: Switch to random reds mode  
- [ ] **3**: Switch to random all mode
- [ ] **M**: Toggle sound mute
- [ ] Mode switches reset cue ball placement
- [ ] All controls work during gameplay

### 14. **Mouse Controls**
- [ ] Click in D-zone to place cue ball
- [ ] Click and drag from cue ball to aim
- [ ] Drag distance affects power
- [ ] Release to shoot
- [ ] Cannot aim while balls are moving
- [ ] Cannot aim if cue ball is potted

## 🏆 **Game Rules & Logic**

### 15. **Snooker Rules Implementation**
- [ ] Cue ball re-placement after potting
- [ ] Colored balls re-spot after being potted
- [ ] Re-spotting uses correct positions:
  - Yellow: baulk line, top
  - Green: baulk line, bottom  
  - Brown: baulk line, center
  - Blue: center of table
  - Pink: near red triangle
  - Black: far end of table
- [ ] Consecutive colored ball error detection
- [ ] Error messages display correctly

### 16. **Game State Management**
- [ ] Balls moving state prevents new shots
- [ ] Waiting message appears when balls moving
- [ ] Game state resets properly between modes
- [ ] Cue ball potted warning displays
- [ ] Reset instructions appear when needed

## 🔧 **Technical Features**

### 17. **Responsive Design**
- [ ] Table scales with window size
- [ ] Maintains aspect ratio
- [ ] UI elements stay positioned correctly
- [ ] Background regenerates on resize
- [ ] Physics bodies update positions on resize

### 18. **Error Handling**
- [ ] No console errors on startup
- [ ] Graceful handling of invalid positions
- [ ] Ball escape prevention (boundary walls)
- [ ] Collision filter categories work correctly
- [ ] Sound system handles missing audio context

### 19. **Performance**
- [ ] Smooth 60 FPS animation
- [ ] No lag during ball movement
- [ ] Efficient collision detection
- [ ] Memory usage stable over time
- [ ] No memory leaks when switching modes

## 🐛 **Edge Cases & Bug Testing**

### 20. **Stress Testing**
- [ ] Rapid mode switching doesn't break game
- [ ] Multiple rapid shots work correctly
- [ ] Window resize during gameplay
- [ ] Very high power shots
- [ ] Balls near pocket edges
- [ ] Multiple balls potted simultaneously

### 21. **Browser Compatibility**
- [ ] Works in Chrome
- [ ] Works in Firefox  
- [ ] Works in Safari
- [ ] Sound works across browsers
- [ ] Touch controls (if applicable)

## 📊 **Testing Results Summary**

### Passed: ___/100+ tests
### Failed: ___/100+ tests
### Issues Found:
- [ ] Issue 1: _____________________
- [ ] Issue 2: _____________________
- [ ] Issue 3: _____________________

### Notes:
```
Add any observations, performance notes, or suggestions here:

```

---

## 🚀 **How to Test**

1. Open `index.html` in a web browser
2. Go through each section systematically
3. Check off completed items
4. Note any issues or unexpected behavior
5. Test in multiple browsers if possible
6. Try different window sizes
7. Test with sound on and off

## 🎯 **Quick Test Sequence**

1. Load game → Place cue ball → Mode 1 → Take shot
2. Switch to Mode 2 → Place cue ball → Take shot  
3. Switch to Mode 3 → Place cue ball → Take shot
4. Test sound toggle (M key)
5. Test window resize
6. Pot some balls and verify re-spotting
7. Check all UI elements update correctly
