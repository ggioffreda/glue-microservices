const uuid = require('node-uuid');

function DataGathererController() {

    var _diff = function (a, b) {
        if (a === b) return {};
        if (!(a instanceof Object) || !(b instanceof Object)) throw new Error('Only objects can be compared');
        var aKeys = Object.keys(a);
        var bKeys = Object.keys(b);
        aKeys.concat(bKeys).reduce(function (carry, key) {
            if (carry.indexOf(key) < 0) carry.push(key);
            return carry;
        }, []).forEach(function (key) {
            if (!_areEqual(a[key], b[key])) {
                if ('object' === typeof a[key] && 'object' === typeof b[key]) {
                    changes[key] = _diff(a[key], b[key]);
                } else {
                    changes[key] = [ a[key], b[key] ];
                }
            }
        });
        return changes;
    };

    var _areEqual = function (a, b) {
        if (a === b) return true;
        if (!(a instanceof Object) || !(b instanceof Object)) return false;
        var aKeys = Object.keys(a);
        var bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        var same = true;
        aKeys.concat(bKeys).reduce(function (carry, key) {
            if (carry.indexOf(key) < 0) carry.push(key);
            return carry;
        }, []).forEach(function (key) {
            if (same && !_areEqual(a[key], b[key])) {
                same = false;
            }
        });
        return same;
    };

    var _publishMessage = function (domain, type, action, document) {
        messageBus.publish([ 'data_gatherer', domain, type, action ].join('.'), new Buffer(JSON.stringify(document)));
    };

    var _upsertObject = function (res, database, table, document, update) {
        update = update || false;

        dataLayer.insert(database, table, document, update ? { conflict: 'replace' } : {}, function (err, data) {
            if (err) return res.status(404).json({ message: err.msg });
            _publishMessage(database, table, data.inserted ? 'inserted' : 'updated', document);
            return data.inserted ? res.status(201).json({ id: document.id }) : res.status(204).end('');
        });
    };

    this.putType = function (req, res) {
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
            dataLayer.tableList(database, function (err, tableList) {
                if (tableList.indexOf(table) < 0) {
                    dataLayer.tableCreate(database, table, handleResponse);
                } else {
                    handleResponse(null, true);
                }
            });
        };

        dataLayer.dbList(function (err, dbList) {
            if (dbList.indexOf(database) < 1) {
                dataLayer.dbCreate(database, function (err, result) {
                    tableCheck();
                });
            } else {
                tableCheck();
            }
        });
    };

    this.postObject = function (req, res) {
        const domain = req.params.objectDomain,
            type = req.params.objectType,
            document = req.body;

        if (!document.id) {
            document.id = uuid.v4();
        }

        _upsertObject(res, domain, type, document);
    };

    this.putObject = function (req, res) {
        const domain = req.params.objectDomain,
            type = req.params.objectType,
            document = req.body;

        document.id = req.params.objectId;

        _upsertObject(res, domain, type, document, true);
    };

    this.getObject = function (req, res) {
        const domain = req.params.objectDomain,
            type = req.params.objectType,
            id = req.params.objectId;

        dataLayer.get(domain, type, id, function (err, data) {
            if (err) return res.status(404).json(err);
            res.json(data);
        });
    };

    this.deleteObject = function (req, res) {
        const domain = req.params.objectDomain,
            type = req.params.objectType,
            id = req.params.objectId;

        dataLayer.delete(domain, type, id, function (err, data) {
            if (err) return res.status(404).json(err);
            _publishMessage(domain, type, 'deleted', { id: id });
            res.json(data);
        });
    };
}

var messageBus = null,
    dataLayer = null;

exports.mount = function (express, mb, dl) {
    var collector = express.Router();
    var controller = new DataGathererController();
    messageBus = mb;
    dataLayer = dl;

    collector.put('/:objectDomain/:objectType', controller.putType);
    collector.post('/:objectDomain/:objectType', controller.postObject);
    collector.put('/:objectDomain/:objectType/:objectId', controller.putObject);
    collector.get('/:objectDomain/:objectType/:objectId', controller.getObject);
    collector.delete('/:objectDomain/:objectType/:objectId', controller.deleteObject);

    return collector;
};