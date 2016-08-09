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
        if (err) throw err;
        dataLayer.connectModule(function (err, dataLayer) {
            if (err) throw err;
            const app = express(),
                m = require('./data-gatherer/model'),
                model = new m.DataGathererModel(dataLayer),
                c = require('./data-gatherer/controller'),
                p = require('./data-gatherer/processor'),
                controller = new c.DataGathererController(express, model, messageBusChannel),
                processor = new p.DataGathererProcessor(model, messageBusChannel);

            processor.subscribeHandlers();

            app.use(bodyParser.json());
            app.use('/', controller.getRouter());

            http.createServer(app).listen(process.env.GLUE_C_PORT || 9210);
        });
    });
})();
