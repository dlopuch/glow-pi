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
