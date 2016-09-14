exports.setUp = function (messageBusChannel, dataLayer) {
    const d = dataLayer,
        fs = require('fs'),
        config = JSON.parse(fs.readFileSync('./config/processor.handlers.apn.json', 'utf8')),
        apn = require('apn'),
        connections = [],
        notifications = [];

    // TODO: the following two methods are exactly the same in fcm.js, time to share?
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
                notifications[id]();
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
                messageBusChannel.publish(
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

    messageBusChannel.subscribe('*.*._apn.*.inserted', function (routingKey, content, cb) {
        const data = JSON.parse(content),
            key = routingKey.split('.').slice(1,3).join('.'),
            payload = data.payload && 'object' === typeof data.payload ? data.payload : {};

        if (data.id) {
            payload._id = { key: key, id: data.id };
            notifications[data.id] = cb;
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
            cb();
        }
    }, 'processor_apn');
};