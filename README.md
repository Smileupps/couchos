# Smileupps CouchOS
https://github.com/Smileupps/couchos

## Purpose 

Smileupps CouchOS provides useful tools for in-browser Couchapp editing and easy CouchDB documents management.

## Web Tools included:

* Couchapp editor: create / modify / upload and delete your design documents
* Bulk docs editor: create / modify and delete docs in bulk
* Secure access to Futon: default CouchDB administration interface
* Secure access to Fauxton: default CouchDB administration interface since CouchDB 2.0

## Features:

* This app is a couchapp itself, must be stored inside of your CouchDB instance, preferably within a database named smileupps. If you change database name or design document name, please be sure to modify the last rewriting rule accordignly(rewrites.json file)
* CouchDB API and all tools above are restricted to administrators only. To increase security further, you may also remove root access domain completely, allowing access only through secure Couchapp-controlled domains. You can add/edit/remove all domains pointing to this instance from your Smileupps control panel.
* Source code of this app can be found on Github
* Thanks to [ermouth](https://github.com/ermouth) and [harthur](https://github.com/harthur) for contributions

## Install / Run:

This app is delivered as part of the [Smileupps CouchDB Hosting application](https://www.smileupps.com/store/apps/couchdb). After installation, you should receive an activation e-mail with URLs and credentials to run it.

You can otherwise also download this repository to your local disk, and upload it back to your own CouchDB instance, using a [CouchDB deployment tool](https://www.smileupps.com/wiki). Please note that this app requires [couchapp-forward](https://github.com/Smileupps/couchapp-forward) to be pushed to your instance  *_users* database.
