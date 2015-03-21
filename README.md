# express-split-timer
An express utility and middleware generator for gathering accurate intra-route timing metrics

This module creates a timer which can record arbitrary time splits either from within a middleware or between middlewares, for a route's stack. 

Simply provide a callback at the point where the timer is started, and when the request is finished (marked by the point where response headers are written) the callback will be passed the timing splits, and executed.

Timings are calculated using process.hrtime() for accurate time measurements.

## Installation
`npm install express-split-timer`

Or to save as a project dependency

`npm install --save-dev express-split-timer`

## Example
__app.js__:

``` javascript
var express = require('express'),
    timer = require('express-split-timer')(),
    app = express();

app.use(timer.start(processTimes));

app.get('/', 
  timer.splitRoute('preAuth'),
  authMiddleware,
  timer.splitRoute('preProcessUser'),
  function processUser(req, res, next) {
    // Do very useful things
    timer.split(req, 'usefulnessCompleted');
    res.send('OK');
  });

app.listen(12315, function () {
  console.log('Go to http://localhost:12315 and check back for some timing data...');
});

function processTimes (data) {
  console.log('Timings for path: ' + data.path);
  Object.keys(data.timings).forEach(function(key) {
    console.log('\t' + key + ': ' + data.timings[key] + 'ms');
  });
}

function authMiddleware (req, res, next) {
  // let's pretend to do useful things
  setTimeout(function() {
    next();
  }, 500);
}

```

Start the server:

```node app.js```

Navigate to http://localhost:12315, and view the console:

```
Timings for path: /
  __startTime: 0ms
  preAuth: 0.49623999999999996ms
  preProcessUser: 501.38875399999995ms
  usefulnessCompleted: 501.4314ms
  __endTime: 504.559962ms
```

## API
### require('express-split-timer')(opts)
`opts` - set the following options:

1. `suppressErrors` (boolean) - if `true`, don't throw errors if timer is not used correctly. Default: `false`

### timer.start(fn(data))
Start the timer. `fn` is the callback to execute on request completion. The `data` argument will have the following properties:

1. `path` (string) - The requested path for this timing data
2. `timings` (object) - The hash of `key: time` data collected

The timing data starts with the `__startTime` property as 0, and each registered `key`'s value is the number of milliseconds which pass since the timer was started (see `timer.splitRoute(key)` and `timer.split(req, key)` for how to register `key`s). There will also be an `__endTime` property, which represents the time from the timer's start to when the response headers are written.

It is possible to 'restart' a timer during a middleware stack. This allows registering a callback at a general level, and overwritting this in specific cases if needed. Any timing splits prior to resetting the timer will be lost.

### timer.splitRoute(key)
Record a split for the `key (string)`, and return a middleware function. Returning a middleware allows calling `timer.split(key)` when registering a middleware stack.

If a key is registered more than once in a single stack, only the latest will be recorded.

### timer.split(req, key)
Record a split for the `key (string)` from within a middleware function.

Note that a `req` object must be provided to associate the timing split with the correct request.

## License
MIT
