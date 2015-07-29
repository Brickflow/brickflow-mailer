'use strict';
/* jshint camelcase: false */
var _ = require('lodash');

var urlHelper = {
  getBrickflowURL: function(params, path) {
    path = path || 'http://brickflow.com';
    params = params || {};

    if (params.utm) {
      _(params.utm).each(function(v, k) {
        params['utm_' + k] = v;
      });
      params.utm = null;
    }

    var url = path + '?' + _(params).map(function(v, k) {
      return v ? k + '=' + v : null;
    }).compact().value().join('&');

    return url;
  }
};

module.exports = urlHelper;
