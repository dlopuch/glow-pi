/*
 * @module {controllers.patterns}
 *
 * Various lightstrip patterns to play
 */

var ls = require('./lightstrip');

var NUM_PIXELS = 32,
    TICK_INTERVAL = 33, // ~30 FPS
    PATTERNS = {};

var activePattern;

setInterval(function tickPattern() {
  if (!activePattern) return;

  ls.next();
  activePattern.tick.call(activePattern);
}, TICK_INTERVAL);

exports.load = function(patternName) {
  activePattern = PATTERNS[patternName] || PATTERNS['rainbow'];
  activePattern.init();
};

PATTERNS.rainbow = new function() {
  var startHue,
      hueIncrement = 1 / TICK_INTERVAL; // 1 second --> 1 full cycle
  this.init = function() {
    startHue = 0;
    console.log("Taste the rainbow");
  };
  this.tick = function() {
    for (var i=0; i<NUM_PIXELS; i++) {
      ls.hsv( startHue + i/NUM_PIXELS % 1.0, 1, 1 );
    }
    startHue += hueIncrement % 1.0;
  };
};

PATTERNS.rain = new function() {
  var BASE_HUE = 0.65,
      HUE_VARIANCE = 0.3,

      // Drop decays all its "white" in .3 seconds
      WHITE_DECAY = 1 / TICK_INTERVAL / .3,

      // Drop decays away in 1 sec
      BRIGHTNESS_DECAY = 1 / TICK_INTERVAL,

      // Raindrop spreads 6 pixels / second
      SPREAD_RATE = 6 / TICK_INTERVAL;

  var hues, whites, vals,
      drops = {},
      dropId = 0,
      Drop = function() {
        this.pixelI = Math.floor( Math.random() * NUM_PIXELS );
        this.whiteness = 1, // 1-sat, start white
        this.val = 1, // start full brightness
        this.hue = BASE_HUE + (Math.random() * HUE_VARIANCE * 2 - HUE_VARIANCE),
        this.width = 1;

        // Register this drop
        this.dropId = dropId++;
        drops[this.dropId] = this;
      };

  Drop.prototype.tick = function() {
    // Add colors to canvas
    for (var i = Math.ceil(this.pixelI - this.width); i < this.pixelI + this.width; i++) {
      if (i < 0 || i >= NUM_PIXELS)
        continue;

      hues[i].sum += this.hue; // will get averaged   TODO: average doesn't wrap around <0 or >1
      hues[i].num++; // number of contributing pixels (for averaging)
      whites[i] += this.whiteness;
      vals[i] += this.val;
    }

    // Decay
    this.whiteness = Math.max(0, this.whiteness - WHITE_DECAY);
    this.val = Math.max(0, this.val - BRIGHTNESS_DECAY);
    this.width += SPREAD_RATE;

    if (this.val === 0) {
      // We've decayed away.  Goodbye!
      delete drops[this.dropId];
    }
  };

  this.init = function() {
    hues = new Array(NUM_PIXELS);
    whites = new Array(NUM_PIXELS);
    vals = new Array(NUM_PIXELS);
    for (var i=0; i<NUM_PIXELS; i++) {
      hues[i] = {sum: 0, num: 0};
    }
    drops = {};
    console.log("Can you feel the rain?");
    new Drop();
  };

  this.tick = function() {
    for (var i=0; i<NUM_PIXELS; i++) {
      hues[i].sum = 0;
      hues[i].num = 0;
      whites[i] = 0;
      vals[i] = 0;
    }

    // Randomly add a drop, on average every 1.5 second
    if (Math.random() < 1.5/TICK_INTERVAL) {
      new Drop(); // self-registers into drops.
      //console.log('plop! (' + Object.keys(drops).length + ' drops)');
    }

    var dropIds = Object.keys(drops);
    dropIds.forEach(function(dropId) {
      drops[dropId].tick();
      // Drops remove themselves when they're decayed
    });

    // Canvas is now painted.  Average hues, max the rest.
    for (i=0; i<NUM_PIXELS; i++) {
      ls.hsv( hues[i].num ? hues[i].sum / hues[i].num : 0,
              Math.max(0, 1 - whites[i]),
              Math.min(1, vals[i]) );
    }
  };
};
























