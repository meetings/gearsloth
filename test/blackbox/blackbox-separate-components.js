var async = require('async');
var chai = require('chai');
var expect = chai.expect;
var child_process = require('child_process');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var spawn = require('../lib/spawn');

chai.should();
chai.use(sinonChai);

suite('blackbox: separate gearslothd processes', function() {
  
})