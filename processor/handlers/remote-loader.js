exports.setUp = function (messageBus) {
    const channel = messageBus.channel,
        exchange = messageBus.exchange,
        fs = require('fs'),
        http = require('http'),
        https = require('https'),
        uri = require('uri-js'),
        tmp = require('tmp'),
        async = require('async'),
        loaders = {
            scp: scpLoader,
            http: httpLoader,
            https: httpsLoader,
            file: fileLoader
        };

    // TODO: need a way of handling private key authentication
    function scpLoader(uriParts, args, cb) {
        const scpClient = require('scp2'),
            options = args.options || {};

        if (uriParts.userinfo && uriParts.userinfo.length) {
            var userInfo = uriParts.split(':');
            if (userInfo[0]) {
                options.username = userInfo[0];
            }
            if (userInfo[1]) {
                options.password = userInfo[1];
            }
        }

        if (!options.port) {
            options.port = 22;
        }

        if (!options.host) {
            options.host = uriParts.host;
        }

        scpClient.defaults(options);
        tmp.tmpName({ mode: 0600, prefix: 'glue-remote-loader-' }, function (err, fileName) {
            scpClient.get(uriParts.path, fileName, function (err) {
                if (err) {
                    cb(err);
                    return;
                }

                fs.readFile(fileName, function (err, data) {
                    const loaded = JSON.parse(data);
                    execute(loaded, cb);
                });
            });
        });
    }

    function _httpLoader(transport, uriParts, args, cb) {
        var loaded = '';

        const options = {
                hostname: uriParts.host,
                port: uriParts.port || 80,
                path: uriParts.path + (uriParts.query ? '?' + uriParts.query : ''),
                auth: uriParts.userinfo,
                method: args.method || 'GET',
                headers: args.headers || []
            },
            req = transport.request(options, function (res) {
                res.on('data', function (d) {
                    loaded += d;
                });

                res.on('end', function () {
                    execute(loaded, cb);
                });

                res.on('close', function () {
                    cb(new Error('Server response terminated unexpectedly'));
                });
            });

        req.on('error', function (e) {
            cb(e);
        });

        req.end();
    }

    function httpLoader(uriParts, args, cb) {
        _httpLoader(http, uriParts, args, cb);
    }

    function httpsLoader(uriParts, args, cb) {
        _httpLoader(https, uriParts, args, cb);
    }

    function fileLoader(uriParts, args, cb) {
        fs.readFile(uriParts.path, 'utf8', function (err, data) {
            if (err) {
                cb(err);
                return;
            }

            const loaded = JSON.parse(data);
            execute(loaded, cb);
        })
    }

    function executeAction(action, data, cb) {
        switch (action) {
            case 'load':
                if (!data.args || !data.args.uri) {
                    cb(new Error('URI is not defined: ' + JSON.stringify(data)));
                    return;
                }

                const uriParts = uri.parse(data.args.uri);

                if (!uriParts.scheme || !loaders[uriParts.scheme]) {
                    cb(new Error('Scheme is unknown: ' + JSON.stringify(data)));
                    return;
                }

                loaders[uriParts.scheme](uriParts, data.args, cb);
                break;
            case 'message':
                channel.publish(
                    exchange,
                    data.args.topic,
                    new Buffer(JSON.stringify(data.args.payload)),
                    { persistent: true, content_type: 'application/json' }
                );
                cb(null);
                break;
            default:
                cb(new Error('Unknown action: ' + action));
        }
    }

    function execute(data, cb) {
        if (data.action) {
            executeAction(data.action, data, cb);
        } else if (data.actions && data.actions instanceof Array) {
            const tasks = [];
            data.actions.forEach(function (d) {
                tasks.push(function (acb) {
                    execute(d, acb);
                });
            });
            async.parallel(tasks, cb);
        } else {
            cb(new Error('Malformed loader: ' + JSON.stringify(data)));
        }
    }

    channel.assertQueue('default_remote_loader', { durable: true }, function(err, q) {
        const queue = q.queue;

        channel.bindQueue(queue, exchange, '*.*._remote_loader.*.inserted');

        channel.consume(queue, function (msg) {
            const data = JSON.parse(msg.content.toString());
            execute(data, function (err) {
                if (err) {
                    channel.publish(
                        exchange,
                        'processor.error.notice',
                        new Buffer(JSON.stringify({ message: err.message })),
                        { persistent: true, content_type: 'application/json' }
                    );
                }
                channel.ack(msg);
            });
        });
    });
};