'use strict';

(function () {
    const amqp = require('amqplib/callback_api'),
        exchange = 'processor',
        fs = require('fs');;

    amqp.connect('amqp://localhost', function(err, conn) {
        conn.createChannel(function(err, ch) {
            ch.assertExchange(exchange, 'topic', { durable: true });
            ch.prefetch(1);

            fs.readdirSync('./processor/handlers').forEach(function (file) {
                require('./handlers/' + file).setUp(ch, exchange);
            });
        });
    });
})();
