
/**
 * Module dependencies.
 */

var Track = require('segmentio-facade').Track;
var traverse = require('isodate-traverse');
var time = require('unix-time');
var extend = require('extend');
var is = require('is');

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
    _t: time(identify.timestamp()),
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
 * Map track.
 *
 * @param {Track} track
 * @return {Object}
 * @api private
 */

exports.track = function(track){
  var ret = createCommonTrack(track, this.settings);
  if (!is.null(track.properties().products) && !is.undefined(track.properties().products)) {
    ret.productCount = track.products().length;
  }
  return extend(ret, {
    _t: time(track.timestamp()),
    _n: track.event()
  });
};

/**
 * Map Completed Order
 *
 * @api private
 * @param {Track} track
 * @param {Object} settings
 * @return {Object}
 */

exports.completedOrder = function(track, settings){
  var payload = {};
  var products = track.products();

  // create the top level payload the completed order event
  payload.event = createCommonTrack(track, settings);
  payload.event._n = "Completed Order";
  payload.event._t = time(track.timestamp());
  payload.event.products = products.length;

  // create individual payload for each product to be sent separately later
  payload.products = products.map(function(product, i){
    var item = new Track({ properties: product, event: 'Completed Order' });
    return createCommonTrack(item, settings);
  });

  return payload;
}

/**
 * Create common event payload
 *
 * @param {Track} track
 * @param {Object} settings
 * @api private
 */

function createCommonTrack(track, settings){
  var payload = clean(track.properties());
  if (track.products()) delete payload['products'];
  if (track.revenue()) payload['Billing Amount'] = track.revenue();
  if (settings.prefixProperties) payload = prefix(track.event(), payload);
  return extend(payload, {
    _p: track.userId() || track.sessionId(),
    _k: settings.apiKey,
    _d: 1
  });
}

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
  var obj = traverse(obj);
  var ret = {};

  for (var k in obj) {
    var value = obj[k];
    if (null == value) continue;

    // date
    if (is.date(value)) {
      ret[k] = time(value);
      continue;
    }

    // not object
    if ('[object Object]' != value.toString()) {
      ret[k] = value.toString();
      continue;
    }

    // json
    ret[k] = JSON.stringify(value);
  }

  return ret;
}
