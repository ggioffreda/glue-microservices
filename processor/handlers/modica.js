exports.setUp = function (messageBusChannel, dataLayer) {
    const d = dataLayer,
        soap = require('soap');

    messageBusChannel.subscribe('*.*._modica.*.inserted', function (routingKey, content, cb) {
        const data = JSON.parse(content),
            parts = routingKey.split('.'),
            domain = parts.slice(1,2).pop(),
            type = parts.slice(2,3).pop();

        if (!data.destination || !data.content || !data.gateway || !config[data.gateway]) {
            cb();
            return;
        }

        var payload = JSON.parse(JSON.stringify(config[data.gateway]));
        payload.destination = data.destination;
        payload.content = data.content;

        soap.createClient('https://gateway.sonicmobile.com/ModicaSoap.wsdl', function(err, client) {
            client.sendMessage(payload, function (smsErr, result) {
                d.get(domain, type, data.id, function (err, document) {
                    if (err) {
                        return;
                    }

                    if (smsErr) {
                        document._failed_at = new Date();
                    } else {
                        document._sent_at = new Date();
                    }

                    d.insert(domain, type, document, { conflict: 'update' }, function () {
                        cb();
                    });
                });
            });
        });
    }, 'processor_modica');
};