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
  ls.next();
  activePattern.tick();
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
  var BASE_HUE = 0.7,
      HUE_VARIANCE = 0.1,

      // Drop decays all its "white" in .3 seconds
      WHITE_DECAY = .25 / TICK_INTERVAL,

      // Drop decays away in 1 sec
      BRIGHTNESS_DECAY = 1 / TICK_INTERVAL,

      // Raindrop spreads 6 pixels / second
      SPREAD_RATE = 6 / TICK_INTERVAL;

  var hues, whites, vals,
      drops = {},
      dropId = 0,
      Drop = function(pixelI) {
        var whiteness = 1, // 1-sat, start white
            val = 1, // start full brightness
            hue = BASE_HUE + (Math.random() * HUE_VARIANCE * 2 - HUE_VARIANCE),
            width = 1;

        // Register this drop
        this.dropId = dropId++;
        drops[this.dropId] = this;

        this.tick = function() {
          // Add colors to canvas
          for (var i = Math.ceil(pixelI - width); i < pixelI + width; i++) {
            if (i < 0 || i >= NUM_PIXELS)
              continue;

            hues[i] += hue; // will get averaged   TODO: average doesn't wrap around <0 or >1
            whites[i] += whiteness;
            vals[i] += val;
          }

          // Decay
          whiteness = Math.max(0, whiteness - WHITE_DECAY);
          val = Math.max(0, val - BRIGHTNESS_DECAY);
          width += SPREAD_RATE;

          if (val === 0) {
            // We've decayed away.  Goodbye!
            delete drops[this.dropId];
          }
        };
      };

  this.init = function() {
    hues = new Array(NUM_PIXELS);
    sats = new Array(NUM_PIXELS);
    vals = new Array(NUM_PIXELS);
    drops = {};
    console.log("Can you feel the rain?");
  };

  this.tick = function() {
    for (var i=0; i<NUM_PIXELS; i++) {
      hues[i] = 0;
      whites[i] = 0;
      vals[i] = 0;
    }

    // Randomly add a drop, on average every second
    if (Math.random() < 1/NUM_TICKS) {
      new Drop(); // self-registers into drops.
    }

    var dropIds = Object.keys(drops);
    dropIds.forEach(function(dropId) {
      drops[dropId].tick();
      // Drops remove themselves when they're decayed
    });

    // Canvas is now painted.  Average hues, max the rest.
    for (i=0; i<NUM_PIXELS; i++) {
      ls.hsv( hues[i] / dropIds.length,
              Math.max(0, 1 - whites[i]),
              Math.min(1, vals[i]) );
    }
  };
};
























