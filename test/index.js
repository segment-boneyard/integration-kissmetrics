
var Test = require('segmentio-integration-tester');
var helpers = require('./helpers');
var facade = require('segmentio-facade');
var KISSmetrics = require('..');
var should = require('should');
var assert = require('assert');

describe('KISSmetrics', function () {
  var kissmetrics;
  var settings;
  var test;

  beforeEach(function(){
    settings = { apiKey: '2b93bdf937c54fc7da2b5c6015c273bf3919c273' };
    kissmetrics = new KISSmetrics(settings);
    test = Test(kissmetrics, __dirname);
  });

  it('should have correct settings', function(){
    test
      .name('KISSmetrics')
      .endpoint('https://trk.kissmetrics.com')
      .ensure('settings.apiKey')
      .channels(['server']);
  });

  describe('.validate()', function () {
    it('should be invalid when .apiKey is missing', function(){
      delete settings.apiKey;
      test.invalid({}, settings);
    });

    it('should be valid when settings are complete', function(){
      test.valid({}, settings);
    });
  });

  describe('mapper', function(){
    describe('identify', function(){
      it('should map basic identify', function(){
        test.maps('identify-basic', settings);
      });

      it('should contain .alias if .userId and .anonymousId are given', function(){
        test.maps('identify-alias', settings);
      });

      it('should clean and stringify objects', function(){
        test.maps('identify-clean', settings);
      });
    });

    describe('track', function(){
      it('should map basic track', function(){
        test.maps('track-basic', settings);
      });

      it('should map clean track', function(){
        test.maps('track-clean', settings);
      });

      it('should prefix properties if `.prefixProperties` is true', function(){
        settings.prefixProperties = true;
        test.maps('track-prefix', settings);
      });
    });

    describe('completedOrder', function() {
      it('should map a basic event', function() {
        test.maps('track-completed-order', settings);
      });

      it('should map prefixed properties', function() {
        settings.prefixProperties = true;
        test.maps('track-completed-order-prefixed', settings);
      });
    });

    describe('alias', function(){
      it('should map basic alias', function(){
        test.maps('alias-basic', settings);
      });
    });
  });

  describe('.track()', function () {
    var track = helpers.track();
    it('should be able to track correctly', function(done){
      kissmetrics.track(track, done);
    });

    it('should properly set nested objects as properties', function(done){
      var json = test.fixture('track-clean');

      test
        .set(settings)
        .track(json.input)
        .query(json.output)
        .expects(200, done);
    });

    it('should prefix event properties if prefixProperties is enabled', function(){
      kissmetrics.settings.prefixProperties = true;
      var result = kissmetrics.mapper.track.call(kissmetrics, track);
      result['Baked a cake - layers'].should.eql('chocolate,strawberry,fudge');
      result['Billing Amount'].should.eql(19.95);
      result._n.should.eql('Baked a cake');
    });

    it('should not prefix event properties if prefixProperties is disabled', function(){
      var result = kissmetrics.mapper.track.call(kissmetrics, track);
      result['layers'].should.eql('chocolate,strawberry,fudge');
      result['Billing Amount'].should.eql(19.95);
      result._n.should.eql('Baked a cake');
    });
  });

  describe('orderCompleted', function() {
    it('should perform an event call', function(done) {
      var json = test.fixture('track-completed-order');
      test
        .set(settings)
        .track(json.input)
        .requests(3)
        .request(0)
        .query(json.output.event)
        .end(done);
    });

    it('should perform a set call per product', function(done) {
      var json = test.fixture('track-completed-order');
      var suite = test
        .requests(3)
        .set(settings)
        .track(json.input);

      suite
        .request(1)
        .query(json.output.products[0]);

      suite
        .request(2)
        .query(json.output.products[1]);

      suite.end(done);
    });
  });

  describe('.identify()', function () {
    var identify = helpers.identify();
    it('should be able to identify correctly', function(done){
      kissmetrics.identify(identify, done);
    });
  });

  describe('.alias()', function () {
    var alias = helpers.alias();
    it('should be able to alias properly', function(done){
      kissmetrics.alias(alias, done);
    });
  });

  describe('.page()', function(){
    it('should be able to track all pages', function(done){
      var json = test.fixture('page-all');
      test
        .set(settings)
        .set(json.settings)
        .page(json.input)
        .query(json.output)
        .end(function(err, res){
          if (err) return done(err);
          assert.equal(200, res[0].status);
          done();
        });
    });

    it('should be able to track categorized pages', function(done){
      var json = test.fixture('page-categorized');
      test
        .set(settings)
        .set(json.settings)
        .page(json.input)
        .query(json.output)
        .end(function(err, res){
          if (err) return done(err);
          assert.equal(200, res[0].status);
          done();
        });
    });

    it('should be able to track named pages', function(done){
      var json = test.fixture('page-named');
      test
        .set(settings)
        .set(json.settings)
        .page(json.input)
        .query(json.output)
        .end(function(err, res){
          if (err) return done(err);
          assert.equal(200, res[0].status);
          done();
        });
    });
  });

  describe('.screen()', function(){
    it('should be able to track all screens', function(done){
      var json = test.fixture('screen-all');
      test
        .set(settings)
        .set(json.settings)
        .screen(json.input)
        .query(json.output)
        .end(function(err, res){
          if (err) return done(err);
          assert.equal(200, res[0].status);
          done();
        });
    });

    it('should be able to track categorized screens', function(done){
      var json = test.fixture('screen-categorized');
      test
        .set(settings)
        .set(json.settings)
        .screen(json.input)
        .query(json.output)
        .end(function(err, res){
          if (err) return done(err);
          assert.equal(200, res[0].status);
          done();
        });
    });

    it('should be able to track named screens', function(done){
      var json = test.fixture('screen-named');
      test
        .set(settings)
        .set(json.settings)
        .screen(json.input)
        .query(json.output)
        .end(function(err, res){
          if (err) return done(err);
          assert.equal(200, res[0].status);
          done();
        });
    });
  });
});
