glow-pi
=======

node.js / express-based webapp to control adafruit led pixels on a raspberry pi.

Assumes you have a raspberry pi with the SPI drivers enabled (ie you see a /dev/spidev0.0 device) and you have a
Adafruit LED strip -- http://www.adafruit.com/products/306 -- hooked up to the SPI pins.

anatomy
---------
controllers/lightstrip.js -- node port of adafruit Arduino drivers.  Uses a WritableStream to write to /dev/spidev0.0
controllers/patterns.js -- set of light strip patterns to trigger
routes/* -- TODO: Express API routes to trigger patterns


to use
---------
1) Install node and SPI drivers on your raspberry pi.  nvm should do the trick for node, or you can download a RPi
   node binary directly from nodejs.org.  See adafruit rasbian distro for an SPI-enable raspberry pi OS.
2) Edit NUM_PIXELS in lightstrip.js to reflect your configuration
3) npm install
4) sudo ~/node-v0.10.2-linux-arm-pi/bin/node app.js
5) Edit controllers/patterns.js to add your own magic!


license
----------

    glow-pi
    Copyright (C) 2014  Dan Lopuch

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
