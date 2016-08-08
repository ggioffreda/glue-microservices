function DataGathererController(express, model, messageBus) {
    this._model = model;
    this._router = null;

    this.putTypeAction = function (req, res) {
        const domain = req.params.objectDomain,
            type = req.params.objectType;

        this._model.createType(domain, type, function (err, data) {
            if (err) {
                return res.status(404).json({ message: err.message});
            } else {
                if ('created' === data.action) {
                    _publishMessage(domain, type, 'type.created', { domain: domain, type: type });
                    return res.status(201).end('');
                }

                return res.status(204).end('');
            }
        });
    }.bind(this);

    this.postObjectAction = function (req, res) {
        _postOrPutObject(req, res, req.body, this._model);
    }.bind(this);

    this.putObjectAction = function (req, res) {
        const document = req.body;
        document.id = req.params.objectId;
        _postOrPutObject(req, res, document, this._model);
    }.bind(this);

    this.getObjectAction = function (req, res) {
        this._model.getObject(req.params.objectDomain, req.params.objectType, req.params.objectId, function (err, document) {
            if (err) res.status(404).json({ message: err.message });
            else res.json(document);
        });
    }.bind(this);

    this.deleteObjectAction = function (req, res) {
        const domain = req.params.objectDomain,
            type = req.params.objectType,
            id = req.params.objectId;

        this._model.deleteObject(domain, type, id, function (err, data) {
            if (err) res.status(404).json({ message: err.message });
            else {
                _publishMessage(domain, type, id + '.' + data.action, { id: id });
                res.status(204).end('');
            }
        });
    }.bind(this);

    this.getRouter = function () {
        if (null === this._router) {
            this._router = express.Router();

            this._router.put('/:objectDomain/:objectType', this.putTypeAction);
            this._router.post('/:objectDomain/:objectType', this.postObjectAction);
            this._router.put('/:objectDomain/:objectType/:objectId', this.putObjectAction);
            this._router.get('/:objectDomain/:objectType/:objectId', this.getObjectAction);
            this._router.delete('/:objectDomain/:objectType/:objectId', this.deleteObjectAction);
        }

        return this._router;
    };

    var _publishMessage = function (domain, type, action, document) {
        messageBus.publish([ 'data_gatherer', domain, type, action ].join('.'), new Buffer(JSON.stringify(document)));
    };

    var _postOrPutObject = function (req, res, document, model) {
        const domain = req.params.objectDomain,
            type = req.params.objectType;

        model.storeObject(domain, type, document, function (err, data) {
            if (err) res.status(404).json({ message: err.msg });
            else {
                var id = data.id;
                if ('none' !== data.action) {
                    _publishMessage(domain, type, id + '.' + data.action, document);
                }
                if ('inserted' === data.action) {
                    res.status(201).json({ id: id });
                } else {
                    res.status(204).end('');
                }
            }
        });
    };
}

exports.DataGathererController = DataGathererController;