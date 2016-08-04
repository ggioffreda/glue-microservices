'use strict';

(function () {
    const masterCollector = require("cluster-master");

    masterCollector({
        exec: "./processor/processor.js",
        size: parseInt(process.env.GLUE_P_WORKERS || '2'),
        env: { GLUE_P_PORT: process.env.GLUE_P_PORT || 9310 },
        repl: { address: '127.0.0.1', port: 9311 }
    });
})();