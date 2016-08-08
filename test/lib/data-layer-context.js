function initialiseContext(runMethod) {
    const assert = require('assert'),
        sinon = require('sinon'),
        dl = require('../../lib/data-layer'),
        defaultOptions = { checkIfPassed: true },
        defaultError = new Error('Fake error'),
        defaultConnection = { checkConnection: true };

    runMethod = runMethod || sinon.stub();

    const runnable = { run: runMethod },
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
        };

    return {
        dl: dl,
        defaultOptions: defaultOptions,
        defaultError: defaultError,
        defaultConnection: defaultConnection,

        // mocking of the RethinkDB driver
        runMethod: runMethod,
        runnable: runnable,
        _get: _get,
        _table: _table,
        _db: _db,
        rSuccess: rSuccess,
        rFailure: rFailure,
        dataLayerSuccess: new dl.DataLayer(defaultOptions, rSuccess),
        dataLayerFailure: new dl.DataLayer(defaultOptions, rFailure),

        // common test values
        database: 'database_name',
        table: 'table_name',
        id: 'object_id',
        document: { id: 'object_id' },
        documentOptions: { optionsCheck: true }
    }
}

exports.initialiseContext = initialiseContext;