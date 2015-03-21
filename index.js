var onHeaders = require('on-headers');

module.exports = (function () {
  var timer = {};

  timer.start = function (callback) {
    // Return a middleware - timer start must be registered as a middleware
    return function (req, res, next) {
      req.__est = req.__est || {};

      // Warn if no callback provided
      if (typeof callback !== 'function' && !req.__est.hasRegisteredCallback) {
        process.stderr.write("express-split-timer: No callback registered. " +
        "Register a callback to process results." + '\n', 'utf8');
      }

      // Update completion callback
      req.__est.callback = (typeof callback === 'function' ? callback : undefined) || req.__est.callback ;

      // Register timer stop to fire when headers are written (only register once)
      if (!req.__est.hasRegisteredCallback) {
        onHeaders(res, stopTimer.bind(null, req));
        req.__est.hasRegisteredCallback = true;
      }

      // Start the timer
      req.__est.timings = {
        __startTime: process.hrtime()
      };
      next();
    };
  }.bind(timer);

  // Allow splitting the timer as a middleware
  timer.splitRoute = function(key) {
    var self = this;

    if (typeof key !== 'string') {
      throw new TypeError('express-split-timer: key for timer split must be a string');
    }
    
    return function (req, res, next) {
      self.split.call(null, req, key);
      next();
    };
  }.bind(timer);

  timer.split = function split (req, key) {
    // Check that both args are passed
    if (arguments.length !== 2) {
      throw new Error('express-split-timer: wrong number of arguments for split(req, key)');
    }

    if (typeof key !== 'string') {
      throw new TypeError('express-split-timer: key for timer split must be a string');
    }

    // Ensure that the timer has been initialized
    if (!req.__est) {
      throw new Error('express-split-timer: split() called for unstarted timer. ' +
        'Ensure that express-split-timer.start() middleware is registered prior to ' +
        'calling split()');
    }

    // Warn if a duplicate timing key is used
    if (req.__est.timings[key]) {
      process.stderr.write('express-split-timer: duplicate key: ' + key + '. It will be overwritten.\n', 'utf8');
    }

    // Record delta
    req.__est.timings[key] = hrToMilliseconds(process.hrtime(req.__est.timings.__startTime));
  }

  // Export:
  return timer;
}());


function hrToMilliseconds (hrtime) {
  return hrtime[0] * 1e3 + hrtime[1] * 1e-6;
};

function stopTimer (req) {
  var timings = req.__est.timings,
      callback = req.__est.callback;

  // Get final time delta
  timings.__endTime = hrToMilliseconds(process.hrtime(timings.__startTime));

  // Zero starting point
  timings.__startTime = 0;

  // Apply callback to results
  if (typeof callback === 'function') {
    callback.call(this, timings);
  }

  // Clean up our pollution of the request object
  req.__est = undefined;
};
