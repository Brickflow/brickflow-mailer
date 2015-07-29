'use strict';

var amqpConf = {
  //host: 'kitana.brickflow.com',
  host: '172.30.1.53',
  login: 'brickflow',
  password: 'password'
};

module.exports = {
  ses: {
    key: 'key',
    secret: 'secret'
  },
  amqp: amqpConf,
  logger: {
    logstash: {
//      host: '172.30.1.144',
      host: 'raiden.brickflow.com',
      port: '28777',
      nodeName: 'brickflow_node'
    },
    amqp: amqpConf
  },
  queueName: 'mailer',
  mail: {
    from: 'info@brickflow.com'
  },
  host: 'brickflow.com',

  persistentQueue: {
    durable: true,
    mandatory: true,
    autoDelete: false
  }
};
