exports.setUp = function (channel, exchange) {
    channel.assertQueue('default_logger', { durable: true }, function(err, q) {
        const queue = q.queue;

        channel.bindQueue(queue, exchange, '#');

        channel.consume(queue, function (msg) {
            const data = JSON.parse(msg.content.toString());
            console.log('Logger: ' + JSON.stringify(data));
            channel.ack(msg);
        });
    });
};