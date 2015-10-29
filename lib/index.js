
/**
 * Module dependencies.
 */

var Batch = require('batch');
var integration = require('segmentio-integration');
var mapper = require('./mapper');

/**
 * Expose `KISSmetrics`
 */

var KISSmetrics = module.exports = integration('KISSmetrics')
  .endpoint('https://trk.kissmetrics.com')
  .ensure('settings.apiKey')
  .channels(['server'])
  .mapper(mapper)
  .retries(2);

/**
 * Identify.
 *
 * http://support.kissmetrics.com/apis/specifications.html
 *
 * @param {Identify} identify
 * @param {Function} fn
 * @api public
 */

KISSmetrics.prototype.identify = function(payload, fn){
  var identify = request('/s').bind(this);
  var alias = request('/a').bind(this);
  identify(payload.identify, function(err){
    if (err) return fn(err);
    if (!payload.alias) return fn();
    alias(payload.alias, fn);
  });
};

/**
 * Group.
 *
 * http://support.kissmetrics.com/apis/specifications.html
 *
 * @param {Group} group
 * @param {Function} fn
 * @api public
 */

KISSmetrics.prototype.group = request('/s');

/**
 * Track.
 *
 * http://support.kissmetrics.com/advanced/importing-data
 * http://support.kissmetrics.com/apis/specifications.html
 *
 * @param {Track} track
 * @param {Object} settings
 * @param {Function} fn
 * @api private
 */

KISSmetrics.prototype.track = request('/e');

/**
 * Page.
 *
 * http://support.kissmetrics.com/advanced/importing-data
 * http://support.kissmetrics.com/apis/specifications.html
 *
 * @param {Page} page
 * @param {Object} settings
 * @param {Function} fn
 * @api private
 */

KISSmetrics.prototype.page = request('/e');

/**
 * Completed Order.
 *
 * http://support.kissmetrics.com/apis/specifications.html
 *
 * @api private
 * @param {Object} track
 * @param {Object} settings
 * @param {Function} done
 */
KISSmetrics.prototype.completedOrder = function(track, done) {
  var self = this;
  var payloads = mapper.completedOrder.call(this, track);

  return this
    .get('/e')
    .query(payloads.event)
    .end(function(err, responses) {
      if (err) {
        return done(err);
      }

      var batch = new Batch();
      batch.throws(true);

      payloads.products.forEach(function(product) {
        batch.push(function(done) {
          self
            .get('/s')
            .query(product)
            .end(done);
        });
      });

      batch.end(done);
    });
};

/**
 * Alias.
 *
 * http://support.kissmetrics.com/apis/specifications.html
 *
 * @param {Alias} alias
 * @param {Object} settings
 * @param {Function} fn
 * @api private
 */

KISSmetrics.prototype.alias = request('/a');

/**
 * Generate request.
 *
 * @param {String} path
 * @return {Function}
 * @api private
 */

function request(path){
  return function(payload, fn){
    return this
      .get(path)
      .query(payload)
      .end(this.handle(fn));
  };
}
