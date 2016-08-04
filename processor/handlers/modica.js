exports.setUp = function (channel, exchange) {
    channel.assertQueue('default_modica', { durable: true }, function(err, q) {
        const queue = q.queue,
            https = require('https'),
            soap = require('soap'), fs = require('fs'),
            config = JSON.parse(fs.readFileSync('./config/processor.handlers.modica.json', 'utf8'));

        channel.bindQueue(queue, exchange, 'collector.*._modica_sms.insert');

        channel.consume(queue, function (msg) {
            const data = JSON.parse(msg.content.toString());

            if (!data.destination || !data.content || !data.gateway || !config[data.gateway]) {
                return;
            }

            var payload = JSON.parse(JSON.stringify(config[data.gateway]));
            payload.destination = data.destination;
            payload.content = data.content;

            soap.createClient('https://gateway.sonicmobile.com/ModicaSoap.wsdl', function(err, client) {
                client.sendMessage(payload, function(err, result) {
                    channel.publish(exchange, [ 'processor', 'modica-gateway', 'sms', 'send' ].join('.'),
                        new Buffer(JSON.stringify(result)),
                        { persistent: true, content_type: 'application/json' }
                    );
                    channel.ack(msg);
                });
            });
        });
    });
};