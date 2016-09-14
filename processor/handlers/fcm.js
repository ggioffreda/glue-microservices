exports.setUp = function (messageBus, dataLayer) {
    const channel = messageBus.getChannel(),
        exchange = messageBus.getMessageBus().getExchange(),
        d = dataLayer;

    channel.assertQueue('default_fcm', { durable: true }, function (err, q) {
        const queue = q.queue,
            fs = require('fs'),
            config = JSON.parse(fs.readFileSync('./config/processor.handlers.fcm.json', 'utf8')),
            fcm = require('node-gcm'),
            senders = [],
            notifications = [];

        // TODO: the following two methods are exactly the same in apn.js, time to share?
        function updateDocumentStatus(domain, type, id, status, failures) {
            const field = '_' + status + '_at';
            d.get(domain, type, id, function (err, document) {
                if (err) return;
                document._status = status;
                document[field] = new Date();
                if (failures) {
                    document._failures = failures;
                }
                d.insert(domain, type, document, { conflict: 'update' });
            });
        }

        function acknowledgeMessage(notification, status, failures) {
            status = status || 'sent';
            if (notification.payload && notification.payload._id && notification.payload._id.id) {
                var id = notification.payload._id.id;
                var parts = notification.payload._id.key.split('.');
                if (notifications[id]) {
                    var msg = notifications[id];
                    channel.ack(msg);
                    delete notifications[id];
                }
                updateDocumentStatus(parts[0], parts[1], id, status, failures);
            }
        }

        for (var application in config) {
            if (config.hasOwnProperty(application)) {
                const senderConfiguration = JSON.parse(JSON.stringify(config[application]));
                senders[application] = new fcm.Sender(senderConfiguration.key);
            }
        }

        channel.bindQueue(queue, exchange, '*.*._fcm.*.inserted');

        channel.consume(queue, function (msg) {
            const data = JSON.parse(msg.content.toString()),
                key = msg.fields.routingKey.split('.').slice(1,3).join('.'),
                payload = data.payload && 'object' === typeof data.payload ? data.payload : {};

            if (data.id) {
                payload._id = { key: key, id: data.id };
                notifications[data.id] = msg;
            }

            if (!data.recipient || !data.content || !data.application || !senders[data.application]) {
                acknowledgeMessage({ payload: payload }, 'skipped');
                return;
            }

            const recipients = [].concat(data.recipient);
            var notification = new fcm.Message({
                data: payload,
                notification: { title: data.title || null,  icon: data.icon || null, body: data.content }
            });

            senders[data.application].sendNoRetry(
                notification,
                { registrationTokens: recipients },
                function(err, response) {
                    var failures = [];
                    if (!err) {
                        for (var i = 0; i < response.results.length; i++) {
                            if (response.results[i].error) {
                                failures.push(recipients[i]);
                            }
                        }
                    }
                    acknowledgeMessage(
                        { payload: payload },
                        err ? 'errored' : (failures.length === recipients.length ? 'failed' : 'sent'),
                        failures.length ? failures : null
                    );
                }
            );

            if (!data.id) {
                channel.ack(msg);
            }
        });
    });
};