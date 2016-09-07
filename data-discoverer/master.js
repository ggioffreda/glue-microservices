'use strict';

(function () {
    const masterDiscoverer = require("cluster-master");

    masterDiscoverer({
        exec: "./data-discoverer.js",
        size: parseInt(process.env.GLUE_D_WORKERS || '2'),
        env: { GLUE_D_PORT: process.env.GLUE_D_PORT || 9410 },
        repl: { address: '127.0.0.1', port: 9411 }
    });
})();