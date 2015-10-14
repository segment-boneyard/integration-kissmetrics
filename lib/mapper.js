
/**
 * Module dependencies.
 */

var Track = require('segmentio-facade').Track;
var extend = require('extend');
var is = require('is');
var map = require('lodash.map');
var omit = require('lodash.omit');
var toUnixTimestamp = require('unix-time');
var traverse = require('isodate-traverse');

/**
 * Map identify.
 *
 * @param {Identify} identify
 * @return {Object}
 * @api private
 */

exports.identify = function(identify){
  var userId = identify.userId();
  var anonymousId = identify.sessionId();
  var payload = {};
  payload.identify = clean(identify.traits());
  payload.identify = extend(payload.identify, {
    _p: userId || anonymousId,
    _t: toUnixTimestamp(identify.timestamp()),
    _k: this.settings.apiKey,
    _d: 1
  });
  if (userId && anonymousId) {
    payload.alias = {
      _k: this.settings.apiKey,
      _p: identify.userId(),
      _n: identify.sessionId()
    };
  }
  return payload;
};

/**
 * Map group.
 *
 * @param {Group} group
 * @return {Object}
 * @api private
 */

exports.group = function(group){
  var userId = group.userId();
  var anonymousId = group.sessionId();
  var payload = prefix('Group', clean(group.traits()));
  payload = extend(payload, {
    'Group - id': group.groupId(),
    _p: userId || anonymousId,
    _t: toUnixTimestamp(group.timestamp()),
    _k: this.settings.apiKey,
    _d: 1
  });
  return payload;
};

/**
 * Map track.
 *
 * @param {Track} track
 * @return {Object}
 * @api private
 */

exports.track = function(track) {
  var properties = createBaseTrackProperties(track, this.settings);
  return extend(properties, {
    _p: track.userId() || track.sessionId(),
    _t: toUnixTimestamp(track.timestamp()),
    _k: this.settings.apiKey,
    _n: track.event(),
    _d: 1
  });
};

/**
 * Map Completed Order.
 *
 * @api private
 * @param {Track} track
 * @return {Object}
 */
exports.completedOrder = function completedOrder(track) {
  var event = track.event();
  var settings = this.settings;

  var mappedEvent = extend(
    createBaseTrackProperties(track, settings),
    {
      _n: event
    }
  );

  var products = map(track.products(), function(product) {
    return new Track({
      event: event,
      properties: product,
      timestamp: track.timestamp(),
      userId: track.userId()
    });
  });
  var mappedProducts = map(products, function(product, i) {
    return extend(
      createBaseTrackProperties(product, settings),
      {
        // Ensure products aren't ignored as duplicates
        // http://support.kissmetrics.com/troubleshooting/detecting-duplicates
        _t: toUnixTimestamp(product.timestamp()) + i
      }
    );
  });

  return {
    event: mappedEvent,
    products: mappedProducts
  };
};

/**
 * Return a new object with a `track` call's common properties (special
 * Kissmetrics properties and any custom properties, which may or may not be
 * prefixed). Omits the `products` property as it is used differently in various
 * calls.
 *
 * @param {Track} track
 * @param {Object} settings
 * @return {Object}
 */
function createBaseTrackProperties(track, settings) {
  var properties = omit(clean(track.properties()), 'products');
  var revenue = track.revenue();
  if (revenue) {
    properties.revenue = revenue;
    properties['Billing Amount'] = revenue;
  }
  if (settings.prefixProperties) {
    properties = prefix(track.event(), properties);
  }

  return extend(
    properties,
    {
    _d: 1,
    _k: settings.apiKey,
    _p: track.userId() || track.sessionId(),
    _t: toUnixTimestamp(track.timestamp())
  });
};

/**
 * Prefix properties with the event name.
 *
 * @param {String} event
 * @param {Object} properties
 * @api private
 */

function prefix(event, properties){
  var props = {};

  Object.keys(properties).forEach(function(key){
    var val = properties[key];
    if (key === 'Billing Amount') return props[key] = val;
    props[event + ' - ' + key] = val;
  });

  return props;
}

/**
 * Map alias.
 *
 * @param {Alias} alias
 * @return {Object}
 * @api private
 */

exports.alias = function(alias){
  return {
    _k: this.settings.apiKey,
    _p: alias.from(),
    _n: alias.to()
  };
};

/**
 * Clean all nested objects and arrays.
 *
 * @param {Object} obj
 * @return {Object}
 * @api public
 */

function clean(obj){
  obj = traverse(obj);
  var ret = {};

  for (var k in obj) {
    var value = obj[k];
    if (null == value) continue;

    // date
    if (is.date(value)) {
      ret[k] = toUnixTimestamp(value);
      continue;
    }

    // not object
    if ('[object Object]' !== value.toString()) {
      ret[k] = value.toString();
      continue;
    }

    // json
    ret[k] = JSON.stringify(value);
  }

  return ret;
}
