'use strict';

(function () {
    const masterCollector = require("cluster-master");

    masterCollector({
        exec: "./collector/collector.js",
        size: process.env.GLUE_C_WORKERS || 2,
        env: { GLUE_C_PORT: process.env.GLUE_C_PORT || 9210 },
        repl: { address: '127.0.0.1', port: 9211 }
    });
})();