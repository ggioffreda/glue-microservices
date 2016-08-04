'use strict';

(function () {
    const nodejs = process.env.NODEJS_BIN || 'nodejs';
    const spawner = require('child_process').spawn;

    var logLine = function (caller, channel, line) {
        if ('stderr' === channel) {
            console.error('[' + caller + '][' + channel + ']' + line);
        } else {
            console.log('[' + caller + '][' + channel + ']' + line);
        }
    };

    var logData = function (caller, channel, data) {
        var lines = data.split("\n");
        lines.forEach(function (line) {
            if (line.length) {
                logLine(caller, channel, ' ' + line);
            }
        });
    };
    
    var trackProcess = function (childProcess, childLabel) {
        childProcess.stdout.on('data', function (data) {
            logData(childLabel, 'stdout', data.toString());
        });
        childProcess.stderr.on('data', function (data) {
            logData(childLabel, 'stderr', data.toString());
        });
        childProcess.on('close', function (code) {
            logLine(childLabel, 'stderr', '[exited:' + code + ']');
        });
    };

    const collector = spawner(nodejs, ['./collector/master.js']);
    const processor = spawner(nodejs, ['./processor/master.js']);

    trackProcess(collector, 'collector');
    trackProcess(processor, 'processor');

    try {
        process.on('SIGHUP', function () {});
        process.on('SIGINT', function () {});
    } catch (e) {
        // can't do much about this
    }
})();