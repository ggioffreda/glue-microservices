const assert = require('assert'),
    sinon = require('sinon'),
    express = require('express'),
    m = require('../../data-gatherer/model'),
    dl = require('../../lib/data-layer'),
    testDatabase = 'test',
    testTable = 'test_table';

var dataLayer = null,
    model = null,
    connectionError = null;

describe('DataGathererModel', function () {

    before(function (done) {
        dataLayer = new dl.DataLayer();
        dataLayer.connectModule(function (err, data) {
            connectionError = err;
            model = new m.DataGathererModel(data);
            if (!err) {
                dataLayer.tableDelete(testDatabase, testTable, function () {
                    done();
                });
            } else {
                done();
            }
        });
    });

    describe('#createType()', function () {
        it('should create a new table', function (done) {
            if (null !== connectionError) return this.skip();
            this.slow(1000);
            model.createType(testDatabase, testTable, function (err, result) {
                assert.equal(null, err);
                assert(result.action);
                assert.equal('created', result.action);
                done();
            });
        });

        it('should do nothing once the table is created', function (done) {
            if (null !== connectionError) return this.skip();
            model.createType(testDatabase, testTable, function (err, result) {
                assert.equal(null, err);
                assert(result.action);
                assert.equal('none', result.action);
                done();
            });
        });
    });

    describe('#storeObject()', function () {
        it('should store a new object with ID', function (done) {
            if (null !== connectionError) return this.skip();
            var object = { id: 'test-case1', field1: 1, field2: 'two' };
            model.storeObject(testDatabase, testTable, object, function (err, o) {
                assert.deepEqual({ action: 'inserted', id: 'test-case1' }, o);
                done();
            });
        });

        it('should store a new object without an ID', function (done) {
            if (null !== connectionError) return this.skip();
            var object = { field1: 1, field2: 'two' };
            model.storeObject(testDatabase, testTable, object, function (err, o) {
                assert(o.action);
                assert.equal('inserted', o.action);
                assert(o.id);
                done();
            });
        });

        it('should replace an existing object', function (done) {
            if (null !== connectionError) return this.skip();
            var object = { id: 'test-case1', field3: 3, field4: 'four' };
            model.storeObject(testDatabase, testTable, object, function (err, o) {
                assert.deepEqual({ action: 'updated', id: 'test-case1' }, o);
                done();
            });
        });

        it('should do nothing when replacing an identical object', function (done) {
            if (null !== connectionError) return this.skip();
            var object = { id: 'test-case1', field3: 3, field4: 'four' };
            model.storeObject(testDatabase, testTable, object, function (err, o) {
                assert.deepEqual({ action: 'none', id: 'test-case1' }, o);
                done();
            });
        });
    });

    describe('#getObject()', function () {
        it('should return an existing object', function (done) {
            if (null !== connectionError) return this.skip();
            var object = { id: 'test-case1', field3: 3, field4: 'four' };
            model.getObject(testDatabase, testTable, 'test-case1', function (err, o) {
                assert.deepEqual(object, o);
                done();
            });
        });

        it('should return an error if the object does not exist', function (done) {
            if (null !== connectionError) return this.skip();
            model.getObject(testDatabase, testTable, 'test-case2', function (err, o) {
                assert(null !== err);
                assert(null === o);
                done();
            });
        });
    });

    describe('#deleteObject()', function () {
        it('should do nothing if the object does not exist', function (done) {
            if (null !== connectionError) return this.skip();
            model.deleteObject(testDatabase, testTable, 'test-case2', function (err, o) {
                assert(null !== err);
                assert(null === o);
                done();
            });
        });
    });

    describe('#diffObjects()', function () {
        it('should not find any difference', function () {
            assert.equal(0, Object.keys(model.diffObjects({ a: 'b', c: 'd' }, { c: 'd', a: 'b' })).length);
        });

        it('should find the differences', function () {
            var diff = model.diffObjects({ a: 'b', c: 'd', g: 'h' }, { c: 'd', a: 'b', e: 'f' });
            assert.equal(2, Object.keys(diff).length);
            assert(diff.e);
            assert(diff.g);
        });

        it('should find the differences even for nested objects', function () {
            var diff = model.diffObjects({ a: 'b', c: { d1: 1, d2: 2 }, g: 'h' }, { c: { d2: 2, d3: 3 }, a: 'b', e: 'f' });
            assert.equal(3, Object.keys(diff).length);
            assert(diff.e);
            assert(diff.g);
            assert(diff.c.d1);
            assert(diff.c.d3);
        });
    });

    describe('#equalObjects()', function () {
        it('should match equal objects', function () {
            assert(model.equalObjects({ a: 'b', c: 'd' }, { c: 'd', a: 'b' }));
        });

        it('should deeply match equal objects', function () {
            assert(model.equalObjects({ a: 'b', c: 'd', e: [1, 2, 3], f: { f1: 1, f2: 2 } }, { f: { f2: 2, f1: 1 }, e: [1, 2, 3], c: 'd', a: 'b' }));
        });

        it('should not match different objects', function () {
            assert(!model.equalObjects({ a: 'b', c: 'd' }, { c: 'd', a: 'b', e: 'f' }));
            assert(!model.equalObjects({ a: 'b', c: 'd', e: [1, 3], f: { f1: 1, f2: 2 } }, { f: { f2: 2, f1: 1 }, e: [1, 2, 3], c: 'd', a: 'b' }));
        });
    });

    after(function (done) {
        if (null !== connectionError) return this.skip();
        dataLayer.tableDelete(testDatabase, testTable, function () {
            done();
        });
    });

});
