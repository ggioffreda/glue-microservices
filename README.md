Glue
====

Glue is (will be) a set of micro-services, for collecting, processing and
 delivering data. Aims to be fast and easy to scale.
 
[![Build Status](https://travis-ci.org/ggioffreda/glue-microservices.svg?branch=master)](https://travis-ci.org/ggioffreda/glue-microservices)

Data Gatherer
-------------

Only goal of the data gatherer is being able to receive and store objects 
 as fast as possible. It provides also methods for retrieving and deleting
 objects. To communicate with the data gatherer you can use either the
 REST API or the message bus (to be implemented).

When new data is collected or deleted, messages are sent through the
 message bus for other components to consume. They are tagged with a topic
 in the form of *{component}.{domain}.{type}.{id}.{description}*.

Main methods:

- `POST /:objectDomain/:objectType` stores an object and sends a
  message with topic *data_gatherer.{domain}.{type}.{id}.inserted* or 
  *data_gatherer.{domain}.{type}.{id}.updated* depending if the object is new or if
  it gets updated. The content of the message is the JSON encoded object. The 
  content of the message is the JSON encoded object. Use this when you don't 
  want to specify the ID of the object or if you want it returned in the response.

- `PUT /:objectDomain/:objectType/:objectId` stores an object and sends a
  message with topic *data_gatherer.{domain}.{type}.{id}.inserted* or 
  *data_gatherer.{domain}.{type}.{id}.updated* depending if the object is new or if
  it gets updated. No message is sent if no change is made. The content of 
  the message is the JSON encoded object. Use this if you already know the object ID.

- `PATCH /:objectDomain/:objectType/:objectId` patches an object and sends
  a message with topic *data_gatherer.{domain}.{type}.{id}.inserted* or 
  *data_gatherer.{domain}.{type}.{id}.updated*. No message is sent if no change is 
  made. This endpoint accept a list of actions to be executed on the requested
  object, for more information see *DataGathererModel.patchObject*.

Other methods:

- `GET /:objectDomain/:objectType/:objectId` returns the requested object.

- `DELETE /:objectDomain/:objectType/:objectId` deletes the specified object
  and sends a message with topic *data_gatherer.{domain}.{type}.{id}.deleted*. The 
  message contains the ID of the deleted object, JSON encoded.

- `PUT /:objectDomain/:objectType` prepare for a new domain and/or type and
  sends a message with topic *data_gatherer.{domain}.{type}.type.created*. The message
  contains a JSON encoded object with two properties, domain and type.

TODOs:

- [x] Write some test
- [x] Write documentation inline and Markdown
- [x] Add Travis CI configuration
 
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
- [ ] Drop direct access to the data layer and use the message bus instead
- [ ] Find a nice way of configuring handlers
- [ ] Write some test
- [ ] Write documentation inline and Markdown
- [ ] Add Travis CI configuration
