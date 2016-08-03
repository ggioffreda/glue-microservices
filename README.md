Glue
====

Glue is (will be) a set of microservices, for collecting, processing and
 delivering data. Aims to be fast and easy to scale.

Collector
---------

Only goal of the collector is being able to receive and store objects 
 through an HTTP REST API as fast as possible. It provides also methods 
 for retrieving and delete objects.

Main methods:

- `POST /:objectDomain/:objectType` stores a new object
- `PUT /:objectDomain/:objectType/:objectId` stores a new object with the 
  given ID

Other methods:

- `GET /:objectDomain/:objectType/:objectId` returns the requested object
- `DELETE /:objectDomain/:objectType/:objectId` deletes the specified object
- `PUT /:objectDomain/:objectType` prepare for a new domain and/or type

TODOs:

- [ ] Write some test
- [ ] Write documentation inline and Markdown
- [ ] Add Travis CI configuration
 
Processor
---------

Manipulates objects depending on their type. More info coming soon.