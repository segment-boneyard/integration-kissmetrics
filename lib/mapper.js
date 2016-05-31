
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
var flatten = require('flat');

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
    _k: this.settings.apiKey,
    _p: userId || anonymousId,
    _t: toUnixTimestamp(identify.timestamp()),
    _d: 1
  });
  addIPAndUserAgent(identify, payload.identify);
  if (userId && anonymousId) {
    payload.alias = {
      _k: this.settings.apiKey,
      _p: identify.userId(),
      _n: identify.sessionId()
    };
    addIPAndUserAgent(identify, payload.alias);
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
  addIPAndUserAgent(group, payload);
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
    _n: track.event(),
    _d: 1
  });
};

/**
 * Map page.
 *
 * @param {Page} page
 * @return {Object}
 * @api private
 */

exports.page = function(page) {
  var name = 'Viewed ' + (page.name() || page.category()) + ' Page';
  var properties = prefix('Page', page.properties());
  var payload = extend(properties, {
    _p: page.userId() || page.sessionId(),
    _t: toUnixTimestamp(page.timestamp()),
    _k: this.settings.apiKey,
    _n: name,
    _d: 1
  });
  addIPAndUserAgent(page, payload);
  return payload;
};

/**
 * Map screen.
 *
 * @param {Screen} screen
 * @return {Object}
 * @api private
 */

exports.screen = function(screen) {
  var name = 'Viewed ' + (screen.name() || screen.category()) + ' Screen';
  var properties = prefix('Screen', screen.properties());
  var payload = extend(properties, {
    _p: screen.userId() || screen.sessionId(),
    _t: toUnixTimestamp(screen.timestamp()),
    _k: this.settings.apiKey,
    _n: name,
    _d: 1
  });
  addIPAndUserAgent(screen, payload);
  return payload;
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
      userId: track.userId(),
      context: track.context()
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

  addIPAndUserAgent(track, properties);

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
  var payload = {
    _k: this.settings.apiKey,
    _p: alias.from(),
    _n: alias.to()
  };
  addIPAndUserAgent(alias, payload);
  return payload;
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
    // must flatten including the name of the original trait/property
    var nestedObj = {};
    nestedObj[k] = value;
    var flattenedObj = flatten(nestedObj, { safe: true });

    // stringify arrays inside nested object to be consistent with top level behavior of arrays
    for (var key in flattenedObj) {
      if (is.array(flattenedObj[key])) flattenedObj[key] = flattenedObj[key].toString();
    }

    ret = extend(ret, flattenedObj);
    delete ret[k];
  }
  return ret;
}

/**
 * Add _ip and _ua properties to a properties object when track.ip() and
 * track.userAgent() are available.
 *
 * @param {Track} track
 * @param {Object} obj
 */

function addIPAndUserAgent(msg, obj){
  var ip = msg.ip();
  if (ip) {
    obj._ip = ip;
  }
  var userAgent = msg.userAgent();
  if (userAgent) {
    obj._ua = userAgent;
  }
}
