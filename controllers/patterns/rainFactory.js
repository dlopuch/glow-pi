// DI Wrapper
module.exports = function(NUM_PIXELS, TICK_INTERVAL, ls) {

  /**
   * Factory to produce a new "Rain" pattern
   * @param opts Options to customize the rain pattern:
   *   friendlyName: {string} Pattern name
   *   sortI: {string} pattern sort order on UI
   *   baseHue: {number} 0-1, the base hue from which raindrops are randomized.  Be caseful around the limits -- colors
   *            don't wrap wrap around yet.
   *   hueVariance: {number} 0-1.  Raindrops will be a random color +/- this amount from the baseHue.  Again, wrap
   *                arounds are buggy
   *   baseAsBackground: {boolean} True to make the background the baseHue, false to leave the background black/off
   *   whiteDecaySec: {number} How many seconds for a raindrop's white flash to decay (default .3)
   *   decay: {number} How many seconds it takes a raindrop to decay (default 1)
   *   spreadRate: {number} How many pixels/sec the raindrop spreads across (default 6).  Stops spreading after decay.
   */
  return function(opts) {
    opts = opts || {};
    return new function() {
      this.friendlyName = opts.friendlyName || "Digital Rain";
      this.sortI = opts.sortI || 10;

      var BASE_HUE = opts.baseHue || 0.65,
          HUE_VARIANCE = opts.hueVariance || 0.3,

          // Drop decays all its "white" in .3 seconds
          WHITE_DECAY = 1 / (TICK_INTERVAL * (opts.whiteDecaySec || .3)),

          // Drop decays away in 1 sec
          BRIGHTNESS_DECAY = 1 / (TICK_INTERVAL * (opts.decay || 1)),

          // Raindrop spreads 6 pixels / second
          SPREAD_RATE = (opts.spreadRate || 6) / TICK_INTERVAL;

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
          hues[i].sum = opts.baseAsBackground ? BASE_HUE : 0;
          hues[i].num = opts.baseAsBackground ? 1 : 0;
          whites[i] = 0;
          vals[i] = opts.baseAsBackground ? .3 : 0;
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
  };

};
