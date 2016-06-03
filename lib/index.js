
/**
 * Module dependencies.
 */

var Batch = require('batch');
var integration = require('segmentio-integration');
var mapper = require('./mapper');
var qs = require('qs');

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
 * Use a POST request if the GET query string payload exceeds 2KB.
 */

var MAX_GET_PAYLOAD = 2048;

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
  var self = this;
  this._request('/s', payload.identify, function(err){
    if (err) return fn(err);
    if (!payload.alias) return fn();
    self.alias(payload.alias, fn);
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

KISSmetrics.prototype.group = handler('/s');

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

KISSmetrics.prototype.track = handler('/e');

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

KISSmetrics.prototype.screen = KISSmetrics.prototype.page = handler('/e');

/**
 * Order Completed.
 *
 * http://support.kissmetrics.com/apis/specifications.html
 *
 * @api private
 * @param {Object} track
 * @param {Object} settings
 * @param {Function} done
 */

KISSmetrics.prototype.orderCompleted = function(track, done) {
  var self = this;
  var payloads = mapper.orderCompleted.call(this, track);

  return this._request('/e', payloads.event, function(err, responses){
    if (err) {
      return done(err);
    }

    var batch = new Batch();
    batch.throws(true);

    payloads.products.forEach(function(product){
      batch.push(function(done){
        self._request('/s', product, done);
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

KISSmetrics.prototype.alias = handler('/a');

/**
 * Generate a request handler for the specified path.
 *
 * @param {String} path
 * @return {Function}
 * @api private
 */

function handler(path){
  return function(payload, fn){
    return this._request(path, payload, this.handle(fn));
  };
}

/**
 * Make a request.
 *
 * @param {String} path
 * @param {Object|String} payload
 * @param {Function} fn
 * @api private
 */

KISSmetrics.prototype._request = function(path, payload, fn){
  var payloadStr = (typeof payload !== 'string') ? qs.stringify(payload) : payload;
  var request;

  if (payloadStr.length > MAX_GET_PAYLOAD) {
    request = this.post(path).send(payloadStr);

  } else {
    // Unfortunately we can't pass a payload string to query() until the superagent
    // dependency is updated from v0.21.0 to at least v1.0.0. See:
    //
    //   github.com/visionmedia/superagent/commit/13fa10393a78b8dd7e1005ba1d2b57f4274d86ed
    //
    // This means that the payload will be stringified twice, once here and once
    // inside superagent's query() function
    request = this.get(path).query(payload);
  }

  return request.end(fn);
};
