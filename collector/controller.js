const r = require('rethinkdb'),
    uuid = require('node-uuid');

var rconn = null;

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

var _upsertObject = function (res, database, table, document, update) {
    update = update || false;

    r.db(database).table(table).insert(document, update ? { conflicts: "replace" } : {}).run(rconn, function (err) {
        if (err) return res.status(404).json({ message: err.msg });
        return update ? res.status(204).end('') : res.status(201).json({ id: document.id });
    });
};

var putType = function (req, res) {
    const database = req.params.objectDomain,
        table = req.params.objectType;

    var handleResponse = function (err) {
        if (err) return res.status(404).json({ message: err.msg });
        return res.status(204).end('');
    };

    var tableCheck = function () {
        r.db(database).tableList().run(rconn, function (err, tableList) {
            if (tableList.indexOf(table) < 0) {
                r.db(database).tableCreate(table).run(rconn, handleResponse);
            } else {
                handleResponse(null);
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
    var document = req.body;
    if (!document.id) {
        document.id = uuid.v4();
    }

    _upsertObject(res, req.params.objectDomain, req.params.objectType, document);
};

var putObject = function (req, res) {
    var document = req.body;
    document.id = req.params.objectId;

    _upsertObject(res, req.params.objectDomain, req.params.objectType, document, { conflict: "replace" });
};

var getObject = function (req, res) {
    r.db(req.params.objectDomain).table(req.params.objectType).get(req.params.objectId).run(rconn, function (err, data) {
        if (err) return res.status(404).json(err);
        res.json(data);
    });
};

var deleteObject = function (req, res) {
    r.db(req.params.objectDomain).table(req.params.objectType).get(req.params.objectId).delete().run(rconn, function (err, data) {
        if (err) return res.status(404).json(err);
        res.json(data);
    });
};

exports.routes = function (express) {
    var collector = express.Router();

    // connect and load the routes
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

    return collector;
};