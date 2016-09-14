'use strict';

(function () {
    const fs = require('fs');

    fs.readdirSync('./processor/handlers').forEach(function (file) {
        const dl = require('../lib/data-layer'),
            dataLayer = new dl.DataLayer({}),
            mb = require('../lib/message-bus'),
            messageBus = new mb.MessageBus('amqp://localhost', 'message_bus');

        messageBus.connectModule(function (err, messageBusChannel) {
            if (err) throw err;

            messageBusChannel.getChannel().prefetch(1);
            dataLayer.connectModule(function (err, dataLayer) {
                if (err) throw err;
                require('./handlers/' + file).setUp(messageBusChannel, dataLayer);
            });
        });
    });
})();
