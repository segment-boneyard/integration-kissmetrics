
/**
 * Module dependencies.
 */

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
  var payload = clean(track.properties());
  var productCount = 0;
  if (track.revenue()) payload['Billing Amount'] = track.revenue();
  if (this.settings.prefixProperties) payload = prefix(track.event(), payload);
  if (!is.null(track.properties().products) && !is.undefined(track.properties().products)) {
    productCount = track.products().length;
  }
  return extend(payload, {
    _p: track.userId() || track.sessionId(),
    _t: time(track.timestamp()),
    _k: this.settings.apiKey,
    _n: track.event(),
    _d: 1,
    products: productCount
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
