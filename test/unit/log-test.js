var log = require('../../lib/log.js');

suite('log', function() {
  setup(function() {
    require('chai').should();
  });

  test('should have an err() function', function() {
    log.should.have.property('err');
    log.err.should.be.a('function');
  });

  test('should have an info() function', function() {
    log.should.have.property('info');
    log.info.should.be.a('function');
  });

  test('should have a debug() function', function() {
    log.should.have.property('debug');
    log.debug.should.be.a('function');
  });
});
