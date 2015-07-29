'use strict';
require('brickflow-common');
var _ = require('lodash'),
    async = require('async'),
    moment = require('moment'),
    fs = require('fs');
var conf = require('./conf');
var connection = require('amqp').createConnection(conf.amqp);
var User = require('brickflow-common/model/user');
var emailTemplates = {};

try {
  var jsonStr = fs.readFileSync(__dirname +
      '/../static/emailTemplates.json', 'utf-8');
  emailTemplates = JSON.parse(jsonStr);
} catch (err) {
  console.log(err, err.stack);
}


async.eachSeries(
    _(emailTemplates).pick(function(tpl) {
      return tpl.triggerType === 'lastSeenDaysAgo';
    }).keys().value(),
    function(emailType, done) {
      var tpl = emailTemplates[emailType];
      console.time('xxx');
      User.find({
        createdAt: {
          $gte: moment().subtract(9, 'days')
        },
        lastSeenAt: {
          $gte: moment().subtract(tpl.triggerValue, 'days').startOf('day'),
          $lte: moment().subtract(tpl.triggerValue, 'days').endOf('day')
        },
        unsubscribed: { $ne: true }
      }, { tumblrUsername: 1, email: 1 }, { /* limit: 100 */ }, function(err, users) {
        console.timeEnd('xxx');
        console.log(err, users.length);
        _(users).each(function(user) {
          if (user && user.email && emailType) {
            connection.publish('mailer', {
              user: user,
              emailType: emailType
            })
          }
        });
        done();
      });
    });
