'use strict';
var ses = require('node-ses'),
    nconf = require('nconf'),
    fs = require('fs'),
    _ = require('lodash'),
    config = require('../config'),
    logger = require('../metrics').
    createTracker('email', null, { mixpanel: true }),
    client = ses.createClient({
  key: config.get('SES_KEY'),
  secret: config.get('SES_SECRET')
}),
    getBrickflowURL = require('./helpers/urlHelper').getBrickflowURL,
    email = {};

nconf.add('email', {
  type: 'file',
  file: 'static/emailTemplates.json'
});

email.send = function(params, cb) {
  if (params === undefined){
    cb('You must specify params.');
  }
  if (params.user === undefined){
    cb('You must specify a user.');
  }
  var recipient = params.user.email;

  var locals = {
    name: params.user.tumblrUsername,
    logoPath: 'http://' + config.get('HOST') +
        (config.get('PORT') === 80 ? '' : ':' + config.get('PORT')) +
        '/trackEmail/logo.png?user=' + params.user.tumblrUsername,
    brickflowUrl: getBrickflowURL({
      utm: _.defaults(params.utm, {
        source: 'email',
        campaign: params.user.tumblrUsername
      })
    }),
    noteCount: params.noteCount
  };

  logger.info('email-send', {
    to: recipient,
    user: locals.name
  });

  var subject = nconf.get(params.email).subject;

  var message = fs.readFileSync(__dirname + '/../../../static/' +
      nconf.get(params.email).template + '.html', 'utf-8');

  for (var key in locals) {
    if (locals.hasOwnProperty(key)) {
      message = message.replace(new RegExp('%' + key+ '%', 'g'), locals[key]);
    }
  }

  // replace in template variables as well
  for (key in locals) {
    if (locals.hasOwnProperty(key)) {
      message = message.replace(new RegExp('%' + key+ '%', 'g'), locals[key]);
    }
  }

  client.sendemail({
    to: recipient,
    from: config.get('EMAIL_FROM'),
    subject: subject,
    message: message
  }, function (err, data, res) {
    if (err) {
      logger.error('email-send-error', {
        err: err,
        stack: err.stack,
        user: locals.name,
        to: recipient
      });
      return cb(err);
    }
    else if (res && res.statusCode === 200) {
      logger.info('email-send-success', {
        user: locals.name,
        to: recipient
      });
      return cb(null, res);
    }
  });
};

module.exports = email;
