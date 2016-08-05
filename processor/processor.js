'use strict';

(function () {
    const amqp = require('amqplib/callback_api'),
        exchange = 'message_bus',
        fs = require('fs'),
        r = require('rethinkdb');

    amqp.connect('amqp://localhost', function(err, conn) {
        if (err) process.exit(1);

        conn.createChannel(function(err, ch) {
            if (err) process.exit(1);

            ch.assertExchange(exchange, 'topic', { durable: true });
            ch.prefetch(1);

            r.connect({}, function(err, conn) {
                if (err) process.exit(1);

                const messageBus = { channel: ch, exchange: exchange };
                const dataLayer = { r: r, connection: conn };

                fs.readdirSync('./processor/handlers').forEach(function (file) {
                    require('./handlers/' + file).setUp(messageBus, dataLayer);
                });
            });
        });
    });
})();
