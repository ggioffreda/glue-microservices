function initialiseContext(failedConnection, failedChannel, failedChannelMethod) {
    const sinon = require('sinon'),
        mb = require('../../lib/message-bus'),
        server = 'amqp://localhost',
        exchange = 'test_bus',
        defaultError = new Error('Fake error'),
        amqpChannel = {
            assertExchange: sinon.stub().returns(new Promise(function (resolve, reject) {
                if (failedChannelMethod) reject(defaultError);
                else resolve({});
            })),
            publish: sinon.stub()
        },
        amqpConnection = {
            createChannel: sinon.stub().returns(new Promise(function (resolve, reject) {
                if (failedChannel) reject(defaultError);
                else resolve(amqpChannel);
            }))
        },
        amqp = {
            connect: sinon.stub().returns(new Promise(function (resolve, reject) {
                if (failedConnection) reject(defaultError);
                else resolve(amqpConnection);
            }))
        };

    return {
        mb: mb,
        server: server,
        exchange: exchange,
        defaultError: defaultError,
        amqpChannel: amqpChannel,
        amqpConnection: amqpConnection,
        amqp: amqp,
        messageBus: new mb.MessageBus(server, exchange, amqp)
    };
}

exports.initialiseContext = initialiseContext;

