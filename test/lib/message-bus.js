const assert = require('assert'),
    sinon = require('sinon'),
    initialiser = require('./message-bus-context');

describe('MessageBusErrors', function () {
    var context = initialiser.initialiseContext();

    describe('#connectionError', function () {
        it('connection error code is 1', function () {
            assert.equal(1, context.mb.MessageBusErrors.connectionError);
        });
    });

    describe('#channelError', function () {
        it('channel error code is 2', function () {
            assert.equal(2, context.mb.MessageBusErrors.channelError);
        });
    });
});

describe('MessageBus', function () {
    var context = null;

    before(function () {
        context = initialiser.initialiseContext();
    });

    describe('#getServer(), #getExchange(), #getConnection()', function () {
        it('should return the server URL', function () {
            assert.equal(context.server, context.messageBus.getServer());
        });

        it('should return the exchange', function () {
            assert.equal(context.exchange, context.messageBus.getExchange());
        });

        it('should be null until a connection is established', function () {
            assert.equal(null, context.messageBus.getConnection());
        });
    });

    describe('#connectModule()', function () {
        var channel = null;

        before(function (done) {
            context = initialiser.initialiseContext();
            context.messageBus.connectModule(function (err, result) {
                channel = result;
                done();
            })
        });

        describe('when successful', function () {
            it('should open a connection for the module', function () {
                assert(context.amqp.connect.called);
                assert.equal(context.amqpConnection, context.messageBus.getConnection());
            });

            it('should open a channel for the module', function () {
                assert(context.amqpConnection.createChannel.calledOnce);
                assert.equal(context.amqpChannel, channel.getChannel());
            });

            it('should initialise a durable exchange as "topic"', function () {
                assert(context.amqpChannel.assertExchange.calledOnce);
                assert.equal('topic', context.amqpChannel.assertExchange.args[0][1]);
                assert(context.amqpChannel.assertExchange.args[0][2].durable);
            });
        });

        describe('when failing because the setup of the exchange fails', function () {
            var error = null,
                channel = null;

            before(function (done) {
                context = initialiser.initialiseContext(false, false, true);
                context.messageBus.connectModule(function (err, result) {
                    error = err;
                    channel = result;
                    done();
                })
            });

            it('should open a connection for the module', function () {
                assert(context.amqp.connect.calledOnce);
                assert.equal(context.amqpConnection, context.messageBus.getConnection());
            });

            it('should try and open a channel for the module', function () {
                assert(context.amqpConnection.createChannel.calledOnce);
            });

            it('should not be able to initialise a durable exchange as "topic"', function () {
                assert(context.amqpChannel.assertExchange.calledOnce);
                assert.equal('topic', context.amqpChannel.assertExchange.args[0][1]);
                assert(context.amqpChannel.assertExchange.args[0][2].durable);
                assert(null === channel);
                assert(null !== error);
            });
        });

        describe('when failing because the setup of the channel fails', function () {
            var error = null,
                channel = null;

            before(function (done) {
                context = initialiser.initialiseContext(false, true);
                context.messageBus.connectModule(function (err, result) {
                    error = err;
                    channel = result;
                    done();
                })
            });

            it('should open a connection for the module', function () {
                assert(context.amqp.connect.calledOnce);
                assert.equal(context.amqpConnection, context.messageBus.getConnection());
            });

            it('should unsuccessfully try and open a channel for the module', function () {
                assert(context.amqpConnection.createChannel.calledOnce);
                assert.equal(null, channel);
                assert.notEqual(null, error);
                assert(error.message.match(/Fake error$/));
            });

            it('should not try and initialise a durable exchange', function () {
                assert(context.amqpChannel.assertExchange.notCalled);
            });
        });


        describe('when failing because the connection fails', function () {
            var error = null,
                channel = null;

            before(function (done) {
                context = initialiser.initialiseContext(true);
                context.messageBus.connectModule(function (err, result) {
                    error = err;
                    channel = result;
                    done();
                })
            });

            it('should open a connection for the module', function () {
                assert(context.amqp.connect.calledOnce);
                assert.equal(null, context.messageBus.getConnection());
                assert(null === channel);
                assert(null !== error);
            });

            it('should not try and open a channel for the module', function () {
                assert(context.amqpConnection.createChannel.notCalled);
            });

            it('should not try and initialise a durable exchange', function () {
                assert(context.amqpChannel.assertExchange.notCalled);
            });
        });
    });
});

describe('MessageBusChannel', function () {
    var context = null,
        channel = null;

    before(function (done) {
        context = initialiser.initialiseContext();
        context.messageBus.connectModule(function (err, ch) {
            channel = ch;
            done();
        });
    });

    describe('#getMessageBus(), #getChannel()', function () {
        it('should return the message bus', function () {
            assert.equal(context.messageBus, channel.getMessageBus());
        });

        it('should return the channel', function () {
            assert.equal(context.amqpChannel, channel.getChannel());
        });
    });

    describe('#publish()', function () {
        const key = 'test.key',
            message = 'test message';

        before(function () {
            channel.publish(key, message);
        });

        it('should publish the message on the channel', function () {
            assert(context.amqpChannel.publish.calledOnce);
            assert.equal(4, context.amqpChannel.publish.args[0].length);
        });

        it('should publish to the correct exchange', function () {
            assert.equal(context.exchange, context.amqpChannel.publish.args[0][0]);
        });

        it('should publish with the given key', function () {
            assert.equal(key, context.amqpChannel.publish.args[0][1]);
        });

        it('should publish the given message', function () {
            assert.equal(message, context.amqpChannel.publish.args[0][2]);
        });

        it('should publish persistent messages', function () {
            assert(context.amqpChannel.publish.args[0][3].persistent);
        });

        it('should publish as JSON', function () {
            assert.equal('application/json', context.amqpChannel.publish.args[0][3].content_type);
        });
    });
});