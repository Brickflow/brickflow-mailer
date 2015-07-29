'use strict';
var conf = require('./conf');

var _ = require('lodash'),
    amqp = require('amqp'),
    retry = require('amqp-retry'),
    nconf = require('nconf'),
    fs = require('fs'),
    ses = require('node-ses').createClient(conf.ses);
var request = require('request');
var metrics = require('brickflow-logger')(conf.logger);
var getBrickflowURL = require('./helpers/urlHelper').getBrickflowURL;

nconf.add('email', {
  type: 'file',
  file: 'static/emailTemplates.json'
});

var logger = metrics.createTracker('mailer');
var connection = amqp.createConnection(conf.amqp);
var count = 0;

function qHandler(err, task, headers, deliveryInfo, job) {
  var mailParams = nconf.get(task.emailType);

  var locals = _(mailParams).assign({
    name: task.user.tumblrUsername,
    logoPath: 'http://' + conf.host +
        '/trackEmail/logo.png?user=' + task.user.tumblrUsername,

    button_url: getBrickflowURL({
      utm: _.defaults(task.utm || {}, { //
        source: 'email',
        medium: 'retention',
        campaign: task.user.tumblrUsername,
        content: task.emailType 
      })
    }, mailParams.button_url),
    noteCount: task.user.noteCount,
  }).value();


  var message = fs.readFileSync(__dirname + '/../static/' +
      mailParams.template + '.html', 'utf-8');

  _(2).times(function() {
    for (var key in locals) {
      if (locals.hasOwnProperty(key)) {
        message = message.replace(new RegExp('%' +key+ '%', 'g'), locals[key]);
      }
    }
  });

  var mail = {
    to: task.user.email,
    from: conf.mail.from,
    subject: mailParams.subject,
    message: message
  };
  count++;
  console.log(count + ' - ' + mail.to + ' - ' + mail.subject);

  if (!mail.to) {
    return job.acknowledge();
  }

  ses.sendemail(mail, function (err, data, res) {
    job.acknowledge();
    if (err) {
      job.retry();
      logger.error('email-send-error', {
        err: err,
        stack: err.stack,
        user: locals.name,
        to: task.user.email
      });
    } else if (res && res.statusCode === 200) {
      logger.info('email-send-success', {
        user: locals.name,
        to: task.user.email
      });
    }
  });
  
}

connection.on('ready', function() {
  connection.queue(conf.queueName, conf.persistentQueue, function(q) {
    q.bind('#');
    q.subscribe({ ack: true }, retry(10000, 5, qHandler));
  })
});

connection.on('error', function(err) {
  console.log('mailer Q ERRORKA', err, err.stack);
});

connection.on('close', function() {
  console.log('mailer Q CLOSED', arguments);
});
