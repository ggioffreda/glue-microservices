const assert = require('assert'),
    sinon = require('sinon'),
    bodyParser = require('body-parser'),
    dl = require('../../lib/data-layer'),
    dataLayer = new dl.DataLayer(),
    m = require('../../data-gatherer/model'),
    express = require('express'),
    c = require('../../data-gatherer/controller'),
    testDatabase = 'test',
    testTable = 'test_table',
    request = require('supertest');

var expressStub = null,
    mockMBChannel = null,
    app = null,
    model = null,
    controller = null,
    missingDependencies = false;

describe('DataGathererController', function () {

    beforeEach(function (done) {
        dataLayer.connectModule(function (err, dataLayer) {
            if (err) {
                missingDependencies = true;
                done();
                return;
            }

            mockMBChannel = { publish: sinon.stub() };
            model = new m.DataGathererModel(dataLayer);
            expressStub = { Router: sinon.stub().returns(express.Router()) };
            controller = new c.DataGathererController(expressStub, model, mockMBChannel);

            app = express();
            app.use(bodyParser.json());
            app.use('/', controller.getRouter());
            done();
        });
    });

    describe('#getRouter()', function () {
        it('initialises a router', function () {
            if (missingDependencies) return this.skip();
            assert(expressStub.Router.calledOnce);
        });

        it('should cache the router for subsequents calls', function () {
            if (missingDependencies) return this.skip();
            assert(expressStub.Router.calledOnce);
        });

        it('returns a router object', function () {
            if (missingDependencies) return this.skip();
            assert.equal('function', typeof controller.getRouter());
        });
    });

    describe('#putTypeAction()', function () {
        it('should create a new type on PUT, and send a message to the exchange', function (done) {
            if (missingDependencies) return this.skip();
            this.slow(1000);
            request(app)
                .put('/' + testDatabase + '/' + testTable)
                .end(function (err, res) {
                    assert.equal(201, res.status);
                    assert.deepEqual({}, res.body);
                    assert(mockMBChannel.publish.calledOnce);
                    assert(mockMBChannel.publish.calledWith(
                        [ 'data_gatherer', testDatabase, testTable, 'type', 'created' ].join('.'),
                        new Buffer(JSON.stringify({ domain: testDatabase, type: testTable }))
                    ));
                    done(err);
                });
        });

        it('should do nothing on PUT if the type exists, and send no message to the exchange', function (done) {
            if (missingDependencies) return this.skip();
            request(app)
                .put('/' + testDatabase + '/' + testTable)
                .end(function (err, res) {
                    assert.equal(204, res.status);
                    assert.deepEqual({}, res.body);
                    assert(mockMBChannel.publish.notCalled);
                    done(err);
                });
        });
    });

    describe('#postObjectAction()', function () {
        const documents = [
            [ 'no ID', { field1: 1, field2: 'two' } ], // no ID
            [ 'numeric ID', { id: 123, field3: 'three', field4: 4.0 } ], // numeric ID
            [ 'string ID', { id: 'test-case-123', field5: 5, field6: true, field7: 'seven' } ] // string ID
        ];

        documents.forEach(function (document) {
            it('should store the object (' + document[0] + ') and send a message to the exchange', function (done) {
                if (missingDependencies) return this.skip();
                request(app)
                    .post('/' + testDatabase + '/' + testTable)
                    .send(document[1])
                    .expect('Content-type', /^application\/json/)
                    .end(function (err, res) {
                        assert.equal(201, res.status);
                        assert(res.body.id);
                        if (document[1].id) {
                            assert.deepEqual({ id: document[1].id }, res.body);
                            assert.equal(
                                [ 'data_gatherer', testDatabase, testTable, document[1].id, 'inserted' ].join('.'),
                                mockMBChannel.publish.args[0][0]
                            );
                            assert.deepEqual(document[1], JSON.parse(mockMBChannel.publish.args[0][1].toString()));
                        }
                        assert(mockMBChannel.publish.calledOnce);
                        done(err);
                    });
            });

            if (document[1].id) {
                it('should update the object if called again and send a message to the exchange', function (done) {
                    if (missingDependencies) return this.skip();
                    document[1].addedField = 'this is new';
                    request(app)
                        .post('/' + testDatabase + '/' + testTable)
                        .send(document[1])
                        .end(function (err, res) {
                            assert.equal(204, res.status);
                            assert.deepEqual({}, res.body);
                            if (document[1].id) {
                                assert.equal(
                                    [ 'data_gatherer', testDatabase, testTable, document[1].id, 'updated' ].join('.'),
                                    mockMBChannel.publish.args[0][0]
                                );
                                assert.deepEqual(document[1], JSON.parse(mockMBChannel.publish.args[0][1].toString()));
                            }
                            assert(mockMBChannel.publish.calledOnce);
                            done(err);
                        });
                });

                it('should do nothing if the object exist (' + document[0] + ') and send no message', function (done) {
                    if (missingDependencies) return this.skip();
                    request(app)
                        .post('/' + testDatabase + '/' + testTable)
                        .send(document[1])
                        .end(function (err, res) {
                            assert.equal(204, res.status);
                            assert.deepEqual({}, res.body);
                            assert(mockMBChannel.publish.notCalled);
                            done();
                        });
                });
            }
        });
    });

    describe('#putObjectAction()', function () {
        const documents = [
            [ 'numeric ID', { id: 123456, field3: 'three', field4: 4.0 } ], // numeric ID
            [ 'string ID', { id: 'test-case-123456', field5: 5, field6: true, field7: 'seven' } ] // string ID
        ];

        documents.forEach(function (document) {
            it('should store the object, with ' + document[0], function (done) {
                if (missingDependencies) return this.skip();
                request(app)
                    .put('/' + testDatabase + '/' + testTable + '/' + document[1].id)
                    .send(document[1])
                    .end(function (err, res) {
                        assert.equal(201, res.status);
                        assert(res.body.id);
                        assert.deepEqual({ id: document[1].id }, res.body);
                        assert.equal(
                            [ 'data_gatherer', testDatabase, testTable, document[1].id, 'inserted' ].join('.'),
                            mockMBChannel.publish.args[0][0]
                        );
                        assert.deepEqual(document[1], JSON.parse(mockMBChannel.publish.args[0][1].toString()));
                        assert(mockMBChannel.publish.calledOnce);
                        done(err);
                    });
            });

            it('should do nothing if the object exist, with ' + document[0], function (done) {
                if (missingDependencies) return this.skip();
                request(app)
                    .put('/' + testDatabase + '/' + testTable + '/' + document[1].id)
                    .send(document[1])
                    .end(function (err, res) {
                        assert.equal(204, res.status);
                        assert.deepEqual({}, res.body);
                        assert(mockMBChannel.publish.notCalled);
                        done(err);
                    });
            });

            it('should update the object', function (done) {
                if (missingDependencies) return this.skip();
                document[1].addedField = 'this is new';
                request(app)
                    .put('/' + testDatabase + '/' + testTable + '/' + document[1].id)
                    .send(document[1])
                    .end(function (err, res) {
                        assert.equal(204, res.status);
                        assert.deepEqual({}, res.body);
                        assert.equal(
                            [ 'data_gatherer', testDatabase, testTable, document[1].id, 'updated' ].join('.'),
                            mockMBChannel.publish.args[0][0]
                        );
                        assert.deepEqual(document[1], JSON.parse(mockMBChannel.publish.args[0][1].toString()));
                        assert(mockMBChannel.publish.calledOnce);
                        done(err);
                    });
            });
        });
    });


    describe('#patchObject()', function () {
        it('should throw an error if the patch is malformed', function (done) {
            if (missingDependencies) return this.skip();
            var id = 'test-case-123456',
                patch = { action: 'update', patch: { field5: 5, field6: true, field7: 'seven' } };
            request(app)
                .patch('/' + testDatabase + '/' + testTable + '/' + id)
                .send(patch)
                .end(function (err, res) {
                    assert.equal(400, res.status);
                    assert(res.body.message);
                    done();
                });
        });

        it('should throw an error if the patch contains no items', function (done) {
            if (missingDependencies) return this.skip();
            var id = 'test-case-123456',
                patch = { items: [] };
            request(app)
                .patch('/' + testDatabase + '/' + testTable + '/' + id)
                .send(patch)
                .end(function (err, res) {
                    assert.equal(400, res.status);
                    assert(res.body.message);
                    assert(res.body.message.match(/no items/i));
                    done();
                });
        });

        it('should do nothing if the patch does not cause any actual change', function (done) {
            if (missingDependencies) return this.skip();
            var id = 'test-case-123456',
                patch = { items: [ { action: 'update', patch: { field5: 5, field6: true, field7: 'seven' } } ] };
            request(app)
                .patch('/' + testDatabase + '/' + testTable + '/' + id)
                .send(patch)
                .end(function (err, res) {
                    assert.equal(204, res.status);
                    assert.deepEqual({}, res.body);
                    done();
                });
        });

        it('should update the object if the patch contains actual changes', function (done) {
            if (missingDependencies) return this.skip();
            var id = 'test-case-123456',
                patch = { items: [ { action: 'update', patch: { field5: { deep: 'deep', untouched: true } } } ] };
            request(app)
                .patch('/' + testDatabase + '/' + testTable + '/' + id)
                .send(patch)
                .end(function (err, res) {
                    assert.equal(204, res.status);
                    assert.deepEqual({}, res.body);
                    done();
                });
        });

        it('should be able and update nested properties of the document', function (done) {
            if (missingDependencies) return this.skip();
            var id = 'test-case-123456',
                patch = { items: [ { action: 'update', patch: { field5: { deep: 'deeper' } } } ] };
            request(app)
                .patch('/' + testDatabase + '/' + testTable + '/' + id)
                .send(patch)
                .end(function (err, res) {
                    assert.equal(204, res.status);
                    assert.deepEqual({}, res.body);
                    done();
                });
        });

        it('should be able delete properties of the document', function (done) {
            if (missingDependencies) return this.skip();
            var id = 'test-case-123456',
                patch = { items: [ { action: 'delete', patch: { field6: null } } ] };
            request(app)
                .patch('/' + testDatabase + '/' + testTable + '/' + id)
                .send(patch)
                .end(function (err, res) {
                    assert.equal(204, res.status);
                    assert.deepEqual({}, res.body);
                    done();
                });
        });

        it('should be able delete nested properties of the document', function (done) {
            if (missingDependencies) return this.skip();
            var id = 'test-case-123456',
                patch = { items: [ { action: 'delete', patch: { field5: { deep: null } } } ] };
            request(app)
                .patch('/' + testDatabase + '/' + testTable + '/' + id)
                .send(patch)
                .end(function (err, res) {
                    assert.equal(204, res.status);
                    assert.deepEqual({}, res.body);
                    done();
                });
        });

        it('should return an error if the document does not exist', function (done) {
            if (missingDependencies) return this.skip();
            var id = 'invlid-id',
                patch = { items: [ { action: 'irrelevant', patch: { field5: { deep: null } } } ] };
            request(app)
                .patch('/' + testDatabase + '/' + testTable + '/' + id)
                .send(patch)
                .end(function (err, res) {
                    assert.equal(404, res.status);
                    assert(res.body.message);
                    done();
                });
        });
    });

    // this test relies on previous tests for post, put and patch actions, if this breaks check the above as well
    describe('#getObjectAction()', function () {
        const documents = [
            // from #postObjectAction() testing
            [ 'numeric ID', { id: 123, field3: 'three', field4: 4.0, addedField: 'this is new' } ],
            [ 'string ID', { id: 'test-case-123', field5: 5, field6: true, field7: 'seven', addedField: 'this is new' } ],
            // from #putObjectAction() testing
            [ 'numeric ID', { id: 123456, field3: 'three', field4: 4.0, addedField: 'this is new' } ],
            [ 'string ID', { id: 'test-case-123456', field5: { untouched: true }, field7: 'seven', addedField: 'this is new' } ]
        ];

        documents.forEach(function (document) {
            var url = '/' + testDatabase + '/' + testTable + '/' + document[1].id;

            it('should return the object, with ' + document[0] + ': ' + url, function (done) {
                if (missingDependencies) return this.skip();
                request(app)
                    .get(url)
                    .end(function (err, res) {
                        assert.equal(200, res.status);
                        assert.deepEqual(document[1], res.body);
                        done(err);
                    });
            });
        });

        it('should return a 404 if not found', function (done) {
            if (missingDependencies) return this.skip();
            request(app)
                .get('/' + testDatabase + '/' + testTable + '/invalid-id')
                .end(function (err, res) {
                    assert.equal(404, res.status);
                    assert(null !== res.body);
                    assert(null !== res.body.message);
                    assert(null !== res.body.message.match(/not found/i));
                    done(err);
                });
        });
    });

    // this test relies on previous tests for post, put and patch actions, if this breaks check the above as well
    describe('#deleteObjectAction()', function () {
        const documents = [
            // from #postObjectAction() testing
            [ 'numeric ID', { id: 123, field3: 'three', field4: 4.0 } ],
            [ 'string ID', { id: 'test-case-123', field5: 5, field6: true, field7: 'seven' } ],
            // from #putObjectAction() testing
            [ 'numeric ID', { id: 123456, field3: 'three', field4: 4.0 } ],
            [ 'string ID', { id: 'test-case-123456', field5: 5, field6: true, field7: 'seven' } ]
        ];

        documents.forEach(function (document) {
            var url = '/' + testDatabase + '/' + testTable + '/' + document[1].id;

            it('should delete the object, with ' + document[0] + ': ' + url, function (done) {
                if (missingDependencies) return this.skip();
                request(app)
                    .delete(url)
                    .end(function (err, res) {
                        assert.equal(204, res.status);
                        assert.deepEqual({}, res.body);
                        assert.equal(
                            [ 'data_gatherer', testDatabase, testTable, document[1].id, 'deleted' ].join('.'),
                            mockMBChannel.publish.args[0][0]
                        );
                        assert.deepEqual({ id: document[1].id }, JSON.parse(mockMBChannel.publish.args[0][1].toString()));
                        assert(mockMBChannel.publish.calledOnce);
                        done(err);
                    });
            });
        });

        it('should return a 404 if not found', function (done) {
            if (missingDependencies) return this.skip();
            request(app)
                .delete('/' + testDatabase + '/' + testTable + '/invalid-id')
                .end(function (err, res) {
                    assert.equal(404, res.status);
                    assert(null !== res.body);
                    assert(null !== res.body.message);
                    assert(null !== res.body.message.match(/not found/i));
                    done(err);
                });
        });
    });

    after(function (done) {
        if (missingDependencies) return this.skip();
        dataLayer.tableDelete(testDatabase, testTable, function () {
            done();
        });
    });

});