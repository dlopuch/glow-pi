/*
 * @module {controllers.patterns}
 *
 * Various lightstrip patterns to play
 */

var _ = require('lodash'),
    ls = require('./lightstrip');

var NUM_PIXELS = 32,
    TICK_INTERVAL = 33, // ~30 FPS
    PATTERNS = {};

var activePattern;

setInterval(function tickPattern() {
  if (!activePattern) return;

  ls.next();
  activePattern.tick.call(activePattern);
}, TICK_INTERVAL);

/**
 * Load up and run a pattern
 * @param {string} patternId
 */
exports.load = function(patternId) {
  activePattern = PATTERNS[patternId] || PATTERNS['rainbow'];
  activePattern.init();
};

exports.getActivePattern = function() {
  return activePattern ? activePattern.id : null;
};

/**
 * List of available patterns.  Each pattern will be an Object: {
 *   id: {string} internal pattern name, to be fed into load()
 *   friendlyName: {string} User-facing pattern name
 * }
 */
exports.PATTERNS_LIST = [];
  // Will get initialized at the end of the file.  Just make sure you add patterns to PATTERNS, and
  // add a this.friendlyName


/**
 * PATTERN DEFINITIONS
 * -----------------------
 * To add a new patterns, add it to the PATTERNS object.  The PATTERNS key at which you put it will be the pattern's id.
 *
 * A pattern must have the following attributes:
 *   id: {string} (Reserved attribute... will be filled in with the PATTERN key at which you defined it)
 *   friendlyName: {string} The friendly name of the pattern
 *   sortI: {number} The order in which the pattern appears on the web UI
 *   init: {function()} Initializing function that will be called when your pattern is loaded
 *   tick: {function()} Do your pattern's lightstrip API calls here.  Gets called right after a ls.next().  Gets called
 *                      every TICK_INTERVAL ms.
 */

PATTERNS.rainbow = new function() {
  this.friendlyName = "Taste the Rainbow";
  this.sortI = 0;

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
  this.friendlyName = "Digital Rain";
  this.sortI = 1;

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

PATTERNS.bananas = new function() {
  this.friendlyName = "Bojangles's Bananas";
  this.sortI = 2;

  var BANANA_WIDTH = 3,
      GAP_WIDTH = 4;

  var offset = 0,
      bananas = true,
      blinkTickCount = 0;

  this.init = function() {
    offset = 0;
    bananas = true;
    blickTickCount = 0;
  };

  this.tick = function() {
    for (var i=0; i<NUM_PIXELS; i++) {
      // bananas off this frame
      if (!bananas) {
        ls.hsv(0,0,0);

      } else if ((offset + i) % (BANANA_WIDTH + GAP_WIDTH) <= BANANA_WIDTH) {
        ls.hsv(.3, 1, 1);
      } else {
        ls.hsv(0,0,0);
      }
    }

    blinkCount++;
    if (blinkCount > TICK_INTERVAL * .7) {
      blinkCount = 0;
      offset++;
      bananas = !bananas;
    }
  };
};



// Initialize patterns list
_.sortBy(_.pairs(PATTERNS).map(function(p) { p[1].id = p[0]; return p[1]; }),
         'sortI')
.forEach(function(p) {
  exports.PATTERNS_LIST.push({
    id: p.id,
    friendlyName: p.friendlyName
  });
});





















