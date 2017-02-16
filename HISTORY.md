
1.2.1 / 2017-02-16
==================

  * Build to upgrade integration-worker

1.2.0 / 2017-01-31
==================

  * Standardize integration (linting, Docker configuration, circle.yml, upgrade
segmentio-integration version, upgrade integration-worker version, etc.)


1.1.1 / 2016-08-24
==================

  * Fix aliasing in identify method. (#25)

1.1.0 / 2016-08-16
==================

  * update ecommerce syntax from v1 to v2

1.0.14 / 2016-08-10
===================

  * Use a POST request when the payload exceeds a certain size (#24)
  * Pass along context.{ip,userAgent} as _ip and _ua (#22)
  * add docker, refactor circle

1.0.13 / 2016-01-15
===================

  * Map screen in mapper
  * Adds ip and user agent

1.0.12 / 2016-01-11
===================

  * Adds Screen call

1.0.11 / 2015-10-29
===================

  * cover edge case of arrays inside nested obj
  * flatten nested objects to top level

1.0.10 / 2015-10-29
===================

  * Map Group call in KissMetrics

1.0.9 / 2015-10-29
==================

  * Update KISSMetrics page call
  * Add Completed Order handler

1.0.8 / 2015-02-19
==================

  * add track and screen

1.0.7 / 2015-02-13
==================

 * fixed sending 'products: 0' when the property isn't set
 * update circle template

1.0.6 / 2014-12-08
==================

 * bump segmentio-integration

1.0.5 / 2014-12-03
==================

  * fix: use isodate-traverse

1.0.4 / 2014-12-02
==================

 * bump integration proto

1.0.3 / 2014-12-02
==================

 * remove .retries()
 * fix dev deps
 * bump dev deps

1.0.2 / 2014-12-02
==================

 * bump segmentio-integration

1.0.1 / 2014-11-21
==================

 * Bumping segmentio-integration
 * fix build status badge

1.0.0 / 2014-11-14
==================

  * Initial release
