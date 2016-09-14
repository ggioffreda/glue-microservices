exports.setUp = function (messageBusChannel, dataLayer) {
    const d = dataLayer,
        descriptorType = '__descriptor';

    function detectType(value) {
        if (value === true || value === false) return 'boolean';
        if (parseInt(value) === value) return 'integer';
        if ('number' === typeof value) return 'float';
        if (Object.prototype.toString.call(value) === '[object Array]') return 'array';
        if (Object.prototype.toString.call(value) === '[object String]') return 'string';
        return 'object';
    }

    function defaultDescriptor() {
        return { type: null, seen: 0, detected: {} };
    }

    function describeProperty(value, propertyDescriptor, action) {
        propertyDescriptor = propertyDescriptor || defaultDescriptor();

        const detected = detectType(value);
        const detectedTypes = propertyDescriptor.detected;

        if (!detectedTypes[detected]) {
            detectedTypes[detected] = { seen: 0 };
        }
        detectedTypes[detected].seen++;

        // pick the most seen
        var picked = detected;
        Object.keys(detectedTypes).forEach(function (detectedType) {
            if (detectedTypes[detectedType].seen > detectedTypes[picked].seen) {
                picked = detectedType;
            }
        });
        propertyDescriptor.type = picked;
        if (action) {
            propertyDescriptor.seen++;
        }

        // update details
        var details = propertyDescriptor.detected[detected];
        switch (detected) {
            case 'integer':
            case 'float':
                details.min = 'undefined' === typeof details.min || details.min > value ? value : details.min;
                details.max = 'undefined' === typeof details.max || details.max < value ? value : details.max;
                break;
            case 'string':
            case 'array':
                details.size = 'undefined' === typeof details.size || details.size < value.length ?
                    value.length : details.size;
                break;
            case 'object':
                details.size = 'undefined' === typeof details.size || details.size < Object.keys(value).length ?
                    Object.keys(value).length : details.size;
                break;
        }
        if ('array' === detected) {
            value.forEach(function (item) {
                details.subtype = describeProperty(item, details.subtype, action);
            });
        } else if ('object' === detected) {
            details.properties = describe(value, details.properties, action);
        }
        propertyDescriptor.detected[detected] = details;
        return propertyDescriptor;
    }

    function describe(object, descriptor, action) {
        descriptor = descriptor || {};

        Object.keys(object).forEach(function (property) {
            descriptor[property] = describeProperty(object[property], descriptor[property], action);
        });

        return descriptor;
    }

    function consumer(routingKey, content, cb) {
        const routingParts = routingKey.split('.'),
            domain = routingParts[1],
            type = routingParts[2],
            id = routingParts[3],
            action = routingParts[4];

        if (type === descriptorType) {
            cb();
            return;
        }

        d.get(domain, type, id, function (err, document) {
            const typeId = 'type.' + type;
            d.get(domain, descriptorType, typeId, function (err, descriptor) {
                descriptor = descriptor || { id: typeId, type: 'object', properties: {} };
                descriptor.properties = describe(document, descriptor.properties, action);
                d.tableCreate(domain, descriptorType, function () {
                    d.insert(domain, descriptorType, descriptor, { conflict: 'replace' }, function () {
                        cb();
                    });
                });
            });
        });
    }

    messageBusChannel.subscribe('data_gatherer.*.*.*.inserted', consumer, 'processor_descriptor');
    messageBusChannel.subscribe('data_gatherer.*.*.*.updated', consumer, 'processor_descriptor');
};