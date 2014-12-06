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
module.exports = function(NUM_PIXELS, TICK_INTERVAL, ls) {

  function BlackBodyRain(opts) {
    opts = _.defaults(opts || {}, {
      friendlyName: 'Black Body Rain',
      sortI: 10
    });

    this.friendlyName = opts.friendlyName;
    this.sortI = opts.sortI;
  }

  BlackBodyRain.prototype.init = function() {
    this.temp = 20000;
  };

  BlackBodyRain.prototype.tick = function() {
    this.temp -= 100;

    if (this.temp < 1000)
      this.temp = 20000;

    var rgb = colorTemperatureToRGB(this.temp);
    for (var i=0; i<NUM_PIXELS; i++) {
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
