exports.setUp = function (messageBus, dataLayer) {
    const channel = messageBus.channel,
        exchange = messageBus.exchange,
        r = dataLayer.r,
        rconn = dataLayer.connection;

    channel.assertQueue('default_apn', { durable: true }, function (err, q) {
        const queue = q.queue,
            fs = require('fs'),
            config = JSON.parse(fs.readFileSync('./config/processor.handlers.apn.json', 'utf8')),
            apn = require('apn'),
            connections = [],
            notifications = [];

        // TODO: the following two methods are exactly the same in fcm.js, time to share?
        function updateDocumentStatus(domain, type, id, status, failures) {
            const field = '_' + status + '_at';
            r.db(domain).table(type).get(id).run(rconn, function (err, document) {
                if (err) return;
                document._status = status;
                document[field] = new Date();
                if (failures) {
                    document._failures = failures;
                }
                r.db(domain).table(type).insert(document, { conflict: 'update' }).run(rconn);
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
                var apnConnection = {
                    connection: new apn.Connection(JSON.parse(JSON.stringify(config[application]))),
                    application: application
                };

                apnConnection.connection.loadCredentials().done(function () {
                    connections[this.application] = this.connection;

                    this.connection.on("transmitted", function (notification, device) {
                        acknowledgeMessage(notification);
                    });

                    this.connection.on("transmissionError", function (errCode, notification, device) {
                        if (8 === errCode) {
                            acknowledgeMessage(notification, 'failed');
                        }
                    });
                }.bind(apnConnection), function (credentialError) {
                    // skip this connection, it won't work
                    channel.publish(
                        exchange,
                        'processor.error.critical',
                        new Buffer(JSON.stringify({
                            message: 'Skipping application "' + this.application + '": ' + credentialError.message,
                            data: {
                                application: this.application,
                                error: {
                                    name: credentialError.name,
                                    message: credentialError.message
                                }
                            }
                        })),
                        { persistent: true, content_type: 'application/json' }
                    );
                }.bind(apnConnection));
            }
        }

        channel.bindQueue(queue, exchange, '*.*._apn.*.inserted');

        channel.consume(queue, function (msg) {
            const data = JSON.parse(msg.content.toString()),
                key = msg.fields.routingKey.split('.').slice(1,3).join('.'),
                payload = data.payload && 'object' === typeof data.payload ? data.payload : {};

            if (data.id) {
                payload._id = { key: key, id: data.id };
                notifications[data.id] = msg;
            }

            if (!data.recipient || !data.content || !data.application || !connections[data.application]) {
                acknowledgeMessage({ payload: payload }, 'skipped');
                return;
            }

            var notification = new apn.Notification();
            notification.setAlertText(data.content);
            notification.payload = payload;
            connections[data.application].pushNotification(notification, data.recipient);
            if (!data.id) {
                channel.ack(msg);
            }
        });
    });
};