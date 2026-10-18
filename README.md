# Notable

`An offline-first note application, with automatic sync`

Yet another noteapp

POC in progress

## Stack
.Net 10
Angular 22
PouchDb/CouchDb

## Development

- Run couchdb locally with docker :
`docker run -d --name notable-couchdb -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=admin couchdb:3.3`
