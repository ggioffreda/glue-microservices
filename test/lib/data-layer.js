const initialiser = require('./data-layer-context'),
    assert = require('assert'),
    sinon = require('sinon');

describe('DataLayerErrors', function () {
    var context = initialiser.initialiseContext();

    describe('#connectionError', function () {
        it('connection error code is 1', function () {
            assert.equal(1, context.dl.DataLayerErrors.connectionError);
        });
    });
});

describe('DataLayer', function () {
    var context = null;

    beforeEach(function () {
        context = initialiser.initialiseContext();
    });

    describe('#connectModule()', function () {
        it('should call the module callback with error if a connection cannot be established', function () {
            var callback = sinon.spy();
            context.dataLayerFailure.connectModule(callback);
            assert(callback.called);
            assert(callback.calledWith(context.defaultError, null));
        });

        it('should call the module callback passing the connection', function () {
            var callback = sinon.spy();
            context.dataLayerSuccess.connectModule(callback);
            assert(callback.called);
            assert(callback.calledWith(null, context.dataLayerSuccess));
        });
    });

    describe('#query()', function () {
        it('should return the database query builder', function () {
            assert.equal(context.rSuccess, context.dataLayerSuccess.query());
            assert.equal(context.rFailure, context.dataLayerFailure.query());
        });
    });

    beforeEach(function () {
        context = initialiser.initialiseContext();
        context.dataLayerSuccess.connectModule(sinon.spy());
    });

    describe('#execute()', function () {
        it('should run the query on the data connection with the given callback', function () {
            var query = { run: sinon.stub() },
                callback = sinon.spy();

            context.dataLayerSuccess.execute(query, callback);

            assert(query.run.called);
            assert(query.run.calledWith(context.defaultConnection, callback));
        });
    });

    describe('#dbList()', function () {
        it('should return the list of databases', function () {
            var callback = sinon.spy();

            context.dataLayerSuccess.dbList(callback);

            assert(context.rSuccess.dbList.called);
            assert(context.runMethod.calledOnce);
            assert(context.runMethod.calledWith(context.defaultConnection, callback));
        });
    });

    describe('#dbCreate()', function () {
        it('should create a databases', function () {
            var callback = sinon.spy();

            context.dataLayerSuccess.dbCreate(context.database, callback);

            assert(context.rSuccess.dbCreate.called);
            assert(context.rSuccess.dbCreate.calledWith(context.database));
            assert(context.runMethod.calledOnce);
            assert(context.runMethod.calledWith(context.defaultConnection, callback));
        });
    });

    describe('#tableList()', function () {
        it('should return the list of tables in a database', function () {
            var callback = sinon.spy();

            context.dataLayerSuccess.tableList(context.database, callback);

            assert(context.rSuccess.db.called);
            assert(context.rSuccess.db.calledWith(context.database));
            assert(context._db.tableList.calledOnce);
            assert(context.runMethod.calledOnce);
            assert(context.runMethod.calledWith(context.defaultConnection, callback));
        });
    });

    describe('#tableCreate()', function () {
        it('should create a new table in a database', function () {
            var callback = sinon.spy();

            context.dataLayerSuccess.tableCreate(context.database, context.table, callback);

            assert(context.rSuccess.db.called);
            assert(context.rSuccess.db.calledWith(context.database));
            assert(context._db.tableCreate.calledOnce);
            assert(context._db.tableCreate.calledWith(context.table));
            assert(context.runMethod.calledOnce);
            assert(context.runMethod.calledWith(context.defaultConnection, callback));
        });
    });

    describe('#get()', function () {
        it('should get an object from a table in a database', function () {
            var callback = sinon.spy();

            context.dataLayerSuccess.get(context.database, context.table, context.id, callback);

            assert(context.rSuccess.db.called);
            assert(context.rSuccess.db.calledWith(context.database));
            assert(context._db.table.calledOnce);
            assert(context._db.table.calledWith(context.table));
            assert(context._table.get.calledOnce);
            assert(context._table.get.calledWith(context.id));
            assert(context.runMethod.calledOnce);
            assert(context.runMethod.calledWith(context.defaultConnection, callback));
        });
    });

    describe('#delete()', function () {
        it('should delete an object from a table in a database', function () {
            var callback = sinon.spy();

            context.dataLayerSuccess.delete(context.database, context.table, context.id, callback);

            assert(context.rSuccess.db.called);
            assert(context.rSuccess.db.calledWith(context.database));
            assert(context._db.table.calledOnce);
            assert(context._db.table.calledWith(context.table));
            assert(context._table.get.calledOnce);
            assert(context._table.get.calledWith(context.id));
            assert(context._get.delete.calledOnce);
            assert(context.runMethod.calledOnce);
            assert(context.runMethod.calledWith(context.defaultConnection, callback));
        });
    });

    describe('#insert()', function () {
        it('should delete an object from a table in a database', function () {
            var callback = sinon.spy();

            context.dataLayerSuccess.insert(context.database, context.table, context.document, context.documentOptions, callback);

            assert(context.rSuccess.db.called);
            assert(context.rSuccess.db.calledWith(context.database));
            assert(context._db.table.calledOnce);
            assert(context._db.table.calledWith(context.table));
            assert(context._table.insert.calledOnce);
            assert(context._table.insert.calledWith(context.document, context.documentOptions));
            assert(context.runMethod.calledOnce);
            assert(context.runMethod.calledWith(context.defaultConnection, callback));
       });
    });
});
