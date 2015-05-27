# Smileupps CouchOS: Web tools for Couchapps management

This app provides useful tools to create/edit and manage Couchapps and secure access to CouchDB administraion interfaces:

Tools:

* Couchapp editor: create / modify / upload and delete your design documents
* Bulk docs editor: create / modify and delete docs in bulk
* Secure access to Futon: default CouchDB administration interface
* Secure access to Fauxton: default CouchDB administration interface since CouchDB 2.0

* This app is a couchapp itself, must be stored inside of your CouchDB instance, preferably within a database named smileupps. If you change database name or design document name, please be sure to modify the last rewriting rule accordignly(rewrites.json file)
* CouchDB API and all tools above are restricted to administrators only. To increase security further, you may also remove root access domain completely, allowing access only through secure Couchapp-controlled domains. You can add/edit/remove all domains pointing to this instance from your Smileupps control panel.
* Source code of this app can be found on Github
* Thanks to [ermouth](https://github.com/ermouth) and [harthur](https://github.com/harthur) for contributions
