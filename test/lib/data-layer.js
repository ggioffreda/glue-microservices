const initialiser = require('./data-layer-context'),
    assert = require('assert'),
    sinon = require('sinon');

var connectionError = false;

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

    before(function (done) {
        context = initialiser.initialiseContext();
        context.dataLayerReal.connectModule(function (err, d) {
            if (err) {
                connectionError = true;
                done();
            } else {
                d.execute(d.query().dbDrop(context.testDatabase), function (err, o) {
                    done();
                });
            }
        });
    });

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
        
        it('should successfully open a connection', function () {
            if (connectionError) return this.skip();
        });
    });

    describe('#query()', function () {
        it('should return the database query builder', function () {
            assert.equal(context.rSuccess, context.dataLayerSuccess.query());
            assert.equal(context.rFailure, context.dataLayerFailure.query());
        });

        it('should return the database query builder (round 2)', function () {
            if (connectionError) return this.skip();
            assert.equal(context.r, context.dataLayerReal.query());
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

        it('should run the query, actual query this time', function (done) {
            if (connectionError) return this.skip();
            context.dataLayerReal.execute(context.dataLayerReal.query().expr([1, 2, 3, 4, 5]).map(function (val) {
                return val.mul(val);
            }), function (err, results) {
                assert(null === err);
                assert(results);
                assert.deepEqual([1, 4, 9, 16, 25], results);
                done();
            });
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

        it('should return the list of databases, actual query', function (done) {
            if (connectionError) return this.skip();
            context.dataLayerReal.dbList(function (err, list) {
                assert(null === err);
                assert(list);
                done();
            });
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

        it('should create a database, actual query', function (done) {
            if (connectionError) return this.skip();
            context.dataLayerReal.dbCreate(context.testDatabase, done);
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

        it('should create a new table in a database, actual query', function (done) {
            if (connectionError) return this.skip();
            this.slow(1000);
            context.dataLayerReal.tableCreate(context.testDatabase, context.testTable, done);
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

        it('should return the list of tables in a database, actual query', function (done) {
            if (connectionError) return this.skip();
            context.dataLayerReal.tableList(context.testDatabase, function (err, list) {
                assert(null === err);
                assert(list);
                assert(list.length > 0);
                assert(list.indexOf(context.testTable) > -1);
                done();
            });
        });
    });

    describe('#insert()', function () {
        it('should insert an object in a table in a database', function () {
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

        it('should insert an object in a table in a database, actual query', function (done) {
            if (connectionError) return this.skip();
            context.dataLayerReal.insert(
                context.testDatabase,
                context.testTable,
                { id: 'test123', field1: 1, field2: 'two' },
                {},
                function (err, o) {
                    assert(null === err);
                    assert(o);
                    assert(o.inserted);
                    assert.equal(1, o.inserted);
                    done();
                }
            );
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

        it('should get an object from a table in a database, actual query', function (done) {
            if (connectionError) return this.skip();
            context.dataLayerReal.get(context.testDatabase, context.testTable, 'test123', function (err, o) {
                assert(null === err);
                assert(o);
                assert.deepEqual({ id: 'test123', field1: 1, field2: 'two' }, o);
                done();
            });
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

        it('should delete an object from a table in a database, actual query', function (done) {
            if (connectionError) return this.skip();
            context.dataLayerReal.delete(context.testDatabase, context.testTable, 'test123', function (err, o) {
                assert(null === err);
                assert(o);
                assert(o.deleted);
                assert.equal(1, o.deleted);
                done();
            });
        });
    });
});
