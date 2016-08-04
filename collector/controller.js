const r = require('rethinkdb'),
    amqp = require('amqplib/callback_api'),
    exchange = 'message_bus',
    uuid = require('node-uuid');

var rconn = null,
    qconn = null,
    qchannel = null;

var _sameObject = function (a, b) {
    if (a === b) return true;
    if (!(a instanceof Object) || !(b instanceof Object)) return false;
    var aKeys = Object.keys(a);
    var bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    var same = true;
    aKeys.forEach(function (key) {
        if (same && !_sameObject(a[key], b[key])) {
            same = false;
        }
    });
    return same;
};

var _publishMessage = function (domain, type, action, document) {
    qchannel.publish(
        exchange,
        [ 'collector', domain, type, action ].join('.'),
        new Buffer(JSON.stringify(document)),
        { persistent: true, content_type: 'application/json' }
    );
};

var _upsertObject = function (res, database, table, document, update) {
    update = update || false;

    r.db(database).table(table).insert(document, update ? { conflict: 'replace' } : {}).run(rconn, function (err, data) {
        if (err) return res.status(404).json({ message: err.msg });
        _publishMessage(database, table, data.inserted ? 'insert' : 'update', document);
        return data.inserted ? res.status(201).json({ id: document.id }) : res.status(204).end('');
    });
};

var putType = function (req, res) {
    const database = req.params.objectDomain,
        table = req.params.objectType;

    var handleResponse = function (err, skipMessage) {
        if (err) return res.status(404).json({ message: err.msg });
        if (!skipMessage) {
            _publishMessage(database, table, 'type', { domain: database, type: table });
        }
        return res.status(204).end('');
    };

    var tableCheck = function () {
        r.db(database).tableList().run(rconn, function (err, tableList) {
            if (tableList.indexOf(table) < 0) {
                r.db(database).tableCreate(table).run(rconn, handleResponse);
            } else {
                handleResponse(null, true);
            }
        });
    };

    r.dbList().run(rconn, function (err, dbList) {
        if (dbList.indexOf(database) < 1) {
            r.dbCreate(database).run(rconn, function (err, result) {
                tableCheck();
            });
        } else {
            tableCheck();
        }
    });
};

var postObject = function (req, res) {
    const domain = req.params.objectDomain,
        type = req.params.objectType,
        document = req.body;

    if (!document.id) {
        document.id = uuid.v4();
    }

    _upsertObject(res, domain, type, document);
};

var putObject = function (req, res) {
    const domain = req.params.objectDomain,
        type = req.params.objectType,
        document = req.body;

    document.id = req.params.objectId;

    _upsertObject(res, domain, type, document, true);
};

var getObject = function (req, res) {
    const domain = req.params.objectDomain,
        type = req.params.objectType,
        id = req.params.objectId;

    r.db(domain).table(type).get(id).run(rconn, function (err, data) {
        if (err) return res.status(404).json(err);
        res.json(data);
    });
};

var deleteObject = function (req, res) {
    const domain = req.params.objectDomain,
        type = req.params.objectType,
        id = req.params.objectId;

    r.db(domain).table(type).get(id).delete().run(rconn, function (err, data) {
        if (err) return res.status(404).json(err);
        _publishMessage(domain, type, 'delete', { id: id });
        res.json(data);
    });
};

exports.routes = function (express) {
    var collector = express.Router();

    // connect to the message queue first
    amqp.connect('amqp://localhost', function(err, conn) {
        if (err) {
            process.exit(1);
        }

        qconn = conn;

        qconn.createChannel(function(err, ch) {
            if (err) {
                process.exit(1);
            }

            qchannel = ch;

            ch.assertExchange(exchange, 'topic', { durable: true });

            // connect to the data layer and then load the routes
            r.connect({}, function(err, conn) {
                if (err) {
                    process.exit(1);
                }

                rconn = conn;

                collector.put('/:objectDomain/:objectType', putType);
                collector.post('/:objectDomain/:objectType', postObject);
                collector.put('/:objectDomain/:objectType/:objectId', putObject);
                collector.get('/:objectDomain/:objectType/:objectId', getObject);
                collector.delete('/:objectDomain/:objectType/:objectId', deleteObject);
            });
        });
    });

    return collector;
};