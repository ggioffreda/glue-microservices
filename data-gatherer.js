'use strict';

(function () {
    const http = require('http'),
        bodyParser = require('body-parser'),
        express = require('express'),
        mb = require('./lib/message-bus'),
        messageBus = new mb.MessageBus('amqp://localhost', 'message_bus'),
        dl = require('./lib/data-layer'),
        dataLayer = new dl.DataLayer({});

    messageBus.connectModule(function (err, messageBusChannel) {
        dataLayer.connectModule(function (err, dataLayer) {
            const app = express(),
                c = require('./data-gatherer/controller'),
                controller = new c.DataGathererController(express, messageBusChannel, dataLayer);

            app.use(bodyParser.json());
            app.use('/', controller.getRouter());

            http.createServer(app).listen(process.env.GLUE_C_PORT || 9210);
        });
    });
})();
