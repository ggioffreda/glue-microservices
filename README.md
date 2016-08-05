Glue
====

Glue is (will be) a set of micro-services, for collecting, processing and
 delivering data. Aims to be fast and easy to scale.

Collector
---------

Only goal of the collector is being able to receive and store objects 
 through an HTTP REST API as fast as possible. It provides also methods 
 for retrieving and delete objects.

When new data is collected or deleted, messages are sent through the
 message bus for other components to consume. They are tagged with a topic
 in the form of *{component}.{domain}.{type}.{description}*.

Main methods:

- `POST /:objectDomain/:objectType` stores an object and sends a
  message with topic *collector.{domain}.{type}.insert* or 
  *collector.{domain}.{type}.update* depending if the object is new or if
  it gets replaced. The content of the message is the JSON encoded object.
  Use this when you don't want to specify the ID of the object or if you
  want it returned in the response.

- `PUT /:objectDomain/:objectType/:objectId` stores an object and sends a
  message with topic *collector.{domain}.{type}.insert* or 
  *collector.{domain}.{type}.update* depending if the object is new or if
  it gets replaced. The content of the message is the JSON encoded object.
  Use this if you already know the object ID.

Other methods:

- `GET /:objectDomain/:objectType/:objectId` returns the requested object.

- `DELETE /:objectDomain/:objectType/:objectId` deletes the specified object
  and sends a message with topic *collector.{domain}.{type}.delete*. The 
  message contains the ID of the deleted object, JSON encoded.

- `PUT /:objectDomain/:objectType` prepare for a new domain and/or type and
  sends a message with topic *collector.{domain}.{type}.type*. The message
  contains a JSON encoded object with two properties, domain and type.

TODOs:

- [ ] Write some test
- [ ] Write documentation inline and Markdown
- [ ] Add Travis CI configuration
 
Processor
---------

The processor initialise all the handlers. Each handler can subscribe to
 one or multiple topics through the message bus and take any action
 required.
 
Shipped handlers:

- **logger** logs the messages sent through the exchange

- **modica** sends SMS text through [Modica](http://www.modicagroup.com/)
  (supports only the SOAP API for now)

- **apn** sends notifications to Apple devices through 
  [Apple Push Notification Service](https://developer.apple.com/notifications/)

- **fcm** sends notifications using the 
  [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging/),
  new branding of the well known 
  [Google Cloud Messaging service](https://firebase.google.com/support/faq/#gcm-fcm)

TODOs:

- [ ] Improve naming convention, it's not clear
- [ ] Allow specifying what handlers to load through environment or 
  configuration
- [ ] Try and isolate the processes of the handler to lower the impact
  of just one of them failing
- [ ] Find a nice way of configuring handlers
- [ ] Write some test
- [ ] Write documentation inline and Markdown
- [ ] Add Travis CI configuration
