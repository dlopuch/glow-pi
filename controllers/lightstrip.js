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

// Adapted from Partik Gosar, http://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately#comment24984878_17242144
// h,s,v are all in range [0,1]
function HSVtoRGBBuffer(h, s, v) {
  h = h % 1;
  if (h < 0) {
    h = 1 + h;
    console.log('h is: ' + h);
  }

  var r, g, b, i, f, p, q, t;
  if (h && s === undefined && v === undefined) {
    s = h.s, v = h.v, h = h.h;
  }
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }
  var grb = new Buffer(3);
  grb.write('' +
            (GAMMA[ Math.floor(g * 255) ] || '00') +
            (GAMMA[ Math.floor(r * 255) ] || '00') +
            (GAMMA[ Math.floor(b * 255) ] || '00'), 'hex');
  return grb;
}

/**
 * {WritableStream} SPI device data stream
 */
var SPI,
    waitForDrain = false,
    skippingFrame = false;

var RESET = new Buffer(1); // TODO: may need more reset bytes for longer strips, see arduino source
RESET.write('00', 'hex');

exports.open = function(callback) {
  callback = callback || function(error, results) {
    if (error)
      console.log("ERROR opening SPI:", error);
    else
      console.log("READY: " + results);
  };
  SPI = fs.createWriteStream('/dev/spidev0.0', {flags: 'w', encoding: 'ascii'});
  callback = _.once(callback || function() {});
  SPI.once('open', function() {
    SPI.write(RESET); // start it
    callback(null, 'lightstrip ready', SPI);
  });
  SPI.once('error', function(e) {
    callback(e);
  });
  SPI.on('error', function(e) {
    console.log("SPI error!", e.toString());
  });
  SPI.on('drain', function(e) {
    console.log('SPI buffer drained!!!');
    waitForDrain = false;
  });

  SPI.lossyWrite = function(buffer, callback) {
    if (waitForDrain)
      return false;

    var completed = SPI.write(buffer, callback);
    if (!completed) {
      skippingFrame = true; // ignore future pixel writes until backpressure is resolved
      waitForDrain = true;
    }
    return completed;
  };
};

exports.close = function(callback) {
  SPI.end(callback);
};


var numUnflushedResets = 0,
    flushResetCb = function() {
      numUnflushedResets--;
    };

/**
 * Start the next line of pixels / reset the frame
 */
exports.next = function() {
  skippingFrame = waitForDrain;

  if (skippingFrame) {
    console.log('lightstrip: SPI buffer clogged, dropping next frame.');
    return false;
  }

  if (numUnflushedResets > 0) {
    skippingFrame = true;
    console.log('lightstrip: Warning! Backpressure starting to build up!  Skipping next frame');
    return false;
  }

  numUnflushedResets++;
  SPI.lossyWrite(RESET, flushResetCb);
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
  if (skippingFrame) {
    //console.log('lightstrip: Dropped frame, ignoring RGB');
    return;
  }

  var grb = new Buffer(3);
  grb.write('' + (GAMMA[g] || '00') + (GAMMA[r] || '00') + (GAMMA[b] || '00'), 'hex');
  if (!SPI.lossyWrite(grb)) {
    console.log('lightstrip: SPI: RGB buffer full, back off!');
  }
};

/**
 * Send a HSV for the next pixel
 * @param {number} hue 0-1, 0 and 1 is red
 * @param {number} saturation 0-1, 0 for white/grey, 1 for full hue
 * @param {number} value (blackness) 0-1, 0 for off, 1 for full intensity
 */
exports.hsv = function(h, s, v) {
  if (skippingFrame) {
    //console.log('lightstrip: Dropped frame, ignoring HSV');
    return;
  }

  if (!SPI.lossyWrite(HSVtoRGBBuffer(h, s, v))) {
    console.log('lightstrip: SPI: HSV buffer full, back off!');
  }
};