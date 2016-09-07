'use strict';

(function () {
    const http = require('http'),
        bodyParser = require('body-parser'),
        express = require('express'),
        dl = require('./lib/data-layer'),
        dataLayer = new dl.DataLayer({});

    dataLayer.connectModule(function (err, dataLayer) {
        if (err) throw err;
        const app = express(),
            c = require('./data-discoverer/controller'),
            controller = new c.DataDiscovererController(express, dataLayer);

        app.use(bodyParser.json());
        app.use('/', controller.getRouter());

        http.createServer(app).listen(process.env.GLUE_D_PORT || 9410);
    });
})();
