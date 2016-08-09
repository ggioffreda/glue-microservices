function DataGathererProcessor(model, messageBus) {
    this._model = model;
    this._channel = messageBus;

    this.putTypeHandler = function (topicKeys, message) {
        const domain = topicKeys[1],
            type = topicKeys[2];

        this._model.createType(domain, type, function (err, data) {
            if (err) {
                // send error to the message bus
            } else {
                if ('created' === data.action) {
                    _publishMessage(domain, type, 'type.created', { domain: domain, type: type });
                }
            }
        });
    }.bind(this);

    this.postObjectHandler = function (topicKeys, message) {
        const domain = topicKeys[1],
            type = topicKeys[2];

        _storeObject(domain, type, message, model);
    }.bind(this);

    this.putObjectHandler = function (topicKeys, message) {
        const domain = topicKeys[1],
            type = topicKeys[2];

        message.id = topicKeys[3];

        _storeObject(domain, type, message, model);
    }.bind(this);

    this.patchObjectHandler = function (topicKeys, message) {
        const domain = topicKeys[1],
            type = topicKeys[2],
            id = topicKeys[3],
            patch = message;

        if (!patch.items || !patch.items.length) {
            // send error to message bus
            return;
        }

        this._model.patchObject(domain, type, id, patch, function (err, data) {
            if (err) {
                // send error to message bus
            } else {
                _buildResponse(domain, type, patch, data);
            }
        });
    }.bind(this);

    this.deleteObjectHandler = function (topicKeys, message) {
        const domain = topicKeys[1],
            type = topicKeys[2],
            id = topicKeys[3];

        this._model.deleteObject(domain, type, id, function (err, data) {
            if (err) {
                // send error to the message bus
            } else {
                _buildResponse(domain, type, { id: id }, data);
            }
        });
    }.bind(this);

    this.subscribeHandlers = function () {
        this._channel.subscribe('*.*.*.create.data_gatherer', _filterKeyAndMessage(this.putTypeHandler), 'data_gatherer_put_type');
        this._channel.subscribe('*.*.*.post.data_gatherer', _filterKeyAndMessage(this.postObjectHandler), 'data_gatherer_post');
        this._channel.subscribe('*.*.*.*.put.data_gatherer', _filterKeyAndMessage(this.putObjectHandler), 'data_gatherer_put');
        this._channel.subscribe('*.*.*.*.patch.data_gatherer', _filterKeyAndMessage(this.patchObjectHandler), 'data_gatherer_patch');
        this._channel.subscribe('*.*.*.*.delete.data_gatherer', _filterKeyAndMessage(this.deleteObjectHandler), 'data_gatherer_delete');
    };

    var _filterKeyAndMessage = function (consumer) {
        return function (key, rawMessage) {
            return consumer(key.split('.'), JSON.parse(rawMessage.toString()));
        };
    };

    var _publishMessage = function (domain, type, action, document) {
        this._channel.publish([ 'data_gatherer', domain, type, action ].join('.'), new Buffer(JSON.stringify(document)));
    }.bind(this);

    var _storeObject = function (domain, type, document, model) {
        model.storeObject(domain, type, document, function (err, data) {
            if (err) {
                // send error to message bus
            } else {
                _buildResponse(domain, type, document, data);
            }
        });
    };

    var _buildResponse = function (domain, type, document, data) {
        var id = data.id;
        if ('none' !== data.action) {
            _publishMessage(domain, type, id + '.' + data.action, document);
        }
    }
}

exports.DataGathererProcessor = DataGathererProcessor;