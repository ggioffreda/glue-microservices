const uuid = require('node-uuid');

/**
 * High level access to the underlying database, kept as simple as possible.
 *
 * @param dataLayer
 * @constructor
 */
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
     * Patch the object.
     *
     * A patch can must contain at least an item and can contain many of them. A patch item looks like so:
     *
     * {
     *      action: "update",
     *      patch: {
     *          first_field_to_update: "new value",
     *          second_field_to_update: "another new value",
     *          another_field: {
     *              third_field_to_update: "a new value again"
     *          }
     *      }
     * }
     *
     * Supported action are "update" and "delete", if the action is "delete" you just need to indicate the fields and
     * set their value to null, if you set the value to anything else than null the property will be deleted anyway and
     * the value provided will be ignored. Example:
     *
     * {
     *      action: "delete",
     *      patch: {
     *          first_field_to_delete: null,
     *          another_field: {
     *              second_field_to_delete: "this value will be ignored, is equivalent to using null"
     *          }
     *      }
     * }
     *
     * You can provide multiple items and they will be executed in order. For example if you want to replace an object
     * contained in a property at once, instead of replacing the nested properties you can delete the property first
     * and then assign the new value. Example:
     *
     * {
     *      id: "9285",
     *      name: "John",
     *      contact: {
     *          email: "john.doe@example.com",
     *          phone: "1234567890"
     *      }
     * }
     *
     * John has lost his phone and changed the email address, patching the document with:
     *
     * {
     *      items: [ {
     *          action: "update",
     *          patch: {
     *              contact: { email: "new.john.doe@example.com" }
     *          }
     *      } ]
     * }
     *
     * Will not clear his phone number, it'll just update his email address. But you can clear the property "contact"
     * first and then update it's "email" property.
     *
     * {
     *      items: [ {
     *          action: "delete",
     *          patch: {
     *              contact: null
     *          }
     *      }, {
     *          action: "update",
     *          patch: {
     *              contact: { email: "new.john.doe@example.com" }
     *          }
     *      } ]
     * }
     *
     * @param domain
     * @param type
     * @param id
     * @param patch
     * @param callback
     */
    this.patchObject = function (domain, type, id, patch, callback) {
        dataLayer.get(domain, type, '' + id, function (err, document) {
            if (err) callback(err, null);
            else if (!document) callback(new Error('Not found'), null);
            else {
                function deepUpdate(updates, original) {
                    var fields = Object.keys(updates);
                    fields.forEach(function (field) {
                        if ('object' === typeof original[field] && 'object' === typeof updates[field]) {
                            deepUpdate(updates[field], original[field]);
                        } else {
                            original[field] = updates[field];
                        }
                    });
                }

                function deepDelete(deletes, original) {
                    var fields = Object.keys(deletes);
                    fields.forEach(function (field) {
                        if ('object' === typeof original[field] && 'object' === typeof deletes[field]) {
                            deepDelete(deletes[field], original[field]);
                        } else {
                            delete original[field];
                        }
                    });
                }

                if (!patch.items || !patch.items.length) {
                    callback(new Error('Patch contains no items'), null);
                    return;
                }

                patch.items.forEach(function (item) {
                    if ('update' === item.action) {
                        deepUpdate(item.patch, document);
                    }

                    if ('delete' === item.action) {
                        deepDelete(item.patch, document);
                    }
                });

                this.storeObject(domain, type, document, callback);
            }
        }.bind(this));
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

    /**
     * Calculate the difference between two given objects
     *
     * @param a
     * @param b
     * @return Array
     */
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

    /**
     * Check if the given objects are equal, this is a deep check
     *
     * @param a
     * @param b
     * @return bool
     */
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