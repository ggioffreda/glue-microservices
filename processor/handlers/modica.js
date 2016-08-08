exports.setUp = function (messageBus, dataLayer) {
    const channel = messageBus.channel,
        exchange = messageBus.exchange,
        r = dataLayer.r,
        rconn = dataLayer.connection;

    channel.assertQueue('default_modica', { durable: true }, function(err, q) {
        const queue = q.queue,
            https = require('https'),
            soap = require('soap'), fs = require('fs'),
            config = JSON.parse(fs.readFileSync('./config/processor.handlers.modica.json', 'utf8'));

        channel.bindQueue(queue, exchange, '*.*._modica.*.inserted');

        channel.consume(queue, function (msg) {
            const data = JSON.parse(msg.content.toString()),
                parts = msg.fields.routingKey.split('.'),
                domain = parts.slice(1,2).pop(),
                type = parts.slice(2,3).pop();

            if (!data.destination || !data.content || !data.gateway || !config[data.gateway]) {
                return;
            }

            var payload = JSON.parse(JSON.stringify(config[data.gateway]));
            payload.destination = data.destination;
            payload.content = data.content;

            soap.createClient('https://gateway.sonicmobile.com/ModicaSoap.wsdl', function(err, client) {
                client.sendMessage(payload, function (smsErr, result) {
                    r.db(domain).table(type).get(data.id).run(rconn, function (err, document) {
                        if (err) {
                            return;
                        }

                        if (smsErr) {
                            document._failed_at = new Date();
                        } else {
                            document._sent_at = new Date();
                        }

                        r.db(domain).table(type).insert(document, { conflict: 'update' }).run(rconn);
                    });
                    channel.ack(msg);
                });
            });
        });
    });
};