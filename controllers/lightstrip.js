/**
 * @module {controllers.lightstrip}
 *
 * Controller for Adafruit Digital RGB LED Waterproof Strip, http://www.adafruit.com/products/306
 * Provides a js API for writing individual pixels to that strip.
 *
 * Node port of the Adafruit Arduino C library.  Refer to that for description of the protocol.
 * Creates a Node WriteStream to the /dev/spidev0.0 file.  See various raspberry pi docs for how to
 * enable the SPI driver, or just use the Adafruit rasbian distro.
 */

var fs = require('fs'),
    _ = require('lodash');

// Gamma correction lookup table: 0-255 logical RGB --> pixel-ready hex representation of byte
// From the adafruit python rpi example
var GAMMA = new Array(256);
for (var i=0; i<256; i++) {
  GAMMA[i] = (0x80 | Math.floor(Math.pow(i / 255, 2.5) * 127 + 0.5)).toString(16);
};

/**
 * {WritableStream} SPI device data stream
 */
var SPI;

var RESET = new Buffer(1); // TODO: may need more reset bytes for longer strips, see arduino source
RESET.write('00', 'hex');

exports.open = function(callback) {
  SPI = fs.createWriteStream('/dev/spidev0.0', {flags: 'w', encoding: 'ascii'});
  callback = _.once(callback || function() {});
  SPI.once('open', function() {
    callback(null, 'lightstrip ready', SPI);
  });
  SPI.once('error', function(e) {
    callback(e);
  });
};

exports.close = function(callback) {
  SPI.end(callback);
};


/**
 * Start the next line of pixels / reset the frame
 */
exports.next = function() {
  SPI.write(RESET);
};

/**
 * Send RGB for the next pixel.
 *
 * NOTE: LEDs don't update ('latch') until the NEXT LED's command is received.  Thus, if you use this
 * function by itself, the blue won't update until the next pixel is sent.  See arduino c library for
 * details.
 *
 * @param {number} r Red,   0-255
 * @param {number} g Green, 0-255
 * @param {number} b Blue,  0-255
 */
exports.rgb = function(r,g,b) {
  var grb = new Buffer(3);
  grb.write('' + (GAMMA[g] || '00') + (GAMMA[r] || '00') + (GAMMA[b] || '00'), 'hex');
  SPI.write(grb);
};

