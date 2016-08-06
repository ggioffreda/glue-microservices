const amqp = require('amqplib/');

const MessageBusErrors = {
    connectionError: 1,
    channelError: 2
};

function MessageBus(server, exchange) {

    /**
     * The URL of the messaging queue server
     *
     * @type string
     * @access private
     */
    this._server = server;

    /**
     * The name of the exchange
     *
     * @type string
     * @access private
     */
    this._exchange = exchange;

    /**
     * The connection to the messaging queue server
     *
     * @type amqplib.Connection
     * @private private
     */
    this._connection = null;

    /**
     * Connect the given module to the message bus and create a channel for it
     *
     * @param module the function to connect to
     */
    this.connectModule = function (module) {
        const self = this;
        if (null === this._connection) {
            amqp.connect(this._server).then(function (connection) {
                self._connection = connection;
                loadModule(module);
            }).catch(function () {
                throw new Error('Unable to connect to "' + self._server + '"', MessageBusErrors.connectionError);
            });
        } else {
            loadModule(module);
        }
    };

    this.getServer = function () { return this._server; };

    this.getExchange = function () { return this._exchange; };

    this.getConnection = function () { return this._connection; };

    // utility methods

    /**
     * Create a channel for the given module
     *
     * @param module the function to create the channel for
     */
    var loadModule = function (module) {
        const self = this;
        this._connection.createChannel().then(function (channel) {
            channel.assertExchange(self._exchange, 'topic', { durable: true }).then(function () {
                module(null, new MessageBusChannel(self, channel), amqp);
            });
        }).catch(function () {
            throw new Error('Unable to open channel on "' + self._server + '"', MessageBusErrors.channelError);
        });
    }.bind(this);
}

function MessageBusChannel(messageBus, channel) {

    /**
     * The message bus
     *
     * @type MessageBus
     * @access private
     */
    this._messageBus = messageBus;

    /**
     * The channel
     *
     * @type amqplib.Channel
     * @access private
     */
    this._channel = channel;

    /**
     * Publish a message on the message bus
     *
     * @param key
     * @param message
     */
    this.publish = function (key, message) {
        this._channel.publish(
            this._messageBus.getExchange(),
            key,
            message,
            { persistent: true, content_type: 'application/json' }
        );
    };
}

exports.MessageBusErrors = MessageBusErrors;
exports.MessageBus = MessageBus;
