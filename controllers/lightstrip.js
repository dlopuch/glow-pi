/**
 * @module {controllers.lightstrip}
 *
 * Controller for Adafruit Digital RGB LED Waterproof Strip, http://www.adafruit.com/products/306
 * Provides a js API for writing individual pixels to that strip.
 *
 * Protocol is a Node port of the Adafruit Arduino C library.  Refer to that for description of the lightstrip protocol.
 *
 * To use:
 *  - call lightstrip.open(cb) to initialize the SPI writer.  You must run node as sudo to get access to the SPI driver.
 *  - call lightstrip.next() to start a new frame: start sending new RGB or HSV values down the strip
 *  - call lightstrip.rgb() or lightstrip.hsv() to send a single RGB or HSV pixel down the strip
 *
 * BACKPRESSURE:
 *   If you start writing to this lightstrip module faster than it can output the electrical signals, frames will start
 *   to be dropped.  This module automatically handles this backpressure relief; no need to worry about timing or
 *   events, just write away knowing that frames will be dropped if you write too quickly.  You'll get console log
 *   messages if this starts to happen.  Refer to the return value of next() to see whether your frame will be dropped
 *   or not.
 *
 * IMPLEMENTATION NODES:
 *   Creates a Node WriteStream to the /dev/spidev0.0 file.  See various raspberry pi docs for how to
 *   enable the SPI driver, or just use the Adafruit rasbian distro.  You MUST start node with sudo to have write access
 *   to the SPI driver.
 */

var fs = require('fs'),
    _ = require('lodash');

// Gamma correction lookup table: 0-255 logical RGB --> pixel-ready hex representation of byte
// From the adafruit python rpi example
var GAMMA = new Array(256);
for (var i=0; i<256; i++) {
  GAMMA[i] = (0x80 | Math.floor(Math.pow(i / 255, 2.5) * 127 + 0.5)).toString(16);
}

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
    s = h.s;
    v = h.v;
    h = h.h;
  }
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
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

    /* Backpressure throttle.
     * If we write to the SPI buffer too often, the pi can't write fast enough and we end up building backpressure.
     * Additional writes are buffered in memory and things start slowing down until nothing works.
     * When we fill up the SPI buffer, this boolean is tripped and all further writes are ignored until the buffer
     * drains.
     */
    waitForDrain = false,

    /* Dropping-a-frame indicator.
     * If we have too much backpressure, various checks set this to true and all writes are ignored until the next
     * call to next().
     */
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
    console.log("lightstrip: SPI error!", e.toString());
  });
  SPI.on('drain', function(e) {
    console.log('lightstrip: SPI buffer drained.  Things can start writing again.');
    waitForDrain = false;
  });

  // We're going to proxy the WriteStream's .write method with a function that basically ignores (drops) additional
  // write requests until the frame or buffer backpressure subsides.
  var realWrite = SPI.write;
  SPI.write = function writeProxy(buffer, callback) {
    if (skippingFrame || waitForDrain)
      return false;

    var completed = realWrite.call(SPI, buffer, callback);
    if (!completed) {
      skippingFrame = true; // ignore future pixel writes until backpressure is resolved
      waitForDrain = true;  // unlocked only on the drain event.
      console.log('lightstrip: SPI buffer filled.  Ignoring everything until buffer drained!');
    }
    return completed;
  };
};

exports.close = function(callback) {
  SPI.end(callback);
};

/* Early backpressure detection.
 * At the start of every frame (next() call), we're going to check if the previous next() call has been flushed.
 * If it hasn't, we're starting to build up back-pressure and we need to drop frames.
 *
 * (This is different from the buffer being full / waiting-for-drain... if waitForDrain trips, we are very backed up.
 *  If this trips, it means we have room in the buffer but we're asking to specify a new frame before the previous one
 *  has been flushed -- ie the first indication that we're going too fast.  Back off at this point instead of waiting
 *  for the buffer to flush becuase waiting for the buffer to flush may take a few seconds and you lose a couple seconds
 *  of animation frames instead of just one or two).
 *
 * This counter gets incremented on every next() call and gets decremented when the next() call is flushed.
 * If the counter shows there's an unflushed next(), we need to back off.
 */
var numUnflushedResets = 0,
    flushResetCb = function() {
      numUnflushedResets--;
    };

/**
 * Start the next line of pixels / reset the frame.
 *
 * If we have back-pressure in the SPI buffer (i.e. we're writing too much, strip is starting to fall behind), the
 * frame will be dropped, meaning all inputs will be ignored until the next call to next().
 *
 * @returns {boolean} true if successful, false if this frame is being dropped.
 */
exports.next = function() {
  skippingFrame = waitForDrain; // skip frame if the buffer is full.

  if (skippingFrame) {
    console.log('lightstrip: SPI buffer clogged, dropping frame.');
    return false;
  }

  if (numUnflushedResets > 0) {
    skippingFrame = true;
    console.log('lightstrip: Warning! Backpressure starting to build up!  Dropping frame');
    return false;
  }

  numUnflushedResets++;
  SPI.write(RESET, flushResetCb);
  return true;
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
  if (skippingFrame)
    return;

  var grb = new Buffer(3);
  grb.write('' + (GAMMA[g] || '00') + (GAMMA[r] || '00') + (GAMMA[b] || '00'), 'hex');
  if (!SPI.write(grb)) {
    console.log('lightstrip: RGB ignored. SPI buffer full, back off!');
  }
};

/**
 * Send a HSV for the next pixel
 * @param {number} hue 0-1, 0 and 1 is red
 * @param {number} saturation 0-1, 0 for white/grey, 1 for full hue
 * @param {number} value (blackness) 0-1, 0 for off, 1 for full intensity
 */
exports.hsv = function(h, s, v) {
  if (skippingFrame)
    return;

  if (!SPI.write(HSVtoRGBBuffer(h, s, v))) {
    console.log('lightstrip: HSV ignored. SPI buffer full, back off!');
  }
};