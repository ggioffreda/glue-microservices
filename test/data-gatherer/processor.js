const assert = require('assert'),
    sinon = require('sinon'),
    dl = require('../../lib/data-layer'),
    dataLayer = new dl.DataLayer(),
    m = require('../../data-gatherer/model'),
    p = require('../../data-gatherer/processor'),
    testDatabase = 'test',
    testTable = 'test_table';

var mockMBChannel = null,
    model = null,
    processor = null,
    missingDependencies = false;

describe('DataGathererProcessor', function () {

    beforeEach(function (done) {
        dataLayer.connectModule(function (err, dataLayer) {
            if (err) {
                missingDependencies = true;
                done();
                return;
            }

            mockMBChannel = sinon.stub({ publish: function () { }, subscribe: function () { } });
            model = new m.DataGathererModel(dataLayer);
            processor = new p.DataGathererProcessor(model, mockMBChannel);
            processor.subscribeHandlers();

            done();
        });
    });

    describe('#subscribeHandlers()', function () {
        var args;

        beforeEach(function () {
            args = mockMBChannel.subscribe.args.reduce(function (carry, item) {
                carry.keys.push(item[0]);
                carry.queues.push(item[2]);
                return carry;
            }, { keys: [], queues: [] });
        });

        it('should subscribe to the type creation requests topic', function () {
            assert(args.keys.indexOf('*.*.*.create.data_gatherer') > -1);
            assert(args.queues.indexOf('data_gatherer_put_type') > -1);
        });

        it('should subscribe to the object post requests topic', function () {
            assert(args.keys.indexOf('*.*.*.post.data_gatherer') > -1);
            assert(args.queues.indexOf('data_gatherer_post') > -1);
        });

        it('should subscribe to the object put requests topic', function () {
            assert(args.keys.indexOf('*.*.*.*.put.data_gatherer') > -1);
            assert(args.queues.indexOf('data_gatherer_put') > -1);
        });

        it('should subscribe to the object patch requests topic', function () {
            assert(args.keys.indexOf('*.*.*.*.patch.data_gatherer') > -1);
            assert(args.queues.indexOf('data_gatherer_patch') > -1);
        });

        it('should subscribe to the type creation requests topic', function () {
            assert(args.keys.indexOf('*.*.*.*.delete.data_gatherer') > -1);
            assert(args.queues.indexOf('data_gatherer_delete') > -1);
        });
    });

    describe('#putTypeHandler()', function () {
        var publishSpy;

        function initialiseSpy(done) {
            publishSpy = sinon.spy(function () {
                assert(publishSpy.calledOnce);
                assert(publishSpy.calledWith(
                    [ 'data_gatherer', testDatabase, testTable, 'type', 'created' ].join('.'),
                    new Buffer(JSON.stringify({ domain: testDatabase, type: testTable }))
                ));
                done();
            });
            if (missingDependencies) return this.skip();

            mockMBChannel = { publish: publishSpy };
            model = new m.DataGathererModel(dataLayer);
            processor = new p.DataGathererProcessor(model, mockMBChannel);
        }

        it('should create a new type, and send a message to the exchange', function (done) {
            if (missingDependencies) return this.skip();

            initialiseSpy(done);

            dataLayer.tableDelete(testDatabase, testTable, function () {
                processor.putTypeHandler(['test', testDatabase, testTable, 'create', 'data_gatherer'], {}, function () {
                    // do nothing
                });
            });
        });
    });

    after(function (done) {
        if (missingDependencies) {
            this.skip();
            return done();
        }

        dataLayer.tableDelete(testDatabase, testTable, function () {
            done();
        });
    });

});