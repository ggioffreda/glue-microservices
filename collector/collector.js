'use strict';

(function () {
    const http = require('http'),
        bodyParser = require('body-parser'),
        express = require('express');

    var app = express();

    app.use(bodyParser.json());
    app.use('/', require('./controller').routes(express));

    http.createServer(app).listen(process.env.GLUE_C_PORT || 9210);
})();
