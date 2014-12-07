/**
 * Creates a similar pattern to Digital Rain (see rainFactory.js), but each drop adds some 'color temperature' to
 * simulate black-body radiation.
 *
 * A color temperature --> RGB algorithm from
 *   http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/
 * is used to convert the semantics of color temperature to LED pixel outputs.
 *
 * In summary, this algorithm took the RGB components of black body radiation curves as defined by CIE 1964 and
 * generated best-fit lines to match the empirical (?) data.
 */

var _ = require('lodash');

var HIGH_TEMP = 20000,
    LOW_TEMP = 1000;

/**
 * See http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/
 * @param {number} temperature Color temperature in degrees K, somewhere between 1000 and 40,000
 * @returns {Object} Object with attributes r,g,b in range [0, 255]
 */
function colorTemperatureToRGB(temperature) {
  var rgb = {},
      t = temperature / 100;

  // calculate red:
  if (t <= 66) {
    rgb.r = 255;
  } else {
    rgb.r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
  }

  // calculate green:
  if (t <= 66) {
    rgb.g = 99.4708025861 * Math.log(t) - 161.1195681661;
  } else {
    rgb.g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  }

  // calculate blue:
  if (t >= 66) {
    rgb.b = 255;
  } else if (t <= 19) {
    rgb.b = 0;
  } else {
    rgb.b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  }

  // limits: rgb between 0 and 255
  rgb.r = Math.round(Math.max(0, Math.min(255, rgb.r)));
  rgb.g = Math.round(Math.max(0, Math.min(255, rgb.g)));
  rgb.b = Math.round(Math.max(0, Math.min(255, rgb.b)));

  return rgb;
}


// DI Wrapper
module.exports = function(NUM_PIXELS, TICK_INTERVAL_MS, ls) {

  var dropI = 0;

  function BlackBodyRain(opts) {
    opts = _.defaults(opts || {}, {
      friendlyName: 'Black Body Rain',
      sortI: 10,

      // How long a drop exists for
      // (temperature decays from 20k to 1k duration this period)
      dropDurationSec: 1.5,

      // Number of pixels/second the drop expands left or right
      dropSpreadRate: 4,

      // A new drop appears, on average, at this frequency (eg new drop every 1.5 sec)
      rainFrequencySec: 1.5
    });

    // Calculate temperature decay / tick
    opts._temperatureDecay = (HIGH_TEMP - LOW_TEMP) / (opts.dropDurationSec * 1000 / TICK_INTERVAL_MS);

    // Convert pixels/second to pixels/tick
    opts._dropSpreadRate = opts.dropSpreadRate * (TICK_INTERVAL_MS / 1000);

    this.friendlyName = opts.friendlyName;
    this.sortI = opts.sortI;
    this.options = opts;

    var dropRegistry = this.dropRegistry = {},
        temperatureCanvas = this.temperatureCanvas = new Array(NUM_PIXELS);

    /**
     * A Drop splashes a decaying temperature across an ever-widening area of the temperature canvas.
     *
     * In other words, on the first tick the Drop applies a high temperature to a single pixel.  Over subsequent ticks,
     * the Drop applies its temperature to more pixels (keeps widening).  As it widens, the temperature it applies gets
     * warmer and warmer (lower and lower).
     *
     * On creation, the Drop automatically registers itself in the dropRegistry.  When it fully decays, it removes
     * itself.  This allows iteration of all active drops, with decay logic fully encapsulated inside the Drop.
     */
    function Drop(startingPixel) {
      this.temp = HIGH_TEMP;
      this.pixelI = Math.floor(Math.random() * NUM_PIXELS);
      this.width = 0; // How many pixels it covers left or right of origin pixelI

      // Register this drop
      this.dropId = ++dropI;
      dropRegistry['' + this.dropId] = this;
    }
    Drop.prototype.tick = function() {
      // Add this Drop's temperature to the canvas
      for (var i = Math.ceil(this.pixelI - this.width); i < this.pixelI + this.width; i++) {
        if (i < 0 || i >= NUM_PIXELS)
          continue;

        temperatureCanvas[i] = (temperatureCanvas[i] || 0) + this.temp;
      }

      // Decay
      this.width += opts._dropSpreadRate;
      this.temp -= opts._temperatureDecay;

      // We've decayed away.  Goodbye!
      if (this.temp < LOW_TEMP) {
        delete dropRegistry['' + this.dropId];
      }
    };
    this.Drop = Drop;
  }

  BlackBodyRain.prototype.init = function() {
    for (var k in this.dropRegistry) {
      delete this.dropRegistry[k];
    }
  };

  BlackBodyRain.prototype.tick = function() {
    // reset the temperature canvas
    for (var i=0; i<NUM_PIXELS; i++) {
      this.temperatureCanvas[i] = null;
    }

    // Randomly add a drop, on average every 1.5 sec
    if (Math.random() < (this.options.rainFrequencySec || 1.5) / TICK_INTERVAL_MS) {
      new this.Drop(); // self-registers into dropRegistry.
      //console.log('plop! (' + Object.keys(this.dropRegistry).length + ' drops)');
    }

    // Tick each drop and let them add their temperature to the temperature canvas
    _(this.dropRegistry).values().forEach(function(drop) {
      drop.tick();
      // Drops remove themselves when they're decayed
    });


    // Canvas is now painted.  Convert to RGB.
    for (i=0; i<NUM_PIXELS; i++) {
      if (!this.temperatureCanvas[i]) {
        ls.rgb(0,0,0);
        continue;
      }

      var rgb = colorTemperatureToRGB( Math.min(this.temperatureCanvas[i], HIGH_TEMP*2) );
      ls.rgb(rgb.r, rgb.g, rgb.b);
    }
  };

  return BlackBodyRain;
};


// In-browser test with some DOM
// t = 1400;
// step = 100;
// var timer = setInterval(function() {
  // t = t + step;
  // $('#foo').css('background-color', t2hex(t));
  // if (t < 2500)
    // console.log(t, t2hex(t));
  // //if (t > 10000) {
  // else {
    // clearInterval(timer);
    // console.log('done');
  // }
// }, 100);
