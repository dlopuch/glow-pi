/*
 * @module {controllers.patterns}
 *
 * Various lightstrip patterns to play
 */

var NUM_PIXELS = 32,
    TICK_INTERVAL = 33, // ~30 FPS
    PATTERNS = {};

var _ = require('lodash'),
    ls = require('./lightstrip'),
    rainFactory = require('./patterns/rainFactory')(NUM_PIXELS, TICK_INTERVAL, ls),
    BlackBodyRain = require('./patterns/BlackBodyRain')(NUM_PIXELS, TICK_INTERVAL, ls);

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
  activePattern = PATTERNS[patternId] || PATTERNS.rainbow;
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
}();

PATTERNS.bananas = new function() {
  this.friendlyName = "Bojangles's Bananas";
  this.sortI = 1;

  var BANANA_WIDTH = 3,
      GAP_WIDTH = 4;

  var offset = 0,
      bananas = true,
      blinkTickCount = 0,
      bananaHue;

  this.init = function() {
    offset = 0;
    bananas = true;
    blinkTickCount = 0;
  };

  this.tick = function() {
    for (var i=0; i<NUM_PIXELS; i++) {
      // bananas off this frame
      if (!bananas) {
        ls.hsv(0,0,0);
        continue;
      }

      // If we're starting a new banana, randomize its color
      if ((offset + i) % (BANANA_WIDTH + GAP_WIDTH) === 0) {
        // .13 is a very ripe orange, .19 is a very unripe almost green
        bananaHue = 0.16 + Math.random() * 0.06 - 0.03;
      }

      if ((offset + i) % (BANANA_WIDTH + GAP_WIDTH) < BANANA_WIDTH) {
        ls.hsv(bananaHue, 1, 1);
      } else {
        ls.hsv(0,0,0);
      }
    }

    blinkTickCount++;
    if (blinkTickCount > TICK_INTERVAL * 0.1) {
      blinkTickCount = 0;
      offset++;
      bananas = !bananas;
    }
  };
}();


PATTERNS.rain = rainFactory({
  friendlyName: "Digital Rain",
  sortI: 2,
});

PATTERNS.pulseRed = rainFactory({
  friendlyName: "Red Pulse",
  sortI: 3,
  baseAsBackground: true,
  baseHue: 0.95,
  hueVariance: 0.05,
  whiteDecay: 0
});

PATTERNS.pulseOrange = rainFactory({
  friendlyName: "Orange Pulse",
  sortI: 4,
  baseAsBackground: true,
  baseHue: 0.13,
  hueVariance: 0.13,
  whiteDecay: 0
});

PATTERNS.pulseGreen = rainFactory({
  friendlyName: "Green Pulse",
  sortI: 5,
  baseAsBackground: true,
  baseHue: 0.3,
  hueVariance: 0.15,
  whiteDecay: 0
});

PATTERNS.pulseAqua = rainFactory({
  friendlyName: "Aqua Pulse",
  sortI: 6,
  baseAsBackground: true,
  baseHue: 0.5,
  hueVariance: 0.15,
  whiteDecay: 0
});

PATTERNS.pulseBlue = rainFactory({
  friendlyName: "Blue Pulse",
  sortI: 7,
  baseAsBackground: true,
  baseHue: 0.7,
  hueVariance: 0.15,
  whiteDecay: 0
});

PATTERNS.pulsePurple = rainFactory({
  friendlyName: "Purple Pulse",
  sortI: 8,
  baseAsBackground: true,
  baseHue: 0.85,
  hueVariance: 0.14,
  whiteDecay: 0
});

PATTERNS.blackBodyRain = new BlackBodyRain({
  friendlyName: 'Black Body Rain',
  sortI: 9
});

PATTERNS.fastBlackBodyRain = new BlackBodyRain({
  friendlyName: 'Fast Black Body Rain',
  sortI: 10,
  dropDurationSec: 0.8,
  dropSpreadRate: 8
});

// Initialize patterns list
_.sortBy(_.pairs(PATTERNS).map(function(p) { p[1].id = p[0]; return p[1]; }),
         'sortI')
.forEach(function(p) {
  exports.PATTERNS_LIST.push({
    id: p.id,
    friendlyName: p.friendlyName
  });
});





















