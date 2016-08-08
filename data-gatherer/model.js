const uuid = require('node-uuid');

function DataGathererModel(dataLayer) {

    /**
     * Create a type if it doesn't already exists.
     *
     * @param domain
     * @param type
     * @param callback
     */
    this.createType = function (domain, type, callback) {
        var typeCheck = function () {
            dataLayer.tableList(domain, function (err, tableList) {
                if (err) return callback(err, null);
                if (tableList.indexOf(type) < 0) {
                    dataLayer.tableCreate(domain, type, function (err, results) {
                        callback(err, results ? { action: 'created' } : null);
                    });
                } else {
                    callback(null, { action: 'none' });
                }
            });
        };

        dataLayer.dbList(function (err, dbList) {
            if (err) return callback(err, null);
            if (dbList.indexOf(domain) < 0) {
                dataLayer.dbCreate(domain, function (err, result) {
                    if (err) return callback(err, null);
                    typeCheck();
                });
            } else {
                typeCheck();
            }
        });
    };

    /**
     * Store the object
     *
     * @param domain
     * @param type
     * @param document
     * @param callback
     */
    this.storeObject = function (domain, type, document, callback) {
        if (!document.id) {
            document.id = uuid.v4();
        } else {
            document.id = '' + document.id;
        }

        dataLayer.insert(domain, type, document, { conflict: 'replace' }, function (err, dbResponse) {
            if (err) callback(err, null);
            else callback(null, {
                id: document.id,
                action: dbResponse.inserted > 0 ? 'inserted' : (dbResponse.unchanged > 0 ? 'none' : 'updated')
            });
        });
    };

    /**
     * Get the object
     *
     * @param domain
     * @param type
     * @param id
     * @param callback
     */
    this.getObject = function (domain, type, id, callback) {
        dataLayer.get(domain, type, '' + id, function (err, document) {
            if (err) callback(err, null);
            else if (!document) callback(new Error('Not found'), null);
            else callback(null, document);
        });
    };

    /**
     * Delete the object
     *
     * @param domain
     * @param type
     * @param id
     * @param callback
     */
    this.deleteObject = function (domain, type, id, callback) {
        dataLayer.delete(domain, type, '' + id, function (err, dbResponse) {
            if (err) callback(err, null);
            else {
                if (0 === dbResponse.deleted) callback(new Error('Object not found'), null);
                else callback(null, { action: 'deleted' });
            }
        });
    };

    this.diffObjects = function (a, b) {
        if (a === b) return {};
        if (!(a instanceof Object) || !(b instanceof Object)) throw new Error('Only objects can be compared');
        var aKeys = Object.keys(a);
        var bKeys = Object.keys(b);
        var changes = [];
        aKeys.concat(bKeys).reduce(function (carry, key) {
            if (carry.indexOf(key) < 0) carry.push(key);
            return carry;
        }, []).forEach(function (key) {
            if (!this.equalObjects(a[key], b[key])) {
                if ('object' === typeof a[key] && 'object' === typeof b[key]) {
                    changes[key] = this.diffObjects(a[key], b[key]);
                } else {
                    changes[key] = [ a[key], b[key] ];
                }
            }
        }.bind(this));
        return changes;
    }.bind(this);

    this.equalObjects = function (a, b) {
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
            if (same && !this.equalObjects(a[key], b[key])) {
                same = false;
            }
        }.bind(this));
        return same;
    }.bind(this);
}

exports.DataGathererModel = DataGathererModel;