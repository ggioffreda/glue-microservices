const assert = require('assert'),
    sinon = require('sinon'),
    dl = require('../../lib/data-layer');

describe('DataLayerErrors', function () {
    describe('#connectionError', function () {
        it('connection error code is 1', function () {
            assert.equal(1, dl.DataLayerErrors.connectionError);
        });
    });
});

describe('DataLayer', function () {
    // shared configuration
    const defaultOptions = { checkIfPassed: true },
        defaultError = new Error('Fake error'),
        defaultConnection = { checkConnection: true },

        // mocking of the RethinkDB driver
        runMethod =  sinon.stub(),
        runnable = { run: runMethod },
        _get = {
            run: runMethod,
            'delete': sinon.stub().returns(runnable)
        },
        _table = {
            'get': sinon.stub().returns(_get),
            insert: sinon.stub().returns(runnable)
        },
        _db = {
            tableList: sinon.stub().returns(runnable),
            tableCreate: sinon.stub().returns(runnable),
            table: sinon.stub().returns(_table)
        },
        rSuccess = {
            _connection: defaultConnection,
            connect: function (options, callback) {
                assert.equal(options, defaultOptions);
                callback(null, this._connection);
            },
            dbList: sinon.stub().returns(runnable),
            dbCreate: sinon.stub().returns(runnable),
            db: sinon.stub().returns(_db)
        },
        rFailure = {
            _connection: null,
            connect: function (options, callback) {
                assert.equal(options, defaultOptions);
                callback(defaultError, null);
            }
        },
        dataLayerSuccess = new dl.DataLayer(defaultOptions, rSuccess),
        dataLayerFailure = new dl.DataLayer(defaultOptions, rFailure),

        // common test values
        database = 'database_name',
        table = 'table_name',
        id = 'object_id',
        document = { id: 'object_id' },
        documentOptions = { optionsCheck: true },
        callback = sinon.spy();

    var runMethodCalls = runMethod.callCount;

    describe('#connectModule()', function () {
        it('should call the module callback with error if a connection cannot be established', function () {
            var callback = sinon.spy();
            dataLayerFailure.connectModule(callback);
            assert(callback.called);
            assert(callback.calledWith(defaultError, null));
        });

        it('should call the module callback passing the connection', function () {
            var callback = sinon.spy();
            dataLayerSuccess.connectModule(callback);
            assert(callback.called);
            assert(callback.calledWith(null, dataLayerSuccess));
        });
    });

    describe('#query()', function () {
        it('should return the database query builder', function () {
            assert.equal(rSuccess, dataLayerSuccess.query());
            assert.equal(rFailure, dataLayerFailure.query());
        });
    });

    describe('#execute()', function () {
        it('should run the query on the data connection with the given callback', function () {
            var query = { run: sinon.stub() };
            var callback = sinon.spy();
            dataLayerSuccess.execute(query, callback);
            assert(query.run.called);
            assert(query.run.calledWith(defaultConnection, callback));
        });
    });

    describe('#dbList()', function () {
        it('should return the list of databases', function () {
            runMethodCalls = runMethod.callCount;
            dataLayerSuccess.dbList(callback);

            assert(rSuccess.dbList.called);
            assert(runMethod.called);
            assert(runMethod.calledWith(defaultConnection, callback));
            assert(runMethodCalls + 1, runMethod.callCount);
        });
    });

    describe('#dbCreate()', function () {
        it('should create a databases', function () {
            dataLayerSuccess.dbCreate(database, callback);

            assert(rSuccess.dbCreate.called);
            assert(rSuccess.dbCreate.calledWith(database));
            assert(runMethod.called);
            assert(runMethod.calledWith(defaultConnection, callback));
            assert(runMethodCalls + 1, runMethod.callCount);
        });
    });

    describe('#tableList()', function () {
        it('should return the list of tables in a database', function () {
            runMethodCalls = runMethod.callCount;
            dataLayerSuccess.tableList(database, callback);

            assert(rSuccess.db.called);
            assert(rSuccess.db.calledWith(database));
            assert(_db.tableList.called);
            assert(runMethod.called);
            assert(runMethod.calledWith(defaultConnection, callback));
            assert(runMethodCalls + 1, runMethod.callCount);
        });
    });

    describe('#tableCreate()', function () {
        it('should create a new table in a database', function () {
            runMethodCalls = runMethod.callCount;
            dataLayerSuccess.tableCreate(database, table, callback);

            assert(rSuccess.db.called);
            assert(rSuccess.db.calledWith(database));
            assert(_db.tableCreate.called);
            assert(_db.tableCreate.calledWith(table));
            assert(runMethod.called);
            assert(runMethod.calledWith(defaultConnection, callback));
            assert(runMethodCalls + 1, runMethod.callCount);
        });
    });

    describe('#get()', function () {
        it('should get an object from a table in a database', function () {
            runMethodCalls = runMethod.callCount;
            dataLayerSuccess.get(database, table, id, callback);

            assert(rSuccess.db.called);
            assert(rSuccess.db.calledWith(database));
            assert(_db.table.called);
            assert(_db.table.calledWith(table));
            assert(_table.get.called);
            assert(_table.get.calledWith(id));
            assert(runMethod.called);
            assert(runMethod.calledWith(defaultConnection, callback));
            assert(runMethodCalls + 1, runMethod.callCount);
        });
    });

    describe('#delete()', function () {
        it('should delete an object from a table in a database', function () {
            runMethodCalls = runMethod.callCount;
            dataLayerSuccess.delete(database, table, id, callback);

            assert(rSuccess.db.called);
            assert(rSuccess.db.calledWith(database));
            assert(_db.table.called);
            assert(_db.table.calledWith(table));
            assert(_table.get.called);
            assert(_table.get.calledWith(id));
            assert(_get.delete.called);
            assert(runMethod.called);
            assert(runMethod.calledWith(defaultConnection, callback));
            assert(runMethodCalls + 1, runMethod.callCount);
        });
    });

    describe('#insert()', function () {
        it('should delete an object from a table in a database', function () {
            runMethodCalls = runMethod.callCount;
            dataLayerSuccess.insert(database, table, document, documentOptions, callback);

            assert(rSuccess.db.called);
            assert(rSuccess.db.calledWith(database));
            assert(_db.table.called);
            assert(_db.table.calledWith(table));
            assert(_table.insert.called);
            assert(_table.insert.calledWith(document, documentOptions));
            assert(runMethod.called);
            assert(runMethod.calledWith(defaultConnection, callback));
            assert(runMethodCalls + 1, runMethod.callCount);
        });
    });
});
