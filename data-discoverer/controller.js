function DataDiscovererController(express, dataLayer) {
    const async = require('async'),
        d = dataLayer; // this is just to make it shorter

    this._router = null;

    function wrapResponse(res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res;
    }

    this.listTypesAction = function (req, res) {
        const domain = req.params.objectDomain;
        res = wrapResponse(res);

        d.tableList(domain, function (err, tableList) {
            if (err) return res.status(400).json({ message: err.message });

            const descriptors = {};
            tableList.forEach(function (table) {
                // TODO: this must be changed, it's not good to match like this
                if ('__descriptor' === table) {
                    return;
                }

                descriptors[table] = function (cb) {
                    // TODO: this must be changed, it's not fetch the description directly
                    d.get(domain, '__descriptor', 'type.' + table, function (err, descriptor) {
                        descriptor = descriptor || {};
                        descriptor.type = 'object';
                        if (descriptor.id) {
                            delete descriptor.id;
                        }
                        d.execute(d.query().db(domain).table(table).count(), function (err, count) {
                            if (count) {
                                descriptor.count = count;
                            }
                            cb(null, descriptor);
                        });
                    });
                };
            });

            async.parallel(descriptors, function (err, results) {
                return res.status(200).json({
                    domain: domain,
                    count: tableList.length,
                    results: results
                });
            });
        });
    };

    this.findObjectsAction = function (req, res) {
        const domain = req.params.objectDomain,
            type = req.params.objectType,
            b = req.body || {},
            q = req.query || {},
            offset = Number(q.offset || b.offset || 0),
            limit = Number(q.limit || b.limit || 1000),
            orderBy = q.orderBy || b.orderBy || 'id',
            order = q.order || b.order || 'asc',
            filter = q.filter || b.filter || null;

        res = wrapResponse(res);

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
                const o = order === 'desc' ? d.query().desc(orderBy) : orderBy;
                d.execute(
                    buildFilterQuery().orderBy(o).skip(offset).limit(limit),
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
                                    order: order,
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