function DataDiscovererController(express, dataLayer) {
    const d = dataLayer; // this is just to make it shorter

    this._router = null;

    this.listTypesAction = function (req, res) {
        const domain = req.params.objectDomain;

        d.tableList(domain, function (err, tableList) {
            if (err) return res.status(400).json({ message: err.message });

            return res.status(200).json({
                domain: domain,
                count: tableList.length,
                results: tableList.map(function (tableName) {
                    return {
                        type: tableName,
                        properties: {}
                    };
                })
            });
        });
    };

    this.findObjectsAction = function (req, res) {
        const domain = req.params.objectDomain,
            type = req.params.objectType,
            b = req.body || {},
            q = req.query,
            offset = Number(q.offset || b.offset || 0),
            limit = Number(q.limit || b.limit || 1000),
            orderBy = q.orderBy || b.orderBy || 'id',
            filter = q.filter || b.filter || null;

        function buildQuery() {
            return d.query().db(domain).table(type);
        }

        function buildFilterQuery() {
            return filter ? buildQuery().filter(filter) : buildQuery();
        }

        function buildCallback(cb) {
            return function (err, data) {
                if (err) return res.status(400).json({ message: err.message });
                cb(data);
            }
        }

        var findObjects = buildCallback(function () {
            function findResults() {
                d.execute(
                    buildFilterQuery().orderBy(orderBy).skip(offset).limit(limit),
                    buildCallback(function (results) {
                        d.execute(
                            buildFilterQuery().count(),
                            buildCallback(function (count) {
                                return res.status(200).json({
                                    domain: domain,
                                    type: type,
                                    offset: offset,
                                    limit: limit,
                                    orderBy: orderBy,
                                    filter: filter,
                                    count: count,
                                    results: results
                                });
                            })
                        );
                    })
                );
            }

            if ('id' !== orderBy) {
                d.execute(buildQuery().indexWait(orderBy), buildCallback(findResults));
            } else {
                findResults();
            }
        });

        d.execute(buildQuery().indexList(), function (err, indexList) {
            if (indexList.indexOf(orderBy) < 0 && 'id' !== orderBy) {
                d.execute(buildQuery().indexCreate(orderBy), findObjects);
            } else {
                findObjects();
            }
        });
    }.bind(this);

    this.getRouter = function () {
        if (null === this._router) {
            this._router = express.Router();
            this._router.get('/:objectDomain/:objectType', this.findObjectsAction);
            this._router.post('/:objectDomain/:objectType', this.findObjectsAction);
            this._router.get('/:objectDomain', this.listTypesAction);
        }

        return this._router;
    };
}

exports.DataDiscovererController = DataDiscovererController;