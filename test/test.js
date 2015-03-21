var request = require('supertest'),
    expect = require('chai').expect,
    express = require('express'),
    sinon = require('sinon'),
    timer = require('..')();

var stdErrSpy = sinon.spy(process.stderr, 'write');

describe('express-split-timer', function() {
  afterEach(function() {
    // default timer has no options
    timer = require('..')({});
  });

  describe('timer.start()', function() {
    it('should warn if no callback provided', function(done) {
      var app = express();
      app.get('/', timer.start(), sendOK);
      request(app)
        .get('/')
        .end(function() {
          expect(stdErrSpy.calledOnce).to.equal(true);
          done();
        });
    });
  });

  describe('timer.start(fn)', function() {
    var app, fn;
    beforeEach(function() {
      fn = sinon.spy();
      app = express();
      app.get('/', timer.start(fn), sendOK);
    });

    it('should call fn on completion of route', function(done) {
      request(app)
        .get('/')
        .end(function() {
          expect(fn.calledOnce).to.equal(true);
          done();
        });
    });

    it('should provide a __startTime of 0', function(done) {
      request(app)
        .get('/')
        .end(function() {
          expect(fn.firstCall.args[0].timings.__startTime).to.equal(0);
          done();
        });
    });

    it('should provide an __endTime greater than 0', function(done) {
      request(app)
        .get('/')
        .end(function() {
          expect(fn.firstCall.args[0].timings.__endTime).to.be.above(0);
          done();
        });
    });
  });

  describe('timer.start() called after timer.start(fn)', function() {
    var app, fn;
    beforeEach(function() {
      fn = sinon.spy();
      app = express();
      app.get('/', timer.start(fn), timer.start(), sendOK);
    });

    it('should not warn that a callback has not been provided', function(done) {
      var errCount = stdErrSpy.callCount;
      request(app)
        .get('/')
        .end(function() {
          expect(stdErrSpy.callCount).to.equal(errCount);
          done();
        });
    });

    it('should call the callback originally registered', function(done) {
      request(app)
        .get('/')
        .end(function() {
          expect(fn.calledOnce).to.equal(true);
          done();
        });
    });
  });

  describe('timer.start(fn2) called after timer.start(fn)', function() {
    var app, fn, fn2;
    beforeEach(function() {
      fn = sinon.spy();
      fn2 = sinon.spy();
      app = express();
      app.get('/', timer.start(fn), timer.start(fn2), sendOK);
    }); 

    it('should call fn2 on completion', function(done) {
      request(app)
        .get('/')
        .end(function() {
          expect(fn2.calledOnce).to.equal(true);
          done();
        });
    });

    it('should not call fn on completion', function(done) {
      request(app)
        .get('/')
        .end(function() {
          expect(fn.calledOnce).to.equal(false);
          done();
        });
    });
  });
    
  describe('timer.splitRoute()', function() {

    it('should return next(err) if key is not specified', function() {
      var middleware = timer.splitRoute(),
          next = sinon.spy();
      
      middleware.bind(null, null, null, next)();
      expect(next.firstCall.args[0] instanceof TypeError).to.be.true;
    });

    it('should return next() if key is not specified, but suppressErrors option is on', function() {
      var middleware = timer.splitRoute(),
          next = sinon.spy();

      timer = require('..')({suppressErrors: true});
      
      middleware.bind(null, null, null, next)();
      expect(next.firstCall.args[0]).to.be.undefined;
    });
  });

  describe('timer.splitRoute(key)', function() {
    var app, fn;

    beforeEach(function() {
      fn = sinon.spy();
      app = express();
    });

    it('should add a split to the fn argument when added as a middleware', function(done) {
      app.get('/', timer.start(fn), timer.splitRoute('marker'), sendOK);
      request(app)
        .get('/')
        .end(function() {
          var timings = fn.firstCall.args[0].timings;
          expect(timings.marker).to.be.above(0);
          expect(timings.__endTime).to.be.above(timings.marker);
          done();
        });
    });

    it('should not add a split to the fn argument if the timer is restarted after the middleware executes', function(done) {
      app.get('/', timer.start(fn), timer.splitRoute('marker'), timer.start(), sendOK);
      request(app)
        .get('/')
        .end(function() {
          expect(fn.firstCall.args[0].timings.marker).to.be.undefined;
          done();
        });
    });
  });

  describe('timer.split()', function() {
    it('should throw an error because there are not enough arguments', function() {
      expect(function() {
        timer.split();
      }).to.throw(Error);
    });
  });

  describe('timer.split(arg1)', function() {
    it('should throw an error because there are not enough arguments', function() {
      expect(function() {
        timer.split('key');
      }).to.throw(Error);
    });

    it('should not throw an error if suppressErrors set to true', function() {
      timer = require('..')({suppressErrors: true})
      expect(function() {
        timer.split('key');
      }).not.to.throw(Error);
    });
  });

  describe('timer.split(req, key) when timer not started', function() {
    it('should throw an error', function() {
      expect(function() {
        timer.split({}, 'key');
      }).to.throw(Error);
    });

    it('should not throw an error if suppressErrors set to true', function() {
      timer = require('..')({suppressErrors: true});
      expect(function() {
        timer.split({}, 'key');
      }).not.to.throw(Error);
    });
  });

  describe('timer.split(req, key) when key is not a string', function() {
    it('should throw an error because there are not enough arguments', function() {
      expect(function() {
        timer.split({}, {});
      }).to.throw(Error);
    });

    it('should not throw an error if suppressErrors set to true', function() {
      timer = require('..')({suppressErrors: true})
      expect(function() {
        timer.split({},{});
      }).not.to.throw(Error);
    });
  });

  describe('timer.split(req, key) - valid', function() {
    var app, fn;
    beforeEach(function() {
      fn = sinon.spy();
      app = express();
    });

    it('should add key to fn argument', function(done) {
      app.get('/', timer.start(fn), function(req, res, next) {
          timer.split(req, 'testKey'); next();
        }, 
        sendOK
      );
      request(app)
        .get('/')
        .end(function() {
          var timings = fn.firstCall.args[0].timings;
          expect(timings.testKey).to.be.above(0);
          expect(timings.__endTime).to.be.above(timings.testKey);
          done();
        });
    });

    it('should warn if duplicate key is detected, and overwrite', function(done) {
      var prevErrorCount = stdErrSpy.callCount;
      app.get('/', timer.start(fn), 
        function(req, res, next) {
          timer.split(req, 'testKey');
          timer.split(req, 'testKey');
          next();
        }, 
        sendOK
      );
      request(app)
        .get('/')
        .end(function() {
          var timings = fn.firstCall.args[0].timings;
          expect(prevErrorCount).to.be.below(stdErrSpy.callCount);
          expect(timings.testKey).to.be.above(0);
          expect(timings.__endTime).to.be.above(timings.testKey);
          done();
        });
    });

    it('should include the request path', function(done) {
      app.get('/', timer.start(fn), sendOK);
      request(app)
        .get('/')
        .end(function() {
          expect(fn.firstCall.args[0].path).to.equal('/');
          done();
        });
      
    });
    
  });
});

function sendOK(req, res) {
  res.send('OK');
}
