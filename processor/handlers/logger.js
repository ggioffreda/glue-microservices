exports.setUp = function (messageBusChannel, dataLayer) {
    messageBusChannel.subscribe('#', function (routingKey, content, cb) {
        const data = JSON.parse(content);
        console.log('Logger: ' + routingKey + '; ' + JSON.stringify(data));
        cb();
    }, 'processor_logger');
};