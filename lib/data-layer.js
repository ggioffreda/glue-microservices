var r = null;

var DataLayerErrors = {
    connectionError: 1
};

function DataLayer(options, r) {
    r = r || require('rethinkdb');

    this._options = options || {};

    this._connection = null;

    this.connectModule = function (module) {
        const self = this;
        if (null === this._connection) {
            r.connect(this._options, function(err, conn) {
                if (err) module(new Error('Unable to connect to the database', DataLayerErrors.connectionError), null);
                else {
                    self._connection = conn;
                    module(null, self);
                }
            });
        } else {
            module(null, this);
        }
    };

    this.query = function () {
        return r;
    };

    this.execute = function (query, callback) {
        query.run(this._connection, callback);
    };

    this.dbList = function (callback) {
        this.execute(this.query().dbList(), callback);
    };

    this.dbCreate = function (database, callback) {
        this.execute(this.query().dbCreate(database), callback);
    };

    this.tableList = function (database, callback) {
        this.execute(this.query().db(database).tableList(), callback);
    };

    this.tableCreate = function (database, table, callback) {
        this.execute(this.query().db(database).tableCreate(table), callback);
    };

    this.tableDelete = function (database, table, callback) {
        this.execute(this.query().db(database).tableDrop(table), callback);
    };

    this.get = function (database, table, id, callback) {
        this.execute(this.query().db(database).table(table).get(id), callback);
    };

    this.delete = function (database, table, id, callback) {
        this.execute(this.query().db(database).table(table).get(id).delete(), callback);
    };

    this.insert = function (database, table, document, options, callback) {
        this.execute(this.query().db(database).table(table).insert(document, options), callback);
    };
}

exports.DataLayerErrors = DataLayerErrors;
exports.DataLayer = DataLayer;